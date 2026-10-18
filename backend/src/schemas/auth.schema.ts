import { z } from "zod";

const phoneSchema = z.string().trim().regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().max(191),
  password: z.string().min(10).max(128),
  preferredLanguage: z.enum(["am", "om", "ti", "en"]).default("am"),
  // Public registration may choose buyer or seller; ADMIN is never accepted here.
  role: z.enum(["BUYER", "SELLER"]).default("BUYER"),
});
export const verifyEmailSchema = z.object({ token: z.string().min(32).max(256) });
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
});
