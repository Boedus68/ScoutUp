import type { AppRole, NavItem } from "@/lib/types";

export function navItemsForRole(role: AppRole): NavItem[] {
  switch (role) {
    case "leader":
      return [
        { href: "/dashboard/staff", label: "Panoramica" },
        { href: "/dashboard/staff/unita", label: "Unità" },
        { href: "/dashboard/staff/events/new", label: "Nuova uscita" },
        { href: "/dashboard/staff", label: "Uscite e Presenze" },
        { href: "/dashboard/staff/anagrafica", label: "Anagrafica" },
      ];
    case "parent":
      return [
        { href: "/dashboard/parent", label: "Panoramica" },
        { href: "/dashboard/parent", label: "Figli e uscite" },
        { href: "/dashboard/parent/anagrafica", label: "Anagrafica" },
      ];
    case "member":
      return [
        { href: "/dashboard/member", label: "Panoramica" },
        { href: "/dashboard/member", label: "Calendario" },
        { href: "/dashboard/member/profilo", label: "Il mio profilo" },
      ];
    default:
      return [{ href: "/dashboard", label: "Home" }];
  }
}
