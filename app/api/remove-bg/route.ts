import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Login required" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: creditRow } = await supabaseServer
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (!creditRow) {
      await supabaseServer.from("user_credits").insert({
        user_id: userId,
        credits: 5,
      });
    }

    const currentCredits = creditRow?.credits ?? 5;

   if (currentCredits <= 0) {
  return NextResponse.json(
    {
      success: false,
      error: "NO_CREDITS",
      creditsRemaining: 0,
    },
    { status: 403 }
  );
}

    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No imageBase64 received" },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const imageBuffer = Buffer.from(cleanBase64, "base64");

    const formData = new FormData();
    formData.append(
      "image_file",
      new Blob([imageBuffer], { type: "image/png" }),
      "image.png"
    );
    formData.append("size", "auto");
    formData.append("format", "png");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
       "X-Api-Key": "Pho3SwP32RjE7aW6KEtsoPzY",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        { success: false, status: response.status, error: errorText },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString("base64");

    await supabaseServer
      .from("user_credits")
      .update({
        credits: currentCredits - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${resultBase64}`,
      creditsRemaining: currentCredits - 1,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Server error removing background" },
      { status: 500 }
    );
  }
}