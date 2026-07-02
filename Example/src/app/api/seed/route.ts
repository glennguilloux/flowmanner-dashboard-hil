import { NextResponse } from "next/server";
import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
