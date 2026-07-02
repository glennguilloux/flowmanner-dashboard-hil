import { NextResponse } from "next/server";
import { getSessionRitual } from "@/lib/session-ritual";

export const dynamic = "force-dynamic";

export async function GET() {
  const ritual = await getSessionRitual();
  return NextResponse.json(ritual);
}
