"use server";

import { acceptInviteSchema } from "@/lib/auth/validation";
import { acceptUserInvitation } from "@/lib/users/invitations";

export type AcceptInviteState = {
  message?: string;
  error?: string;
  fields?: { token?: string[]; password?: string[]; confirmPassword?: string[] };
  completed?: boolean;
};

export async function acceptInviteAction(
  _state: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
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

  const result = await acceptUserInvitation({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.success) return { error: result.message };
  return { message: result.message, completed: true };
}
