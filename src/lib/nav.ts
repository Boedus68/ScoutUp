import type { AppRole, NavItem, ScoutBranch } from "@/lib/types";

export function navItemsForRole(
  role: AppRole,
  branch?: ScoutBranch | null,
): NavItem[] {
  switch (role) {
    case "leader":
      if (branch === "COCA") {
        return [
          { href: "/dashboard/staff", label: "Panoramica Co.Ca." },
          { href: "/dashboard/staff/calendario", label: "Appuntamenti Co.Ca." },
          { href: "/dashboard/staff/events/new", label: "Nuovo appuntamento" },
          {
            href: "/dashboard/staff/percorso-formativo",
            label: "Il Mio Percorso Formativo",
          },
          { href: "/dashboard/staff/bacheca", label: "Bacheca & Documenti" },
          { href: "/dashboard/staff/materiali", label: "Documenti Co.Ca." },
          { href: "/dashboard/staff/cassa", label: "Cassa di Gruppo" },
          { href: "/dashboard/staff/unita", label: "Comunità Capi" },
        ];
      }
      return [
        { href: "/dashboard/staff", label: "Panoramica" },
        { href: "/dashboard/staff/calendario", label: "Calendario" },
        { href: "/dashboard/staff/events/new", label: "Nuova uscita" },
        { href: "/dashboard/staff/bacheca", label: "Bacheca" },
        { href: "/dashboard/staff/materiali", label: "Materiali" },
        { href: "/dashboard/staff/cassa", label: "Cassa" },
        { href: "/dashboard/staff/unita", label: "Unità" },
        { href: "/dashboard/staff/anagrafica", label: "Anagrafica" },
        { href: "/dashboard/staff/progressione", label: "Progressione" },
        {
          href: "/dashboard/staff/fascicolo-sicurezza",
          label: "Fascicolo sicurezza",
        },
      ];
    case "parent":
      return [
        { href: "/dashboard/parent", label: "Figli e uscite" },
        { href: "/dashboard/parent/bacheca", label: "Bacheca" },
        { href: "/dashboard/parent/quote", label: "Quote" },
        { href: "/dashboard/parent/sanitaria", label: "Scheda sanitaria" },
        { href: "/dashboard/parent/anagrafica", label: "Anagrafica" },
      ];
    case "member":
      return [
        { href: "/dashboard/member", label: "Calendario" },
        { href: "/dashboard/member/bacheca", label: "Bacheca" },
        { href: "/dashboard/member/quote", label: "Quote" },
        { href: "/dashboard/member/progressione", label: "Progressione" },
        { href: "/dashboard/member/profilo", label: "Il mio profilo" },
      ];
    default:
      return [{ href: "/dashboard", label: "Home" }];
  }
}
