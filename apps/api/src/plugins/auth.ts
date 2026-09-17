import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import type { JwtService, AccessTokenClaims } from "../auth/jwt.js";

declare module "fastify" {
  interface FastifyInstance {
    jwtService: JwtService;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AccessTokenClaims;
  }
}

export interface AuthPluginOptions {
  jwtService: JwtService;
}

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, opts) => {
  fastify.decorate("jwtService", opts.jwtService);

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      await reply.status(401).send({ hiba: "Hiányzó vagy érvénytelen Authorization fejléc." });
      return;
    }
    const token = header.slice("Bearer ".length);
    try {
      request.authUser = await opts.jwtService.verifyAccessToken(token);
    } catch {
      await reply.status(401).send({ hiba: "Érvénytelen vagy lejárt munkamenet." });
    }
  });
};

export default fp(authPlugin, { name: "auth-plugin" });
