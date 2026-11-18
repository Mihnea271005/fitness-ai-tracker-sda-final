"use client";

import { useEffect } from "react";

/**
 * Scrolls to `#id` once this renders, if the URL asks for it. A client-side navigation to
 * /progress#goals can't scroll by itself: the section streams in after the navigation ends.
 */
export function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);
  return null;
}
