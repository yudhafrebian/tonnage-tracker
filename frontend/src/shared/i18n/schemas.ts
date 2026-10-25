import z from "zod";
import { Dictionary } from "./types";

export const makeLoginSchema = (dict: Dictionary) =>
  z.object({
    username: z.string().min(1, dict.validation.usernameRequired),
    password: z.string().min(1, dict.validation.passwordRequired),
  });

export type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;
