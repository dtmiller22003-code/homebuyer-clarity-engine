/** Normalize legacy `agent` role to internal loan officer. */
export function normalizeStaffRole(role: string): string {
  if (role === "agent") return "loan_officer";
  return role;
}

export function isAdminRole(role: string): boolean {
  return normalizeStaffRole(role) === "admin";
}

export function isRealtorPartnerRole(role: string): boolean {
  return role === "realtor_partner";
}

/** Admin or loan officer (including legacy `agent`): full internal dashboard. */
export function isInternalStaffRole(role: string): boolean {
  const n = normalizeStaffRole(role);
  return n === "admin" || n === "loan_officer";
}
