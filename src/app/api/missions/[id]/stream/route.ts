import { streamMission } from "@/lib/fm-missions";

export const dynamic = "force-dynamic";

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

const ERROR_EVENT =
  'data: {"type":"error","message":"FM backend unreachable"}\n\n';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const stream = await streamMission(id);

  if (!stream) {
    return new Response(ERROR_EVENT, { headers: SSE_HEADERS });
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
