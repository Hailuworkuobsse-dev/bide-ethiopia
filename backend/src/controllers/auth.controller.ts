import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { loginUser, registerUser } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await registerUser(input, { ip: req.ip, userAgent: req.get("user-agent") });
  res.status(201).json({ data: result });
}
export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input, { ip: req.ip, userAgent: req.get("user-agent") });
  res.status(200).json({ data: result });
}
export async function me(req: Request, res: Response) {
  res.status(200).json({ data: { userId: req.auth!.userId, role: req.auth!.role } });
}
