import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, tactics, brainDump, agents, skills } from "@/db/schema";
import { or, ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

type SearchResult = {
  type: "goal" | "tactic" | "brain-dump" | "agent" | "skill";
  id: string;
  title: string;
  subtitle: string | null;
};

const MAX_PER_TYPE = 5;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const pattern = `%${q}%`;

  // Run all searches in parallel
  const [goalRows, tacticRows, brainDumpRows, agentRows, skillRows] =
    await Promise.all([
      db
        .select({
          id: goals.id,
          title: goals.title,
          status: goals.status,
        })
        .from(goals)
        .where(ilike(goals.title, pattern))
        .limit(MAX_PER_TYPE),

      db
        .select({
          id: tactics.id,
          title: tactics.title,
          status: tactics.status,
          source: tactics.source,
        })
        .from(tactics)
        .where(
          or(ilike(tactics.title, pattern), ilike(tactics.description, pattern)),
        )
        .limit(MAX_PER_TYPE),

      db
        .select({
          id: brainDump.id,
          content: brainDump.content,
          status: brainDump.status,
        })
        .from(brainDump)
        .where(ilike(brainDump.content, pattern))
        .limit(MAX_PER_TYPE),

      db
        .select({
          id: agents.id,
          name: agents.name,
          role: agents.role,
        })
        .from(agents)
        .where(
          or(ilike(agents.name, pattern), ilike(agents.role, pattern)),
        )
        .limit(MAX_PER_TYPE),

      db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
        })
        .from(skills)
        .where(
          or(ilike(skills.name, pattern), ilike(skills.description, pattern)),
        )
        .limit(MAX_PER_TYPE),
    ]);

  const results: SearchResult[] = [
    ...goalRows.map((g) => ({
      type: "goal" as const,
      id: g.id,
      title: g.title,
      subtitle: g.status,
    })),
    ...tacticRows.map((t) => ({
      type: "tactic" as const,
      id: t.id,
      title: t.title,
      subtitle: `${t.source} · ${t.status}`,
    })),
    ...brainDumpRows.map((b) => ({
      type: "brain-dump" as const,
      id: b.id,
      title: b.content.length > 80 ? b.content.slice(0, 80) + "…" : b.content,
      subtitle: b.status,
    })),
    ...agentRows.map((a) => ({
      type: "agent" as const,
      id: a.id,
      title: a.name,
      subtitle: a.role,
    })),
    ...skillRows.map((s) => ({
      type: "skill" as const,
      id: s.id,
      title: s.name,
      subtitle: s.description.length > 60 ? s.description.slice(0, 60) + "…" : s.description,
    })),
  ];

  return NextResponse.json({ ok: true, data: results });
}
