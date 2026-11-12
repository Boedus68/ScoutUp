"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/types";

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Deduplicate by href+label while keeping order
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = `${item.href}::${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <nav className="space-y-1">
      {unique.map((item) => {
        const exactRoots = new Set([
          "/dashboard/staff",
          "/dashboard/parent",
          "/dashboard/member",
        ]);
        const active = exactRoots.has(item.href)
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--forest)] text-white"
                : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
