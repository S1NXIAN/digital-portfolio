"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPanel from "@/components/admin/AdminPanel";
import CustomCursor from "@/components/CustomCursor";
import CursorGlow from "@/components/CursorGlow";
import LiveBackground from "@/components/LiveBackground";
import Portfolio from "@/components/Portfolio";

type View = "site" | "admin";

export default function Home() {
  const [view, setView] = useState<View>("site");

  useEffect(() => {
    const sync = () => setView(window.location.hash === "#admin" ? "admin" : "site");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const openAdmin = useCallback(() => {
    window.location.hash = "admin";
  }, []);

  const exitAdmin = useCallback(() => {
    history.replaceState(null, "", window.location.pathname);
    setView("site");
    requestAnimationFrame(() => {
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    });
  }, []);

  return (
    <>
      <LiveBackground />
      <CursorGlow />
      <CustomCursor />
      {view === "admin" ? (
        <AdminPanel onExit={exitAdmin} />
      ) : (
        <Portfolio onOpenAdmin={openAdmin} />
      )}
    </>
  );
}
