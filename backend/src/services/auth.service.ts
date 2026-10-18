import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "./audit.service.js";


async function sendRegistrationConfirmationSms(phone: string, fullName: string): Promise<boolean> {
  if (!env.SMS_API_URL || !env.SMS_API_TOKEN) {
    console.warn("SMS gateway is not configured; registration confirmation SMS was skipped.");
    return false;
  }
  try {
    const response = await fetch(env.SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.SMS_API_TOKEN },
      body: JSON.stringify({
        to: phone,
        message: "Hello " + fullName + ", your BidEthiopia registration is complete. Your account is pending verification. You can now sign in.",
        ...(env.SMS_SENDER_ID ? { senderId: env.SMS_SENDER_ID } : {}),
      }),
    });
    if (!response.ok) {
      console.error("SMS gateway returned HTTP " + response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Registration SMS request failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

function issueAccessToken(user: { id: string; role: UserRole }) {
  return jwt.sign({ role: user.role, typ: "access" }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "bide-ethiopia-api",
    audience: "bide-ethiopia-client",
  });
}

export async function registerUser(input: {
  fullName: string; phone: string; email?: string; password: string; preferredLanguage: string; role: "BUYER" | "SELLER";
}, context: { ip?: string; userAgent?: string }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])] },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, "Phone number or email is already registered", "ACCOUNT_EXISTS");
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash,
      preferredLanguage: input.preferredLanguage,
      role: input.role === "SELLER" ? UserRole.SELLER : UserRole.BUYER,
      status: UserStatus.PENDING_VERIFICATION,
    },
    select: { id: true, fullName: true, phone: true, email: true, role: true, status: true, preferredLanguage: true, createdAt: true },
  });
  await recordAudit({ actorId: user.id, action: "AUTH_REGISTER", entityType: "User", entityId: user.id, ipAddress: context.ip, userAgent: context.userAgent });
  const smsSent = await sendRegistrationConfirmationSms(user.phone, user.fullName);
  return { user, accessToken: issueAccessToken(user), smsSent };
}

export async function loginUser(input: { phone: string; password: string }, context: { ip?: string; userAgent?: string }) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) throw new HttpError(401, "Invalid phone number or password", "INVALID_CREDENTIALS");
  if (user.status === UserStatus.SUSPENDED) throw new HttpError(403, "This account is suspended", "ACCOUNT_SUSPENDED");
  await recordAudit({ actorId: user.id, action: "AUTH_LOGIN", entityType: "User", entityId: user.id, ipAddress: context.ip, userAgent: context.userAgent });
  return {
    user: { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, role: user.role, status: user.status, preferredLanguage: user.preferredLanguage, createdAt: user.createdAt },
    accessToken: issueAccessToken(user),
  };
}
