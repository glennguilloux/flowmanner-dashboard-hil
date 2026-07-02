import { NextRequest, NextResponse } from "next/server";
import { getProjectsByGoal, createProject } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getProjectsByGoal(id);
  return NextResponse.json({ ok: true, data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low";
    color?: string;
    tags?: string[];
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const project = await createProject(id, {
    title: body.title.trim(),
    description: body.description,
    priority: body.priority,
    color: body.color,
    tags: body.tags,
  });

  return NextResponse.json({ ok: true, data: project });
}
