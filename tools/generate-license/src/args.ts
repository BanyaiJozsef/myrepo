export interface ParsedArgs {
  command: "generate" | "generate-keypair";
  tenant?: string;
  plan?: string;
  expires?: string;
  features?: string;
  maxUsers?: number;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv[0] === "generate-keypair") {
    return { command: "generate-keypair" };
  }

  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token?.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Hiányzó érték a(z) --${key} kapcsolóhoz.`);
      }
      args[key] = value;
      i += 1;
    }
  }

  return {
    command: "generate",
    tenant: args.tenant,
    plan: args.plan,
    expires: args.expires,
    features: args.features,
    maxUsers: args["max-users"] ? Number(args["max-users"]) : undefined,
  };
}
