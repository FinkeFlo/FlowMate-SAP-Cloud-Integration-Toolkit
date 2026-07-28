/**
 * CodeViewer — Reusable CodeMirror 6 wrapper for Preact.
 *
 * Read-only code viewer with syntax highlighting, line numbers, search
 * (Ctrl+F), soft line-wrapping, and a light theme matching the `flowmate`
 * daisyUI theme used throughout the extension.
 */

import { useRef, useEffect, useState, useMemo } from 'preact/hooks';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { WandSparkles, Download, TriangleAlert } from 'lucide-preact';
import {
  detectPayloadLanguage,
  prettyPrint,
  downloadPayload,
  formatByteSize,
  MAX_RENDER_CHARS,
  MAX_FORMAT_CHARS,
} from '@/features/shared/formatters';
import { t, tSub } from '@/features/shared/i18n';

export interface CodeViewerProps {
  content: string;
  language?: 'xml' | 'json' | 'text';
  readonly?: boolean;
  maxHeight?: string;
}

const detectLanguage = detectPayloadLanguage;

// Light theme matching the `flowmate` daisyUI theme (base-200 background,
// base-content text) instead of CodeMirror's bundled `oneDark` — the whole
// extension UI is light-only (see assets/flowmate-theme.css), so a dark
// code block looked out of place next to the rest of the panel.
const lightEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#f5f5f5',
    color: '#24292f',
  },
  '.cm-content': {
    caretColor: '#24292f',
  },
  '.cm-gutters': {
    backgroundColor: '#f5f5f5',
    color: '#8c959f',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 112, 242, 0.06)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 112, 242, 0.06)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(0, 112, 242, 0.15)',
  },
});

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#0070f2' },
  { tag: tags.string, color: '#15803d' },
  { tag: tags.number, color: '#b45309' },
  { tag: tags.bool, color: '#0a6ed1' },
  { tag: tags.null, color: '#0a6ed1' },
  { tag: tags.keyword, color: '#0a6ed1' },
  { tag: tags.tagName, color: '#0070f2' },
  { tag: tags.attributeName, color: '#b45309' },
  { tag: tags.attributeValue, color: '#15803d' },
  { tag: tags.comment, color: '#8c959f', fontStyle: 'italic' },
  { tag: tags.punctuation, color: '#57606a' },
]);

function getLanguageExtension(lang: 'xml' | 'json' | 'text') {
  switch (lang) {
    case 'xml': return xml();
    case 'json': return json();
    default: return [];
  }
}

export function CodeViewer({
  content,
  language,
  readonly = true,
  maxHeight = '400px',
}: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const compartmentRef = useRef<Compartment | null>(null);
  const currentLangRef = useRef<string>('');
  // Off by default — shows the payload exactly as received. The toggle lets
  // the user opt into a reformatted, indented view for readability.
  const [isFormatted, setIsFormatted] = useState(false);

  const lang = language ?? detectLanguage(content);
  const isOversized = content.length > MAX_RENDER_CHARS;
  const formatted = useMemo(() => {
    if (isOversized || content.length > MAX_FORMAT_CHARS) return null;
    return prettyPrint(content, lang);
  }, [content, lang, isOversized]);
  const canFormat = formatted !== null && formatted !== content;
  const displayContent = isFormatted && formatted !== null ? formatted : content;

  function handleDownload() {
    downloadPayload(displayContent, lang);
  }

  // Reset to the raw view whenever a new payload comes in (e.g. navigating
  // between trace steps) instead of carrying over the previous toggle state.
  useEffect(() => {
    setIsFormatted(false);
     
  }, [content]);

  // Mount/unmount the EditorView once
  useEffect(() => {
    // Skip mounting CodeMirror entirely for huge payloads — language parsing
    // + syntax highlighting on multi-MB content can noticeably freeze the
    // UI. The oversized branch below renders a download-only fallback instead.
    if (!containerRef.current || isOversized) return;

    const compartment = new Compartment();
    compartmentRef.current = compartment;
    currentLangRef.current = lang;

    const state = EditorState.create({
      doc: displayContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of(searchKeymap),
        compartment.of(getLanguageExtension(lang)),
        lightEditorTheme,
        syntaxHighlighting(lightHighlightStyle),
        // Wrap long lines instead of requiring horizontal scrolling — this is
        // purely visual (soft-wrap), the underlying document text is
        // unchanged, so copy/paste still yields the original content.
        EditorView.lineWrapping,
        EditorView.editable.of(!readonly),
        EditorState.readOnly.of(readonly),
        EditorView.theme({
          '&': {
            maxHeight,
            fontSize: '13px',
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '&.cm-focused': {
            outline: 'none',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      compartmentRef.current = null;
    };
    // Only create/destroy on mount/unmount — content updates use transactions below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content and language via transaction (avoids full EditorView rebuild)
  useEffect(() => {
    if (isOversized) return;
    const view = viewRef.current;
    const compartment = compartmentRef.current;
    if (!view || !compartment) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== displayContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: displayContent },
      });
    }

    // Only reconfigure language if it actually changed
    if (lang !== currentLangRef.current) {
      currentLangRef.current = lang;
      view.dispatch({
        effects: compartment.reconfigure(getLanguageExtension(lang)),
      });
    }
  }, [displayContent, lang, isOversized]);

  return (
    <div>
      {isOversized ? (
        <div class="rounded-box border border-base-300 bg-base-200/60 p-4">
          <div class="flex items-center gap-2 text-sm text-warning">
            <TriangleAlert size={16} />
            {tSub('codeViewerTooLarge', formatByteSize(content.length))}
          </div>
          <button
            type="button"
            class="btn btn-sm btn-primary mt-3 gap-1.5"
            onClick={handleDownload}
          >
            <Download size={14} />
            {t('codeViewerDownload')}
          </button>
        </div>
      ) : (
        <>
          <div class="mb-1.5 flex justify-end gap-1.5">
            {canFormat && (
              <button
                type="button"
                class={`btn btn-xs gap-1.5 ${isFormatted ? 'btn-primary' : 'btn-ghost'}`}
                title={isFormatted ? t('codeViewerRaw') : t('codeViewerFormat')}
                onClick={() => setIsFormatted((v) => !v)}
              >
                <WandSparkles size={13} />
                {isFormatted ? t('codeViewerRaw') : t('codeViewerFormat')}
              </button>
            )}
            <button
              type="button"
              class="btn btn-ghost btn-xs gap-1.5"
              title={t('codeViewerDownload')}
              onClick={handleDownload}
            >
              <Download size={13} />
              {t('codeViewerDownload')}
            </button>
          </div>
          <div
            ref={containerRef}
            style={{
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--color-base-300, #e0e0e0)',
            }}
          />
        </>
      )}
    </div>
  );
}
