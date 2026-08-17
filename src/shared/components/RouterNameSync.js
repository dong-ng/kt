"use client";

import { useEffect } from "react";
import { useRouterNameSettings } from "@/shared/hooks/useRouterName";

/**
 * Syncs the custom router name from the server settings into
 * the client-side Zustand store. Drop this component anywhere
 * in the tree that needs the name to be available.
 */
export default function RouterNameSync() {
  const { setCustomName } = useRouterNameSettings();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.customName) setCustomName(data.customName);
      })
      .catch(() => {});
  }, [setCustomName]);

  return null;
}
