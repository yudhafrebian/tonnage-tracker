import z from "zod";
import { Prisma } from "../generated/prisma/client";
import { isDateString } from "./date";

// Batas kolom Decimal(12, 2).
export const MAX_KG = 9_999_999_999.99;

export const dateString = z
  .string()
  .refine(isDateString, "Must be a valid date in YYYY-MM-DD format");

export const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Must be a month in YYYY-MM format");

export const kg = z
  .number()
  .nonnegative()
  .max(MAX_KG)
  .refine(
    (v) => new Prisma.Decimal(v).decimalPlaces() <= 2,
    "Maximum 2 decimal places",
  );
