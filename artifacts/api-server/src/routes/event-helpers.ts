import type { Request, Response, NextFunction } from "express";
import { getSessionUser } from "../lib/event-auth.js";

export async function requireOrganizer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}