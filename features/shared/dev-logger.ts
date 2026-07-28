/**
 * Dev Logger — writes structured logs to .dev-logs/ via Vite dev server WebSocket.
 *
 * Usage:
 *   devLog.info('TraceToggle', 'Button added', { id: 'flow1' });
 *   devLog.response('trace-api', xmlString, 'xml');
 *
 * In production builds the WebSocket code is tree-shaken away;
 * only plain console.* calls remain.
 */

declare const __DEV_LOG_PORT__: string;

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// ---------------------------------------------------------------------------
// WebSocket (dev-only, lazy singleton with reconnect)
// ---------------------------------------------------------------------------

let ws: WebSocket | null = null;
let wsConnecting = false;
const pendingMessages: string[] = [];

function getWs(): WebSocket | null {
  if (!import.meta.env.DEV) return null;

  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  if (!wsConnecting) {
    wsConnecting = true;
    try {
      const socket = new WebSocket(
        `ws://localhost:${__DEV_LOG_PORT__}`,
        'vite-hmr',
      );

      socket.addEventListener('open', () => {
        ws = socket;
        wsConnecting = false;
        // flush pending
        for (const msg of pendingMessages) {
          socket.send(msg);
        }
        pendingMessages.length = 0;
      });

      socket.addEventListener('close', () => {
        ws = null;
        wsConnecting = false;
        // simple reconnect after 2 s
        setTimeout(() => getWs(), 2000);
      });

      socket.addEventListener('error', () => {
        ws = null;
        wsConnecting = false;
      });
    } catch {
      wsConnecting = false;
    }
  }

  return null;
}

function wsSend(payload: string): void {
  const socket = getWs();
  if (socket) {
    socket.send(payload);
  } else if (import.meta.env.DEV) {
    pendingMessages.push(payload);
  }
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

function log(level: LogLevel, source: string, message: string, data?: unknown): void {
  // Always console-log — use console.log for all levels to avoid Chrome
  // capturing warn/error as Extension Issues in chrome://extensions
  const tag = `[${level}] [${source}]`;
  const consoleFn = level === 'DEBUG' ? console.debug : console.log;

  if (data !== undefined) {
    consoleFn(tag, message, data);
  } else {
    consoleFn(tag, message);
  }

  // Dev-only: send via WebSocket
  if (import.meta.env.DEV) {
    wsSend(
      JSON.stringify({
        type: 'custom',
        event: 'debug-log',
        data: { level, source, message, data },
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Response logger (large payloads → separate files)
// ---------------------------------------------------------------------------

function response(name: string, content: string, ext: string = 'txt'): void {
  console.log(`[devLog.response] ${name} (${content.length} chars)`);

  if (import.meta.env.DEV) {
    wsSend(
      JSON.stringify({
        type: 'custom',
        event: 'debug-response',
        data: { name, content, ext },
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const devLog = {
  debug: (source: string, message: string, data?: unknown) =>
    log('DEBUG', source, message, data),
  info: (source: string, message: string, data?: unknown) =>
    log('INFO', source, message, data),
  warn: (source: string, message: string, data?: unknown) =>
    log('WARN', source, message, data),
  error: (source: string, message: string, data?: unknown) =>
    log('ERROR', source, message, data),
  response,
};
