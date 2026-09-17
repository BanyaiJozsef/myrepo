import { hash, verify } from "argon2";

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, { type: 2 /* argon2id */ });
}

export async function verifyPassword(hashValue: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(hashValue, plaintext);
  } catch {
    return false;
  }
}
