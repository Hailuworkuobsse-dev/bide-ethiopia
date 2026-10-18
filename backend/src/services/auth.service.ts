import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "./audit.service.js";

async function sendRegistrationConfirmationWhatsApp(phone: string, fullName: string): Promise<boolean> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("WhatsApp Cloud API is not configured; registration confirmation was skipped.");
    return false;
  }

  // Meta expects the recipient number in international digits-only format, e.g. 2519XXXXXXXX.
  const recipient = phone.replace(/\D/g, "");
  if (!recipient) {
    console.warn("WhatsApp confirmation skipped because the recipient phone number is invalid.");
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: env.WHATSAPP_REGISTRATION_TEMPLATE,
            language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: fullName }],
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("WhatsApp Cloud API returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 500) : ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Registration WhatsApp request failed:", error instanceof Error ? error.message : "unknown error");
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
  const whatsappSent = await sendRegistrationConfirmationWhatsApp(user.phone, user.fullName);
  // Keep smsSent as a temporary response alias so existing frontend builds remain compatible.
  return { user, accessToken: issueAccessToken(user), whatsappSent, smsSent: whatsappSent };
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
