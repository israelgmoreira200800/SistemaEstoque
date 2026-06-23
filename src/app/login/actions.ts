"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/login";

export type LoginActionState = {
  message?: string;
  fields?: { email?: string[]; password?: string[] };
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = await authenticate(formData);
  if (result.success) redirect("/dashboard");
  return { message: result.message, fields: result.fields };
}

