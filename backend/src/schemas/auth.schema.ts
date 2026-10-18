import { z } from "zod";

const phoneSchema = z.string().trim().regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().max(191).optional(),
  password: z.string().min(10).max(128),
  preferredLanguage: z.enum(["am", "om", "ti", "en"]).default("am"),
});
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
});
