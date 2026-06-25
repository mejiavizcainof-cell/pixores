import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeStudioProjectData } from "@/lib/studioProject";

export const runtime = "nodejs";

async function getAuthorizedUser(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id,user_id,name,project_data,thumbnail,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load projects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const projectData = body?.project_data;
    const thumbnail = typeof body?.thumbnail === "string" ? body.thumbnail : null;

    if (!name) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    if (!projectData || typeof projectData !== "object") {
      return NextResponse.json({ error: "Project data is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: user.id,
        name,
        project_data: normalizeStudioProjectData(projectData),
        thumbnail,
      })
      .select("id,user_id,name,project_data,thumbnail,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
