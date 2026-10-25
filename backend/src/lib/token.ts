import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const COOKIE_NAME = "tonnage_token";
const TTL_SECOND = 12 * 60 * 60;

export const signToken = (userId: string): string => {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: TTL_SECOND,
    algorithm: "HS256",
  });
};

export const verifyToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return typeof payload === "object" && typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch (error) {
    return null;
  }
};

export const baseCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const cookieOptions = {
  ...baseCookieOptions,
  maxAge: TTL_SECOND * 1000,
};
