import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "./audit.service.js";

async function sendRegistrationConfirmationEmail(email: string, fullName: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn("Email confirmation is not configured: set RESEND_API_KEY and EMAIL_FROM.");
    return false;
  }
  const safeName = fullName.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: "BidEthiopia registration confirmation",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937"><h2>Welcome to BidEthiopia, ${safeName}!</h2><p>Your registration has been received successfully.</p><p>Your account is pending administrator verification. We will notify you when it is approved.</p><p>If you did not create this account, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) {
      console.error("Email provider returned HTTP " + response.status + ": " + (await response.text().catch(() => "")).slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Registration email request failed:", error instanceof Error ? error.message : "unknown error");
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
  fullName: string; phone: string; email: string; password: string; preferredLanguage: string; role: "BUYER" | "SELLER";
}, context: { ip?: string; userAgent?: string }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: input.phone }, { email: input.email }] },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, "Phone number or email is already registered", "ACCOUNT_EXISTS");
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName, phone: input.phone, email: input.email, passwordHash,
      preferredLanguage: input.preferredLanguage,
      role: input.role === "SELLER" ? UserRole.SELLER : UserRole.BUYER,
      status: UserStatus.PENDING_VERIFICATION,
    },
    select: { id: true, fullName: true, phone: true, email: true, role: true, status: true, preferredLanguage: true, createdAt: true },
  });
  await recordAudit({ actorId: user.id, action: "AUTH_REGISTER", entityType: "User", entityId: user.id, ipAddress: context.ip, userAgent: context.userAgent });
  const emailSent = await sendRegistrationConfirmationEmail(input.email, user.fullName);
  return { user, emailSent };
}

export async function verifyUserEmail(_token: string) {
  throw new HttpError(
    501,
    "Email-link verification is not enabled yet; registration confirmation is sent by email.",
    "EMAIL_LINK_VERIFICATION_DISABLED",
  );
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
