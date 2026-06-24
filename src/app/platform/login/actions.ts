"use server";

import { redirect } from "next/navigation";
import { authenticatePlatform } from "@/lib/auth/platform-login";

export type PlatformLoginActionState = {
  message?: string;
  fields?: { email?: string[]; password?: string[] };
};

export async function platformLoginAction(
  _previousState: PlatformLoginActionState,
  formData: FormData,
): Promise<PlatformLoginActionState> {
  const result = await authenticatePlatform(formData);
  if (result.success) redirect("/platform");
  return { message: result.message, fields: result.fields };
}
