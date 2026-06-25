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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (body?.project_data && typeof body.project_data === "object") {
      updates.project_data = normalizeStudioProjectData(body.project_data);
    }

    if ("thumbnail" in body) {
      updates.thumbnail = typeof body.thumbnail === "string" ? body.thumbnail : null;
    }

    if (!updates.project_data && !updates.name && !("thumbnail" in updates)) {
      return NextResponse.json({ error: "No project changes were provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id,user_id,name,project_data,thumbnail,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await context.params;
    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
