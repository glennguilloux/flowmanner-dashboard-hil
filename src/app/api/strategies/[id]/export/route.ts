import { NextResponse } from "next/server";
import { isUnauthorized } from "@/lib/auth";
import { exportStrategyToYaml } from "@/lib/yaml-strategy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yaml = await exportStrategyToYaml(id);
  if (!yaml) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  return new NextResponse(yaml, {
    headers: {
      "Content-Type": "application/x-yaml",
      "Content-Disposition": `attachment; filename="strategy-${id}.yaml"`,
    },
  });
}
