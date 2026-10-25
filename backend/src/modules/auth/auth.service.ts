import { HttpError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/hash-password";
import { Role } from "../../lib/permissions";
import { signToken } from "../../lib/token";
import * as repo from "./auth.repository";

const invalidCredential = () =>
  new HttpError(
    401,
    "invalid_credentials",
    undefined,
    "Invalid username or password",
  );

// Dibuat dengan hashPassword agar cost-nya selalu sama dengan hash user asli.
// Langsung dibuat saat startup supaya login pertama tidak lebih lambat.
const dummyHash = hashPassword("dummy-password-not-used");

export const login = async (username: string, password: string) => {
  const user = await repo.findUserByUsername(username);
  const isPasswordValid = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !isPasswordValid || !user.active) throw invalidCredential();

  return {
    token: signToken(user.id),
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as Role,
    },
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await repo.findUserById(userId);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(
      400,
      "wrong_password",
      { currentPassword: ["Current password is wrong"] },
      "Current password is wrong",
    );
  }
  await repo.updatePasswordHas(userId, await hashPassword(newPassword));
};
