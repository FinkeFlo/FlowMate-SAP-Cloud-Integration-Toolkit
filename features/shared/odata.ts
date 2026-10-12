/**
 * OData string literals for SAP CPI API URLs. Inside a literal a single quote
 * is written as two (OData ABNF), so a value taken from the page URL (iFlow or
 * package id) can never end the literal early and change the query.
 */

/** Escapes a value for use inside an OData string literal: `'` becomes `''`. */
export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * A quoted, percent-encoded OData string literal for a key segment or query
 * option written straight into a URL, e.g. `MessageProcessingLogs(${odataLiteral(guid)})`.
 * Use `escapeODataString` instead where `URLSearchParams` does the encoding.
 */
export function odataLiteral(value: string): string {
  return `'${encodeURIComponent(escapeODataString(value))}'`;
}
