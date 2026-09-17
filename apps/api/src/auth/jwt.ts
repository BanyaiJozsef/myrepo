import { SignJWT, jwtVerify } from "jose";
import type { FelhasznaloSzerep } from "@autoszerv/shared-types";

export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  szerep: FelhasznaloSzerep;
}

export interface RefreshTokenClaims {
  sub: string;
  tenantId: string;
}

export interface JwtService {
  signAccessToken(claims: AccessTokenClaims): Promise<string>;
  signRefreshToken(claims: RefreshTokenClaims): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
  verifyRefreshToken(token: string): Promise<RefreshTokenClaims>;
}

export interface JwtServiceConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export function createJwtService(config: JwtServiceConfig): JwtService {
  const accessKey = new TextEncoder().encode(config.accessSecret);
  const refreshKey = new TextEncoder().encode(config.refreshSecret);

  return {
    async signAccessToken(claims) {
      return new SignJWT({ tenantId: claims.tenantId, szerep: claims.szerep })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(config.accessTtl)
        .sign(accessKey);
    },
    async signRefreshToken(claims) {
      return new SignJWT({ tenantId: claims.tenantId })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(config.refreshTtl)
        .sign(refreshKey);
    },
    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, accessKey);
      return {
        sub: requireString(payload.sub, "sub"),
        tenantId: requireString(payload.tenantId, "tenantId"),
        szerep: requireString(payload.szerep, "szerep") as FelhasznaloSzerep,
      };
    },
    async verifyRefreshToken(token) {
      const { payload } = await jwtVerify(token, refreshKey);
      return {
        sub: requireString(payload.sub, "sub"),
        tenantId: requireString(payload.tenantId, "tenantId"),
      };
    },
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Érvénytelen token: hiányzó vagy hibás "${field}" mező.`);
  }
  return value;
}
