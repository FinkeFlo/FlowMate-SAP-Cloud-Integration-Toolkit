import { describe, expect, it } from 'vitest';
import { escapeODataString, odataLiteral } from './odata';

describe('escapeODataString', () => {
  it('doubles single quotes and leaves everything else alone', () => {
    expect(escapeODataString('Acme_Order_Inbound')).toBe('Acme_Order_Inbound');
    expect(escapeODataString("Acme'Order")).toBe("Acme''Order");
    expect(escapeODataString("' or Status eq 'FAILED")).toBe("'' or Status eq ''FAILED");
  });
});

describe('odataLiteral', () => {
  it('quotes and percent-encodes a value for a URL', () => {
    expect(odataLiteral('AGa1b2C3d4E5f6g7h8i9j0kL01')).toBe("'AGa1b2C3d4E5f6g7h8i9j0kL01'");
    expect(odataLiteral('Acme Orders/v2')).toBe("'Acme%20Orders%2Fv2'");
  });

  it('keeps a quote inside the value from closing the literal', () => {
    expect(odataLiteral("Acme')/$value?x='")).toBe("'Acme'')%2F%24value%3Fx%3D'''");
  });
});
