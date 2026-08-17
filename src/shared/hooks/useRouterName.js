"use client";

import { create } from "zustand";
import { APP_CONFIG } from "@/shared/constants/config";

/**
 * Global store for custom router name.
 * Falls back to APP_CONFIG.name when no custom name is set.
 */
const useRouterNameStore = create((set) => ({
  customName: "",
  setCustomName: (name) => set({ customName: name }),
}));

/**
 * Hook to get the display name of the router.
 * Returns customName if set, otherwise APP_CONFIG.name.
 */
export function useRouterName() {
  const customName = useRouterNameStore((s) => s.customName);
  return customName || APP_CONFIG.name;
}

/**
 * Hook to get/set the custom router name (for settings page).
 */
export function useRouterNameSettings() {
  const customName = useRouterNameStore((s) => s.customName);
  const setCustomName = useRouterNameStore((s) => s.setCustomName);
  return { customName, setCustomName };
}

export default useRouterNameStore;
