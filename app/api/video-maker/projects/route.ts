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

function applyProjectScope<T>(query: T, userId: string | null) {
  const scopedQuery = query as T & {
    eq: (column: string, value: string) => T;
    is: (column: string, value: null) => T;
  };

  return userId ? scopedQuery.eq("user_id", userId) : scopedQuery.is("user_id", null);
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = await getOptionalUserId(request);
    const query = supabaseAdmin
      .from("video_projects")
      .select("id,user_id,title,project,thumbnail_url,created_at,updated_at")
      .order("updated_at", { ascending: false });
    const { data, error } = await applyProjectScope(query, userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: (data || []) as VideoProjectRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load video projects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = await getOptionalUserId(request);
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const thumbnailUrl = typeof body?.thumbnail_url === "string" ? body.thumbnail_url : null;
    const project = body?.project;

    if (!title) {
      return NextResponse.json({ error: "Project title is required." }, { status: 400 });
    }

    if (!validatePixoresProject(project)) {
      return NextResponse.json({ error: "Valid PixoresVideoProject JSON is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("video_projects")
      .insert({
        user_id: userId,
        title,
        project,
        thumbnail_url: thumbnailUrl,
      })
      .select("id,user_id,title,project,thumbnail_url,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data as VideoProjectRow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save video project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
