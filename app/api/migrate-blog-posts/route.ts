import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "@/lib/blogPosts";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const postsToInsert = blogPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      cover_image: post.image,
      content: post.content
        .replace(/\[IMAGE:\s*(.*?)\]/g, (_match, fileName) => {
          return `<img src="/blog/${fileName}" style="width:100%;max-width:800px;display:block;margin:24px auto;border-radius:12px;" />`;
        })
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return "";
          if (trimmed.startsWith("<img")) return trimmed;
          return `<p>${trimmed}</p>`;
        })
        .join(""),
      published: true,
    }));

    const { data, error } = await supabase
      .from("blog_posts")
      .upsert(postsToInsert, { onConflict: "slug" })
      .select("id,title,slug");

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      migrated: data?.length || 0,
      posts: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}