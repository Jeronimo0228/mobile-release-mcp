import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

/**
 * Mirrors confirm + dryRun logic from tool-registry.ts for unit testing.
 */
function shouldRequireConfirm(
  destructive: boolean,
  hasDryRun: boolean,
  args: { confirm?: boolean; dryRun?: boolean },
): boolean {
  const dryRun = hasDryRun && args.dryRun !== false;
  return destructive && args.confirm !== true && !dryRun;
}

describe("tool-registry confirm/dryRun", () => {
  it("skips confirm when dryRun defaults true (omitted)", () => {
    assert.equal(shouldRequireConfirm(true, true, {}), false);
  });

  it("skips confirm when dryRun is explicitly true", () => {
    assert.equal(shouldRequireConfirm(true, true, { dryRun: true }), false);
  });

  it("requires confirm when dryRun is false", () => {
    assert.equal(shouldRequireConfirm(true, true, { dryRun: false }), true);
    assert.equal(
      shouldRequireConfirm(true, true, { dryRun: false, confirm: true }),
      false,
    );
  });

  it("requires confirm on destructive tools without dryRun", () => {
    assert.equal(shouldRequireConfirm(true, false, {}), true);
    assert.equal(shouldRequireConfirm(true, false, { confirm: true }), false);
  });

  it("optional confirm schema accepts omission", () => {
    const schema = z.object({
      dryRun: z.boolean().default(true),
      confirm: z.literal(true).optional(),
    });
    const parsed = schema.parse({ dryRun: true });
    assert.equal(parsed.confirm, undefined);
  });
});
