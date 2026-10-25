import { compare, genSalt, hash } from "bcryptjs";

// Cost yang sama dipakai untuk semua hash (termasuk dummy di auth.service),
// supaya waktu respons login tidak membocorkan apakah username ada.
export const BCRYPT_COST = 12;

export const hashPassword = async (password: string) => {
  const salt = await genSalt(BCRYPT_COST);
  return await hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return await compare(password, hash);
};
