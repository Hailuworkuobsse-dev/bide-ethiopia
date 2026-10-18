import type { RequestHandler } from "express";
import { recordAudit } from "../services/audit.service.js";

export const auditRequest = (action: string, entityType: string): RequestHandler => (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    void recordAudit({
      actorId: req.auth?.userId,
      action,
      entityType,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { method: req.method, path: req.path, statusCode: res.statusCode },
    }).catch((error) => console.error("Audit write failed", error));
  });
  next();
};
