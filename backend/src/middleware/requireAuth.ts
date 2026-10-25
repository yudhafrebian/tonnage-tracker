import { HttpError } from "../lib/errors";
import type { Request, Response, NextFunction } from "express";
import { COOKIE_NAME, verifyToken } from "../lib/token";
import { prisma } from "../config/prisma";
import { Role } from "../lib/permissions";

const unauthenticated = () =>
  new HttpError(401, "unauthenticated", undefined, "Please login First");

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token: string | undefined = req.cookies?.[COOKIE_NAME] ?? bearer;

  const userId = token ? verifyToken(token) : null;
  if (!userId) throw unauthenticated();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, role: true, active: true },
  });

  if (!user || !user.active) throw unauthenticated();

  req.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
  };

  next();
}
