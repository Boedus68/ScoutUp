"use client";

import { useEffect, useState } from "react";
import { flushAttendanceQueue } from "@/lib/offline-sync";

export function PwaRegister() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      void flushAttendanceQueue().then((n) => setPending(n));
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore SW errors in dev */
      });
    }

    void flushAttendanceQueue().then((n) => setPending(n));

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-lg rounded-md px-3 py-2 text-center text-sm shadow-md md:left-auto ${
        online
          ? "border border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border border-amber-300 bg-amber-50 text-amber-950"
      }`}
      role="status"
    >
      {online
        ? pending > 0
          ? `Sincronizzazione offline: ${pending} modifiche in coda…`
          : null
        : "Sei offline. Registro e schede sanitarie restano disponibili dalla cache locale; le modifiche andranno in coda."}
    </div>
  );
}
