/**
 * The readable part of a thrown value, for the `$ERROR$` placeholder of a
 * toast: "Request timed out" instead of "Error: Request timed out".
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
