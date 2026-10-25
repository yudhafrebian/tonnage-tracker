import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { baseCookieOptions, COOKIE_NAME, cookieOptions } from "../../lib/token";

export const Login = async (req: Request, res: Response) => {
  const { token, user } = await authService.login(
    req.body.username,
    req.body.password,
  );
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(200).send({ success: true, code: "login_success", message: "Login Success" });
};

export const Logout = async (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
  res.status(204).send({ success: true, message: "Logout Success" });
};

export const Me = async (req: Request, res: Response) => {
  res.status(200).send({ success: true, data: req.user });
};

export const ChangePassword = async (req: Request, res: Response) => {
  await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  res
    .status(204)
    .send({ success: true, message: "Password Changed Successfully" });
};
