import { describe, expect, it } from 'vitest';
import {
  detectPayloadLanguage,
  formatByteSize,
  prettyPrint,
  prettyPrintJson,
  prettyPrintXml,
} from './formatters';

describe('prettyPrintJson', () => {
  it('indents compact JSON with two spaces', () => {
    expect(prettyPrintJson('{"a":1,"b":[1,2]}')).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  });

  it('returns null for invalid JSON', () => {
    expect(prettyPrintJson('{"a":')).toBeNull();
    expect(prettyPrintJson('<x/>')).toBeNull();
  });
});

describe('prettyPrintXml', () => {
  it('indents nested elements and keeps self-closing tags on one line', () => {
    const input = '<?xml version="1.0"?><root><a><b/></a><c>text</c></root>';
    expect(prettyPrintXml(input)).toBe(
      ['<?xml version="1.0"?>', '<root>', '  <a>', '    <b/>', '  </a>', '  <c>', '    text', '  </c>', '</root>'].join('\n'),
    );
  });

  it('returns null when the content is not XML', () => {
    expect(prettyPrintXml('{"json":true}')).toBeNull();
    expect(prettyPrintXml('')).toBeNull();
  });
});

describe('detectPayloadLanguage / prettyPrint', () => {
  it('detects xml, json and text', () => {
    expect(detectPayloadLanguage('  <a/>')).toBe('xml');
    expect(detectPayloadLanguage('[1]')).toBe('json');
    expect(detectPayloadLanguage('{"a":1}')).toBe('json');
    expect(detectPayloadLanguage('hello')).toBe('text');
  });

  it('dispatches by detected language and returns null for plain text', () => {
    expect(prettyPrint('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyPrint('<a><b/></a>')).toBe('<a>\n  <b/>\n</a>');
    expect(prettyPrint('plain')).toBeNull();
    expect(prettyPrint('{"a":1}', 'text')).toBeNull();
  });
});

describe('formatByteSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatByteSize(512)).toBe('512 B');
    expect(formatByteSize(2048)).toBe('2.0 KB');
    expect(formatByteSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
