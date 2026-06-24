export function canAccessCompany(status: string) {
  return status === "ACTIVE" || status === "TRIAL";
}
