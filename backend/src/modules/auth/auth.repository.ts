import { prisma } from "../../config/prisma";

export const findUserByUsername = (username: string) =>
  prisma.user.findUnique({ where: { username } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const updatePasswordHas = (id: string, passwordHash: string) =>
  prisma.user.update({
    where: {
      id,
    },
    data: {
      passwordHash,
    },
  });
