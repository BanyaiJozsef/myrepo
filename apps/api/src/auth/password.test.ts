import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("hashes with argon2id and verifies the same plaintext", async () => {
    const hashValue = await hashPassword("Titkosjelszo123!");
    expect(hashValue).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hashValue, "Titkosjelszo123!")).resolves.toBe(true);
  });

  it("rejects the wrong plaintext", async () => {
    const hashValue = await hashPassword("Titkosjelszo123!");
    await expect(verifyPassword(hashValue, "wrong")).resolves.toBe(false);
  });

  it("returns false instead of throwing for a malformed hash", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
