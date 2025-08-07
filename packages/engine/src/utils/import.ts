/**
 * Dynamically imports the "sidequest" module.
 *
 * @returns A promise that resolves to the imported "sidequest" module.
 */
export async function importSidequest() {
  return await import("sidequest");
}
