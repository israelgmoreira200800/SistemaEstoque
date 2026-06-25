export function canAccessCompany(status: string, subscriptionStatus?: string | null) {
  const companyAllowsAccess = status === "ACTIVE" || status === "TRIAL";
  if (!companyAllowsAccess) return false;
  if (!subscriptionStatus) return true;

  return subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING";
}
