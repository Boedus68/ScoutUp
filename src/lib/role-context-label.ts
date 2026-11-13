import { groupRoleLabel } from "@/lib/labels";
import type {
  AppRole,
  CocaGroupRole,
  ProfileGender,
  ScoutBranch,
} from "@/lib/types";

export type RoleContextInput = {
  activeRole: AppRole;
  gender: ProfileGender | null;
  groupRole: CocaGroupRole | null;
  branch: ScoutBranch | null;
  unitName: string | null;
  /** Nome sottogruppo (es. Noviziato) per membri RS. */
  subgroupName: string | null;
  /** Nomi figli collegati (genitore). */
  childNames: string[];
};

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName.trim();
}

function isNoviziato(name: string | null | undefined): boolean {
  return Boolean(name && /noviziat/i.test(name));
}

function pickGendered(
  gender: ProfileGender | null,
  male: string,
  female: string,
  neutral: string,
): string {
  if (gender === "M") return male;
  if (gender === "F") return female;
  return neutral;
}

function leaderTitle(input: RoleContextInput): string {
  // Incarichi di gruppo (Capo Gruppo, Tesoriere, Maestro dei Novizi, …).
  // `capo_unita` è generico: preferiamo il titolo di branca dell'unità attiva.
  if (input.groupRole && input.groupRole !== "capo_unita") {
    return groupRoleLabel[input.groupRole];
  }

  switch (input.branch) {
    case "LC":
      return "Capo branco";
    case "EG":
      return "Caporeparto";
    case "RS":
      return "Capo clan";
    case "COCA":
      return input.groupRole === "capo_unita"
        ? groupRoleLabel.capo_unita
        : input.unitName
          ? `Capo · ${input.unitName}`
          : "Capo";
    default:
      if (input.groupRole === "capo_unita") {
        return groupRoleLabel.capo_unita;
      }
      return input.unitName ? `Capo · ${input.unitName}` : "Capo";
  }
}

function memberTitle(input: RoleContextInput): string {
  const unit = input.unitName?.trim() || "unità";
  const g = input.gender;

  if (
    input.branch === "RS" &&
    (isNoviziato(input.subgroupName) || isNoviziato(input.unitName))
  ) {
    const role = pickGendered(g, "novizio", "novizia", "novizio/novizia");
    const place = input.subgroupName?.trim() || input.unitName?.trim() || "Noviziato";
    return `${role} · ${place}`;
  }

  switch (input.branch) {
    case "LC": {
      const role = pickGendered(g, "lupetto", "lupetta", "lupetto/lupetta");
      return `${role} · ${unit}`;
    }
    case "EG": {
      const role = pickGendered(g, "esploratore", "guida", "esploratore/guida");
      return `${role} · ${unit}`;
    }
    case "RS": {
      const role = pickGendered(g, "rover", "scolta", "rover/scolta");
      return `${role} · ${unit}`;
    }
    default:
      return unit;
  }
}

function parentTitle(input: RoleContextInput): string {
  const kids = input.childNames.map(firstName).filter(Boolean);
  const ofKids =
    kids.length === 0
      ? "di —"
      : kids.length === 1
        ? `di ${kids[0]}`
        : `di ${kids.slice(0, -1).join(", ")} e ${kids[kids.length - 1]}`;

  const who = pickGendered(input.gender, "padre", "madre", "genitore");
  return `${who} ${ofKids}`;
}

/** Etichetta ruolo contestuale per la sidebar (sotto il nome profilo). */
export function buildRoleContextLabel(input: RoleContextInput): string {
  switch (input.activeRole) {
    case "leader":
      return leaderTitle(input);
    case "member":
      return memberTitle(input);
    case "parent":
      return parentTitle(input);
    default:
      return "Scout-Up";
  }
}
