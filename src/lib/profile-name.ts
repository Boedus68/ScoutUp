/** Split full_name → nome / cognome (primo token = nome). */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}

export function joinFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

/** Preferisce first/last se presenti, altrimenti split di full_name. */
export function displayNameParts(profile: {
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
}): { firstName: string; lastName: string } {
  if (profile.first_name || profile.last_name) {
    return {
      firstName: profile.first_name?.trim() ?? "",
      lastName: profile.last_name?.trim() ?? "",
    };
  }
  return splitFullName(profile.full_name);
}
