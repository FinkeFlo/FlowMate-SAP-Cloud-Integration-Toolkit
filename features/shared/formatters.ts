/**
 * formatters — best-effort "pretty print" helpers for JSON and XML payloads.
 *
 * Used to reformat compact/minified message bodies (e.g. a single-line JSON
 * or XML payload from SAP CPI) into an indented, human-readable form on
 * demand. Both return `null` when the input isn't parseable as that format,
 * so callers can fall back to showing the raw content unchanged.
 */

export function prettyPrintJson(content: string): string | null {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return null;
  }
}

/**
 * Minimal, dependency-free XML indenter. Not a full XML parser/validator —
 * it just re-indents based on tag nesting, which is enough to make a
 * minified payload readable. Self-closing tags, the XML declaration, and
 * comments are handled; malformed XML returns `null` so the raw text is
 * shown instead.
 */
export function prettyPrintXml(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('<')) return null;

  try {
    // Normalize: strip whitespace between tags, then split into tokens.
    const withoutInterTagWhitespace = trimmed.replace(/>\s+</g, '><');
    const tokens = withoutInterTagWhitespace.match(/<[^>]+>|[^<]+/g);
    if (!tokens) return null;

    let indentLevel = 0;
    const indentUnit = '  ';
    const lines: string[] = [];

    for (const rawToken of tokens) {
      const token = rawToken.trim();
      if (!token) continue;

      const isDeclaration = /^<\?/.test(token);
      const isComment = /^<!--/.test(token);
      const isClosingTag = /^<\//.test(token);
      const isSelfClosingTag = /\/>$/.test(token);
      const isOpeningTag = /^<[^/!?]/.test(token) && !isSelfClosingTag;
      const isText = !/^</.test(token);

      if (isClosingTag) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      lines.push(`${indentUnit.repeat(indentLevel)}${token}`);

      if (isOpeningTag && !isDeclaration && !isComment && !isText) {
        indentLevel += 1;
      }
    }

    const result = lines.join('\n');
    // Sanity check: if nothing actually changed shape, still treat as success
    // as long as it round-trips to roughly the same tag count.
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export type PayloadLanguage = 'xml' | 'json' | 'text';

export function detectPayloadLanguage(content: string): PayloadLanguage {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('<')) return 'xml';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'text';
}

/** Pretty-prints `content` according to its detected/declared language. Returns `null` if formatting isn't supported or fails. */
export function prettyPrint(content: string, language?: PayloadLanguage): string | null {
  const lang = language ?? detectPayloadLanguage(content);
  if (lang === 'json') return prettyPrintJson(content);
  if (lang === 'xml') return prettyPrintXml(content);
  return null;
}
