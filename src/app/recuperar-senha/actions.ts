"use server";

import { requestPasswordReset } from "@/lib/auth/password-recovery";
import { requestPasswordResetSchema } from "@/lib/auth/validation";

export type RequestPasswordResetState = {
  message?: string;
  error?: string;
  fields?: { email?: string[] };
};

export async function requestPasswordResetAction(
  _state: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      error: "Revise o e-mail informado.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await requestPasswordReset(parsed.data.email);
  return { message: result.message };
}
