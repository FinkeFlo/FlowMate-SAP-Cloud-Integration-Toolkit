/**
 * CodeViewer — Reusable CodeMirror 6 wrapper for Preact.
 *
 * Read-only code viewer with syntax highlighting, line numbers,
 * search (Ctrl+F), and dark theme matching the glassmorphism UI.
 */

import { useRef, useEffect, useState, useMemo } from 'preact/hooks';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { WandSparkles } from 'lucide-preact';
import { detectPayloadLanguage, prettyPrint } from '@/features/shared/formatters';
import { t } from '@/features/shared/i18n';

export interface CodeViewerProps {
  content: string;
  language?: 'xml' | 'json' | 'text';
  readonly?: boolean;
  maxHeight?: string;
}

const detectLanguage = detectPayloadLanguage;

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
  const formatted = useMemo(() => prettyPrint(content, lang), [content, lang]);
  const canFormat = formatted !== null && formatted !== content;
  const displayContent = isFormatted && formatted !== null ? formatted : content;

  // Reset to the raw view whenever a new payload comes in (e.g. navigating
  // between trace steps) instead of carrying over the previous toggle state.
  useEffect(() => {
    setIsFormatted(false);
     
  }, [content]);

  // Mount/unmount the EditorView once
  useEffect(() => {
    if (!containerRef.current) return;

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
        oneDark,
        EditorView.editable.of(!readonly),
        EditorState.readOnly.of(readonly),
        EditorView.theme({
          '&': {
            maxHeight,
            fontSize: '12px',
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
  }, [displayContent, lang]);

  return (
    <div>
      {canFormat && (
        <div class="mb-1.5 flex justify-end">
          <button
            type="button"
            class={`btn btn-xs gap-1.5 ${isFormatted ? 'btn-primary' : 'btn-ghost'}`}
            title={isFormatted ? t('codeViewerRaw') : t('codeViewerFormat')}
            onClick={() => setIsFormatted((v) => !v)}
          >
            <WandSparkles size={13} />
            {isFormatted ? t('codeViewerRaw') : t('codeViewerFormat')}
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      />
    </div>
  );
}
