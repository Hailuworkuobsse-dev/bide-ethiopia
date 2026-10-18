import type { RequestHandler } from "express";
import { UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";

export const requireActiveAccount: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) return next(new HttpError(401, "Authentication required", "UNAUTHENTICATED"));
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { status: true } });
    if (!user) return next(new HttpError(401, "Account no longer exists", "ACCOUNT_NOT_FOUND"));
    if (user.status !== UserStatus.ACTIVE) return next(new HttpError(403, "Your account must be verified and active to perform this action", "ACCOUNT_NOT_ACTIVE"));
    next();
  } catch (error) {
    next(error);
  }
};
