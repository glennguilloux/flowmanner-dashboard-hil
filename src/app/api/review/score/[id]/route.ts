import { NextResponse } from "next/server";
import { isUnauthorized } from "@/lib/auth";
import { scoreTactic } from "@/lib/review";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tacticId } = await params;
  const result = await scoreTactic(tacticId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Tactic not found" ? 404 : 502 },
    );
  }

  return NextResponse.json(result);
}
