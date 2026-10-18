import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "./audit.service.js";

async function sendRegistrationConfirmationEmail(email: string, fullName: string, token: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn("Email confirmation is not configured: set RESEND_API_KEY and EMAIL_FROM.");
    return false;
  }
  const verifyUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/account?verifyEmail=${encodeURIComponent(token)}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: "Confirm your BidEthiopia email address",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937"><h2>Welcome to BidEthiopia, ${escapeHtml(fullName)}!</h2><p>Please confirm your email address to activate your account.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#1f4d36;color:white;text-decoration:none;border-radius:6px">Confirm email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></div>`,
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
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
  const rawToken = randomBytes(32).toString("hex");
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName, phone: input.phone, email: input.email, passwordHash,
      preferredLanguage: input.preferredLanguage,
      role: input.role === "SELLER" ? UserRole.SELLER : UserRole.BUYER,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerificationTokenHash: hashVerificationToken(rawToken),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, fullName: true, phone: true, email: true, role: true, status: true, preferredLanguage: true, createdAt: true },
  });
  await recordAudit({ actorId: user.id, action: "AUTH_REGISTER", entityType: "User", entityId: user.id, ipAddress: context.ip, userAgent: context.userAgent });
  const emailSent = await sendRegistrationConfirmationEmail(input.email, user.fullName, rawToken);
  return { user, emailSent };
}
export async function verifyUserEmail(token: string) {
  const tokenHash = hashVerificationToken(token);
  const user = await prisma.user.findFirst({
    where: { emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: { gt: new Date() } },
    select: { id: true, status: true },
  });
  if (!user) throw new HttpError(400, "This email confirmation link is invalid or has expired. Please register again or contact support.", "INVALID_EMAIL_TOKEN");
  await prisma.user.update({
    where: { id: user.id },
    data: { status: UserStatus.ACTIVE, emailVerificationTokenHash: null, emailVerificationExpiresAt: null },
  });
  await recordAudit({ actorId: user.id, action: "AUTH_EMAIL_VERIFIED", entityType: "User", entityId: user.id });
  return { verified: true };
}
export async function loginUser(input: { phone: string; password: string }, context: { ip?: string; userAgent?: string }) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) throw new HttpError(401, "Invalid phone number or password", "INVALID_CREDENTIALS");
  if (user.status === UserStatus.SUSPENDED) throw new HttpError(403, "This account is suspended", "ACCOUNT_SUSPENDED");
  if (user.status === UserStatus.PENDING_VERIFICATION) throw new HttpError(403, "Please confirm your email address before signing in.", "EMAIL_NOT_VERIFIED");
  await recordAudit({ actorId: user.id, action: "AUTH_LOGIN", entityType: "User", entityId: user.id, ipAddress: context.ip, userAgent: context.userAgent });
  return {
    user: { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, role: user.role, status: user.status, preferredLanguage: user.preferredLanguage, createdAt: user.createdAt },
    accessToken: issueAccessToken(user),
  };
}
