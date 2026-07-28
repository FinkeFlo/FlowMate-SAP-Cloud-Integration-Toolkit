import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { mkdirSync, appendFileSync, writeFileSync, readdirSync, statSync, unlinkSync, writeFile } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

const DEV_LOG_PORT = 3001;
const LOG_DIR = '.dev-logs';
const RESPONSES_DIR = join(LOG_DIR, 'responses');
const MAX_LOG_AGE_DAYS = 3;
const MAX_LOG_FILE_MB = 5;

function cleanupDevLogs(): void {
  const cutoff = Date.now() - MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;

  try {
    for (const file of readdirSync(RESPONSES_DIR)) {
      const filePath = join(RESPONSES_DIR, file);
      try {
        if (statSync(filePath).mtimeMs < cutoff) {
          unlinkSync(filePath);
          removed++;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  const logFile = join(LOG_DIR, 'debug.log');
  try {
    const stats = statSync(logFile);
    if (stats.size > MAX_LOG_FILE_MB * 1024 * 1024) {
      writeFileSync(logFile, `[Log truncated at ${new Date().toISOString()} — was ${(stats.size / 1024 / 1024).toFixed(1)} MB]\n`);
      removed++;
    }
  } catch { /* skip */ }

  if (removed > 0) {
    console.log(`[dev-logger] Cleanup: removed ${removed} old file(s) / truncated log`);
  }
}

function asciiContentScriptPlugin(): Plugin {
  return {
    name: 'ascii-content-script',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && fileName.includes('content-scripts/')) {
          chunk.code = chunk.code.replace(/[^\x00-\x7F]/g, (ch) => {
            const code = ch.codePointAt(0)!;
            if (code <= 0xFFFF) {
              return `\\u${code.toString(16).padStart(4, '0')}`;
            }
            return `\\u{${code.toString(16)}}`;
          });
        }
      }
    },
  };
}

function devLoggerPlugin(): Plugin {
  return {
    name: 'dev-logger',
    config() {
      return {
        define: {
          __DEV_LOG_PORT__: JSON.stringify(DEV_LOG_PORT),
        },
      };
    },
    configureServer(server) {
      mkdirSync(RESPONSES_DIR, { recursive: true });
      cleanupDevLogs();

      const logFile = join(LOG_DIR, 'debug.log');
      const separator = `\n${'─'.repeat(60)}\n  Session started ${new Date().toISOString()}\n${'─'.repeat(60)}\n`;
      appendFileSync(logFile, separator);

      server.ws.on('debug-log', (data: { level: string; source: string; message: string; data?: unknown }) => {
        const ts = new Date().toISOString();
        const lvl = data.level.padEnd(5);
        const payload = data.data !== undefined ? ` | ${JSON.stringify(data.data)}` : '';
        const line = `[${ts}] [${lvl}] [${data.source}] ${data.message}${payload}\n`;
        appendFileSync(logFile, line);
      });

      server.ws.on('debug-response', (data: { name: string; content: string; ext?: string }) => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = data.ext || 'txt';
        const fileName = `${data.name}_${ts}.${ext}`;
        writeFileSync(join(RESPONSES_DIR, fileName), data.content);
        appendFileSync(logFile, `[${new Date().toISOString()}] [INFO ] [devLog.response] Saved ${fileName}\n`);
      });
    },
  };
}

export default defineConfig({
  dev: {
    server: {
      port: DEV_LOG_PORT,
    },
  },
  webExt: {
    disabled: true,
  },
  vite: () => ({
    plugins: [tailwindcss(), preact(), devLoggerPlugin(), asciiContentScriptPlugin()],
    esbuild: {
      charset: 'ascii',
    },
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'tabs'],
    host_permissions: [
      '*://*.hana.ondemand.com/*'
    ],
    browser_specific_settings: {
      gecko: {
        id: 'flowmate@fkube.local',
        strict_min_version: '57.0'
      }
    }
  },
});
