import { Router, type IRouter } from "express";
import { db, organizerUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  AuthResponse,
  GetCurrentUserResponse,
  LoginBody,
  LoginResponse,
} from "@workspace/api-zod";
import { clearSession, getSessionUser, setSession, verifyPassword } from "../lib/event-auth.js";
import { ensureEventSeed } from "../lib/event-seed.js";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  await ensureEventSeed();
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your username and password." });
    return;
  }
  const [user] = await db
    .select()
    .from(organizerUsersTable)
    .where(eq(organizerUsersTable.username, parsed.data.username.trim()))
    .limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "That username or password is not correct." });
    return;
  }
  setSession(res, user.username);
  res.json(
    LoginResponse.parse({
      user: { username: user.username, displayName: user.displayName },
    }),
  );
});

router.post("/auth/logout", (_req, res): void => {
  clearSession(res);
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(user));
});

export default router;