/** Which sides of the marketplace a user is on. A logged-out user is on neither. */
export function userRoles(user: { roles: string[] } | null | undefined) {
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  return { isAdvertiser, isBroadcaster, isDual: isAdvertiser && isBroadcaster };
}
