"use server";

import { resetPasswordWithToken } from "@/lib/auth/password-recovery";
import { resetPasswordSchema } from "@/lib/auth/validation";

export type ResetPasswordState = {
  message?: string;
  error?: string;
  fields?: { token?: string[]; password?: string[]; confirmPassword?: string[] };
  completed?: boolean;
};

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.success) return { error: result.message };
  return { message: result.message, completed: true };
}
