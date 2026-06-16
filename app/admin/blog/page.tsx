"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  const loadPosts = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Please login first.");
      return;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,title,slug,published,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setPosts(data || []);
  };

  const deletePost = async (id: string) => {
    const confirmDelete = confirm("Delete this blog post?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Blog Admin</h1>

        <Link href="/admin/blog/new">
          <button
            style={{
              padding: "10px 14px",
              background: "#2563EB",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + New Post
          </button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <p>No blog posts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: "14px",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                background: "#FFF",
              }}
            >
              <strong>{post.title}</strong>

              <p style={{ margin: "6px 0", color: "#64748B" }}>
                /blog/{post.slug}
              </p>

              <p>{post.published ? "Published" : "Draft"}</p>

              <div style={{ display: "flex", gap: "8px" }}>
                <Link href={`/blog/${post.slug}`} target="_blank">
                  <button style={viewButton}>View</button>
                </Link>

                <Link href={`/admin/blog/edit/${post.id}`}>
                  <button style={editButton}>Edit</button>
                </Link>

                <button onClick={() => deletePost(post.id)} style={deleteButton}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const viewButton: React.CSSProperties = {
  padding: "8px 12px",
  background: "#0F172A",
  color: "#FFF",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const editButton: React.CSSProperties = {
  padding: "8px 12px",
  background: "#F59E0B",
  color: "#FFF",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const deleteButton: React.CSSProperties = {
  padding: "8px 12px",
  background: "#DC2626",
  color: "#FFF",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};