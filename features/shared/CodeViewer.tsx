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

// Light theme bound to the `flowmate` theme tokens (base-200 background,
// base-content text, the code-* syntax colors from assets/flowmate-theme.css)
// instead of CodeMirror's bundled `oneDark`. CSS variables work here because
// CodeMirror renders inside our Shadow Root, where the theme is defined.
const lightEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-base-200)',
    color: 'var(--color-base-content)',
  },
  '.cm-content': {
    caretColor: 'var(--color-base-content)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-base-200)',
    color: 'var(--color-muted)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in oklab, var(--color-primary) 6%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in oklab, var(--color-primary) 6%, transparent)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
  },
});

// JSON keys and XML tags `code-key`; strings and attribute values `code-string`;
// numbers and attribute names `code-number`; true/false/null and keywords
// `code-literal`. All reach 4.5:1 on base-200.
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--color-code-key)' },
  { tag: tags.string, color: 'var(--color-code-string)' },
  { tag: tags.number, color: 'var(--color-code-number)' },
  { tag: tags.bool, color: 'var(--color-code-literal)' },
  { tag: tags.null, color: 'var(--color-code-literal)' },
  { tag: tags.keyword, color: 'var(--color-code-literal)' },
  { tag: tags.tagName, color: 'var(--color-code-key)' },
  { tag: tags.attributeName, color: 'var(--color-code-number)' },
  { tag: tags.attributeValue, color: 'var(--color-code-string)' },
  { tag: tags.comment, color: 'var(--color-code-comment)', fontStyle: 'italic' },
  { tag: tags.punctuation, color: 'var(--color-code-punct)' },
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
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            // Payloads show their characters as they are: no `<!--` or `->` arrows.
            fontVariantLigatures: 'none',
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
          <div ref={containerRef} class="overflow-hidden rounded-field border border-base-300" />
        </>
      )}
    </div>
  );
}
