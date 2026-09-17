import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { felhasznalok, tenants } from "@autoszerv/db";
import { loginInputSchema, registerInputSchema } from "@autoszerv/shared-types";
import { hashPassword, verifyPassword } from "../auth/password.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Self-serve signup: always creates a brand new 'demo' tenant plus its owner user.
  // There is no path from here to an 'aktiv' tenant other than a valid license key
  // (see routes/license.ts) — signing up never grants a live account.
  fastify.post("/auth/register", async (request, reply) => {
    const parsed = registerInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen regisztrációs adatok." });
    }
    const { szervizNev, nev, email, jelszo } = parsed.data;

    const [letezoFelhasznalo] = await fastify.db
      .select({ id: felhasznalok.id })
      .from(felhasznalok)
      .where(eq(felhasznalok.email, email))
      .limit(1);
    if (letezoFelhasznalo) {
      return reply.status(409).send({ hiba: "Ez az e-mail cím már regisztrálva van." });
    }

    const [tenant] = await fastify.db.insert(tenants).values({ nev: szervizNev, allapot: "demo" }).returning();
    if (!tenant) {
      throw new Error("Nem sikerült a tenant létrehozása.");
    }
    const [user] = await fastify.db
      .insert(felhasznalok)
      .values({
        tenantId: tenant.id,
        nev,
        email,
        jelszoHash: await hashPassword(jelszo),
        szerep: "tulaj",
      })
      .returning();
    if (!user) {
      throw new Error("Nem sikerült a felhasználó létrehozása.");
    }

    const accessToken = await fastify.jwtService.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      szerep: user.szerep,
    });
    const refreshToken = await fastify.jwtService.signRefreshToken({
      sub: user.id,
      tenantId: user.tenantId,
    });

    return reply
      .status(201)
      .setCookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/auth/refresh",
      })
      .send({
        accessToken,
        felhasznalo: { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
        tenant: { id: tenant.id, nev: tenant.nev, allapot: tenant.allapot },
      });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const parsed = loginInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ hiba: "Érvénytelen bejelentkezési adatok." });
    }
    const { email, jelszo } = parsed.data;

    const [user] = await fastify.db
      .select()
      .from(felhasznalok)
      .where(eq(felhasznalok.email, email))
      .limit(1);

    if (!user || !(await verifyPassword(user.jelszoHash, jelszo))) {
      return reply.status(401).send({ hiba: "Hibás e-mail cím vagy jelszó." });
    }

    const accessToken = await fastify.jwtService.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      szerep: user.szerep,
    });
    const refreshToken = await fastify.jwtService.signRefreshToken({
      sub: user.id,
      tenantId: user.tenantId,
    });

    return reply
      .setCookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/auth/refresh",
      })
      .send({
        accessToken,
        felhasznalo: { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
      });
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({ hiba: "Hiányzó frissítő token." });
    }
    try {
      const claims = await fastify.jwtService.verifyRefreshToken(refreshToken);
      const [user] = await fastify.db
        .select()
        .from(felhasznalok)
        .where(eq(felhasznalok.id, claims.sub))
        .limit(1);
      if (!user) {
        return reply.status(401).send({ hiba: "A felhasználó már nem létezik." });
      }
      const accessToken = await fastify.jwtService.signAccessToken({
        sub: user.id,
        tenantId: user.tenantId,
        szerep: user.szerep,
      });
      return reply.send({
        accessToken,
        felhasznalo: { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
      });
    } catch {
      return reply.status(401).send({ hiba: "Érvénytelen vagy lejárt frissítő token." });
    }
  });

  fastify.post("/auth/logout", async (_request, reply) => {
    return reply.clearCookie("refresh_token", { path: "/auth/refresh" }).status(204).send();
  });
};
