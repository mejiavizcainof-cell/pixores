import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { PixoresVideoProject } from "@/src/video-render/types";

export const runtime = "nodejs";

type VideoProjectRow = {
  id: string;
  user_id: string | null;
  title: string;
  project: PixoresVideoProject;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

async function getOptionalUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}

function validatePixoresProject(project: unknown): project is PixoresVideoProject {
  if (!project || typeof project !== "object") return false;
  const candidate = project as Partial<PixoresVideoProject>;
  return candidate.schemaVersion === 1
    && Boolean(candidate.canvas)
    && Number.isFinite(candidate.canvas?.width)
    && Number.isFinite(candidate.canvas?.height)
    && Number.isFinite(candidate.duration)
    && Array.isArray(candidate.layers)
    && Array.isArray(candidate.assets);
}

function scopeVideoProjectQuery<T>(query: T, userId: string | null) {
  const scopedQuery = query as T & {
    eq: (column: string, value: string) => T;
    is: (column: string, value: null) => T;
  };

  return userId ? scopedQuery.eq("user_id", userId) : scopedQuery.is("user_id", null);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = await getOptionalUserId(request);
    const { id } = await context.params;
    const query = supabaseAdmin
      .from("video_projects")
      .select("id,user_id,title,project,thumbnail_url,created_at,updated_at")
      .eq("id", id);
    const { data, error } = await scopeVideoProjectQuery(query, userId).single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ project: data as VideoProjectRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load video project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = await getOptionalUserId(request);
    const { id } = await context.params;
    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }

    if ("thumbnail_url" in body) {
      updates.thumbnail_url = typeof body.thumbnail_url === "string" ? body.thumbnail_url : null;
    }

    if ("project" in body) {
      if (!validatePixoresProject(body.project)) {
        return NextResponse.json({ error: "Valid PixoresVideoProject JSON is required." }, { status: 400 });
      }
      updates.project = body.project;
    }

    if (!updates.title && !updates.project && !("thumbnail_url" in updates)) {
      return NextResponse.json({ error: "No project changes were provided." }, { status: 400 });
    }

    const query = supabaseAdmin
      .from("video_projects")
      .update(updates)
      .eq("id", id);
    const { data, error } = await scopeVideoProjectQuery(query, userId)
      .select("id,user_id,title,project,thumbnail_url,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data as VideoProjectRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update video project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = await getOptionalUserId(request);
    const { id } = await context.params;
    const query = supabaseAdmin
      .from("video_projects")
      .delete()
      .eq("id", id);
    const { error } = await scopeVideoProjectQuery(query, userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete video project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
