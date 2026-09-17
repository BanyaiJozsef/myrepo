import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("parses the generate-keypair command", () => {
    expect(parseArgs(["generate-keypair"])).toEqual({ command: "generate-keypair" });
  });

  it("parses generate flags", () => {
    const result = parseArgs([
      "--tenant",
      "11111111-1111-1111-1111-111111111111",
      "--plan",
      "pro",
      "--expires",
      "2027-09-16",
      "--features",
      "invoicing,sms",
      "--max-users",
      "5",
    ]);
    expect(result).toEqual({
      command: "generate",
      tenant: "11111111-1111-1111-1111-111111111111",
      plan: "pro",
      expires: "2027-09-16",
      features: "invoicing,sms",
      maxUsers: 5,
    });
  });

  it("throws when a flag is missing its value", () => {
    expect(() => parseArgs(["--tenant"])).toThrow();
  });
});
