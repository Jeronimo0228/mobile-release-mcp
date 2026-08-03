import type { GooglePlayClient } from "./client.js";

/** Use a temporary edit when editId is omitted (read-only convenience). */
export async function withOptionalEdit<T>(
  client: GooglePlayClient,
  packageName: string,
  editId: string | undefined,
  fn: (editId: string) => Promise<T>,
): Promise<T> {
  if (editId) return fn(editId);
  return client.withEdit(packageName, fn);
}
