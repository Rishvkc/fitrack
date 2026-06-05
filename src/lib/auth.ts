import { NextRequest } from "next/server";

export function verifyShortcutAuth(request: NextRequest): boolean {
  const secret = process.env.SHORTCUT_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  return auth.slice(7) === secret;
}
