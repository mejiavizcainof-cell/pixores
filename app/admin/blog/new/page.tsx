"use client";

import { useRef, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

export default function NewBlogPostPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [published, setPublished] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: "<p>Write your blog post here...</p>",
  });

  const createSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

  const uploadImageFile = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      alert("Please login first.");
      return;
    }

    const formData = new FormData();
    formData.set("category", "blog");
    formData.set("name", file.name);
    formData.set("alt_text", file.name.replace(/\.[^/.]+$/, ""));
    formData.set("metadata", "{}");
    formData.set("file", file);

    const response = await fetch("/api/admin/assets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Image upload failed.");
      return;
    }

    const imageUrl = result.asset?.preview_url || result.asset?.original_url;
    if (!imageUrl) return;

 editor
  ?.chain()
  .focus()
  .insertContent(`
    <img
      src="${imageUrl}"
      alt="${file.name}"
      title="${file.name}"
      style="width:100%;max-width:800px;display:block;margin:20px auto;border-radius:12px;"
    />
  `)
  .run();

    if (!coverImage) {
      setCoverImage(imageUrl);
    }
  };

  const handlePasteImage = async (
    event: React.ClipboardEvent<HTMLDivElement>
  ) => {
    const items = event.clipboardData.items;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) return;

        event.preventDefault();
        await uploadImageFile(file);
        return;
      }
    }
  };

  const addImage = () => {
    const url = prompt("Image URL:");
    if (!url) return;

    editor?.chain().focus().setImage({ src: url }).run();

    if (!coverImage) {
      setCoverImage(url);
    }
  };

  const savePost = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Please login first.");
      return;
    }

    if (!title || !description || !editor) {
      alert("Title, description and content are required.");
      return;
    }

    const slug = createSlug(title);

    const { error } = await supabase.from("blog_posts").insert({
      user_id: userData.user.id,
      title,
      slug,
      description,
      cover_image: coverImage,
      content: editor.getHTML(),
      published,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Post saved successfully.");
    window.location.href = "/admin/blog";
  };

  return (
    <AdminGuard>
    <main style={{ maxWidth: "900px", margin: "40px auto", padding: "20px" }}>
      <h1>New Blog Post</h1>

      <input
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />

      <textarea
        placeholder="SEO description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: "90px" }}
      />

      <input
        placeholder="Cover image URL"
        value={coverImage}
        onChange={(e) => setCoverImage(e.target.value)}
        style={inputStyle}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImageFile(file);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={toolbarButton}
        >
          Upload Image
        </button>

 

        <button onClick={addImage} style={toolbarButton}>
          Add Image URL
        </button>

        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          style={toolbarButton}
        >
          Bold
        </button>

        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          style={toolbarButton}
        >
          Italic
        </button>

        <button
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          style={toolbarButton}
        >
          H2
        </button>
      </div>

      <div
        onPaste={handlePasteImage}
        style={{
          minHeight: "360px",
          border: "1px solid #CBD5E1",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          background: "#FFF",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <label style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Publish now
      </label>

      <button
        onClick={savePost}
        style={{
          padding: "12px 18px",
          background: "#2563EB",
          color: "#FFF",
          border: "none",
          borderRadius: "8px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Save Post
      </button>
    </main>
    </AdminGuard>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  marginBottom: "12px",
};

const toolbarButton: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};
