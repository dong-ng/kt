import { NextResponse } from "next/server";
import { createProviderConnection, getProviderConnections } from "@/models";

export const dynamic = "force-dynamic";

function connectionIdentity(connection) {
  const providerData = connection.providerSpecificData || {};
  return providerData.chatgptAccountId
    || providerData.githubLogin
    || providerData.userId
    || providerData.profileArn
    || providerData.username
    || connection.email
    || connection.apiKey
    || connection.refreshToken
    || connection.accessToken
    || connection.name
    || "";
}

function connectionKey(connection) {
  return `${connection.provider}:${connectionIdentity(connection)}`;
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const expectedProvider = searchParams.get("provider")?.trim();
    const body = await request.json();
    const incoming = body?.connections;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: "No connections to import" }, { status: 400 });
    }

    if (expectedProvider && incoming.some((connection) => connection?.provider !== expectedProvider)) {
      return NextResponse.json(
        { error: `This file contains accounts outside provider '${expectedProvider}'` },
        { status: 400 },
      );
    }

    const existing = await getProviderConnections();
    const existingKeys = new Set(existing.map(connectionKey));
    const results = [];
    let imported = 0;
    let skipped = 0;

    for (const connection of incoming) {
      if (!connection?.provider || !connectionIdentity(connection)) {
        results.push({ provider: connection?.provider || "unknown", status: "skipped", reason: "missing identity" });
        skipped += 1;
        continue;
      }

      const key = connectionKey(connection);
      if (existingKeys.has(key)) {
        results.push({ provider: connection.provider, name: connection.name, status: "skipped", reason: "duplicate" });
        skipped += 1;
        continue;
      }

      try {
        await createProviderConnection({
          provider: connection.provider,
          authType: connection.authType || "oauth",
          name: connection.name || null,
          email: connection.email || null,
          displayName: connection.displayName || null,
          isActive: connection.isActive !== false,
          priority: connection.priority || null,
          globalPriority: connection.globalPriority || null,
          defaultModel: connection.defaultModel || null,
          expiresAt: connection.expiresAt || null,
          expiresIn: connection.expiresIn || null,
          tokenType: connection.tokenType || null,
          scope: connection.scope || null,
          projectId: connection.projectId || null,
          apiKey: connection.apiKey || null,
          accessToken: connection.accessToken || null,
          refreshToken: connection.refreshToken || null,
          idToken: connection.idToken || null,
          providerSpecificData: connection.providerSpecificData || {},
          testStatus: "unknown",
        });
        existingKeys.add(key);
        results.push({ provider: connection.provider, name: connection.name, status: "imported" });
        imported += 1;
      } catch (error) {
        results.push({ provider: connection.provider, name: connection.name, status: "error", reason: error.message });
        skipped += 1;
      }
    }

    return NextResponse.json({ imported, skipped, total: incoming.length, results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
