import {
  resolveAntigravityCliVersion,
  resolveAntigravityIdeVersion,
} from "./antigravityVersion.js";

export const ANTIGRAVITY_CLIENT_PROFILE_VALUES = ["ide", "cli"];
export const DEFAULT_ANTIGRAVITY_CLIENT_PROFILE = "ide";

export function normalizeAntigravityClientProfile(value) {
  return value === "cli" ? "cli" : DEFAULT_ANTIGRAVITY_CLIENT_PROFILE;
}

export function getAntigravityClientProfile(credentials) {
  return normalizeAntigravityClientProfile(credentials?.providerSpecificData?.clientProfile);
}

export function resolveAntigravityClientVersion(profile) {
  return profile === "cli"
    ? resolveAntigravityCliVersion()
    : resolveAntigravityIdeVersion();
}
