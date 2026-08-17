import { NextResponse } from "next/server";
import { getProviderConnections } from "@/models";

export const dynamic = "force-dynamic";

const EXPORTED_FIELDS = [
  "provider", "authType", "name", "email", "displayName", "isActive",
  "priority", "globalPriority", "defaultModel", "expiresAt", "expiresIn",
  "tokenType", "scope", "projectId", "providerSpecificData",
  "apiKey", "accessToken", "refreshToken", "idToken",
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider")?.trim();
    const connectionId = searchParams.get("connectionId")?.trim();
    const connections = await getProviderConnections();
    const filtered = connectionId
      ? connections.filter((connection) => connection.id === connectionId)
      : provider
        ? connections.filter((connection) => connection.provider === provider)
        : connections;

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: filtered.length,
      connections: filtered.map((connection) => Object.fromEntries(
        EXPORTED_FIELDS
          .filter((field) => connection[field] !== undefined)
          .map((field) => [field, connection[field]]),
      )),
    };

    const filenameSource = connectionId && filtered[0]
      ? filtered[0].email || filtered[0].name || filtered[0].provider
      : provider || "all";
    const filenamePart = filenameSource.replace(/[^a-zA-Z0-9@._-]/g, "_");
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ktrouter-${filenamePart}-${Date.now()}.json"`,
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
