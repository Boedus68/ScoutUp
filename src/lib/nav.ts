import type { AppRole, NavItem } from "@/lib/types";

export function navItemsForRole(role: AppRole): NavItem[] {
  switch (role) {
    case "leader":
      return [
        { href: "/dashboard/staff", label: "Panoramica" },
        { href: "/dashboard/staff/calendario", label: "Calendario" },
        { href: "/dashboard/staff/events/new", label: "Nuova uscita" },
        { href: "/dashboard/staff/unita", label: "Unità" },
        { href: "/dashboard/staff/anagrafica", label: "Anagrafica" },
        { href: "/dashboard/staff/fascicolo-sicurezza", label: "Fascicolo sicurezza" },
      ];
    case "parent":
      return [
        { href: "/dashboard/parent", label: "Figli e uscite" },
        { href: "/dashboard/parent/sanitaria", label: "Scheda sanitaria" },
        { href: "/dashboard/parent/anagrafica", label: "Anagrafica" },
      ];
    case "member":
      return [
        { href: "/dashboard/member", label: "Calendario" },
        { href: "/dashboard/member/profilo", label: "Il mio profilo" },
      ];
    default:
      return [{ href: "/dashboard", label: "Home" }];
  }
}
