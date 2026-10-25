import { Router } from "express";
import { loginLimiter } from "../../middleware/rateLimit";
import { validateBody } from "../../middleware/validate";
import { changePasswordSchema, loginSchema } from "./auth.schema";
import * as controller from "./auth.controller";
import { requireAuth } from "../../middleware/requireAuth";

export const router = Router();

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.Login,
);
router.post("/logout", controller.Logout);
router.get("/me", requireAuth, controller.Me);
router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  controller.ChangePassword,
);
