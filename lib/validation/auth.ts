import { z } from "zod";

export const inviteSessionSchema = z.object({
  tokenHash: z.string().trim().min(1),
  type: z.literal("invite"),
});

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
