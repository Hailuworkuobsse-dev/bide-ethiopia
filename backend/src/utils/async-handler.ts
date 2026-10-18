import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const asyncHandler = (handler: AsyncController): RequestHandler =>
  (req, res, next) => { void handler(req, res, next).catch(next); };
