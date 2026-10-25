import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";

// Aturan sama dengan backend (auth.schema.ts changePasswordSchema), plus konfirmasi password.
export const makeChangePasswordSchema = (m: Dictionary["settings"]["password"]) =>
  z
    .object({
      currentPassword: z.string().min(1, m.required),
      newPassword: z.string().min(12, m.tooShort).max(256),
      confirmPassword: z.string().min(1, m.required),
    })
    .superRefine((v, ctx) => {
      if (v.newPassword && v.newPassword === v.currentPassword) {
        ctx.addIssue({ code: "custom", path: ["newPassword"], message: m.sameAsCurrent });
      }
      if (v.confirmPassword && v.confirmPassword !== v.newPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: m.mismatch });
      }
    });

export type ChangePasswordFormValues = z.infer<ReturnType<typeof makeChangePasswordSchema>>;
