import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

type AccessClaims = { sub: string; role: UserRole; typ: "access" };
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new HttpError(401, "Authentication required", "UNAUTHENTICATED"));
  try {
    const claims = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, { issuer: "bide-ethiopia-api", audience: "bide-ethiopia-client" }) as AccessClaims;
    if (!claims.sub || !Object.values(UserRole).includes(claims.role) || claims.typ !== "access") {
      return next(new HttpError(401, "Invalid access token", "INVALID_TOKEN"));
    }
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired access token", "INVALID_TOKEN"));
  }
};

export const authorize = (...roles: UserRole[]): RequestHandler => (req, _res, next) => {
  if (!req.auth) return next(new HttpError(401, "Authentication required", "UNAUTHENTICATED"));
  if (!roles.includes(req.auth.role)) return next(new HttpError(403, "You do not have permission to perform this action", "FORBIDDEN"));
  next();
};
