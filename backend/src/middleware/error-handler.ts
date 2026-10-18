import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ error: { code: "CONFLICT", message: "A record with this value already exists" } });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found" } });
      return;
    }
  }
  console.error("Unhandled request error", error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "An unexpected error occurred" : (error instanceof Error ? error.message : "Unknown error"),
    },
  });
};
