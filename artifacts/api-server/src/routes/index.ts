import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import attendeesRouter from "./attendees.js";
import checkInsRouter from "./check-ins.js";
import dashboardRouter from "./dashboard.js";
import invitationsRouter from "./invitations.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(attendeesRouter);
router.use(checkInsRouter);
router.use(dashboardRouter);
router.use(invitationsRouter);

export default router;
