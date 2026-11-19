"use client";
import { useEffect } from "react";

/** iOS Safari ignores user-scalable=no, so pinch-zoom and double-tap zoom are blocked here too. */
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const pinch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    let last = 0;
    const dbl = (e: TouchEvent) => { const n = Date.now(); if (n - last < 300) e.preventDefault(); last = n; };
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    document.addEventListener("touchmove", pinch, { passive: false });
    document.addEventListener("touchend", dbl, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", pinch);
      document.removeEventListener("touchend", dbl);
    };
  }, []);
  return null;
}
