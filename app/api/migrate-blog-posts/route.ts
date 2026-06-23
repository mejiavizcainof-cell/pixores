import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "@/lib/blogPosts";
import { formatBlogContent } from "@/lib/formatBlogContent";

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
      content: formatBlogContent(post.content, post.title),
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
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
