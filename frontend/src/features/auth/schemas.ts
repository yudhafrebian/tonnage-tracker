import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";

// Schema dibuat dari kamus supaya pesan validasi mengikuti bahasa aktif.
export const makeLoginSchema = (dict: Dictionary) =>
  z.object({
    username: z.string().min(1, dict.validation.usernameRequired),
    password: z.string().min(1, dict.validation.passwordRequired),
  });

export type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;
