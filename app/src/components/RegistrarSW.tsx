"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para o app ser instalável e abrir offline). */
export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
