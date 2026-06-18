"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [published, setPublished] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: "",
  });

  const loadPost = async () => {
    if (!editor) return;

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      alert("Post not found");
      return;
    }

    setTitle(data.title || "");
    setDescription(data.description || "");
    setCoverImage(data.cover_image || "");
    setPublished(Boolean(data.published));
    editor.commands.setContent(data.content || "");
  };

  const uploadImageFile = async (file: File) => {
    if (!editor) return;

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
      .chain()
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
  };

  const loadedRef = useRef(false);

useEffect(() => {
  if (!editor) return;
  if (loadedRef.current) return;

  loadedRef.current = true;
  loadPost();
}, [editor]);

  useEffect(() => {
    const handleWindowPaste = async (event: ClipboardEvent) => {
      if (!editor) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith("image/")
      );

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      await uploadImageFile(file);
    };

    window.addEventListener("paste", handleWindowPaste, true);

    return () => {
      window.removeEventListener("paste", handleWindowPaste, true);
    };
  }, [editor]);

  const addImage = () => {
    if (!editor) return;

    const url = prompt("Image URL:");
    if (!url) return;

    editor
      .chain()
      .focus()
      .insertContent(`
        <img
          src="${url}"
          style="width:100%;max-width:800px;display:block;margin:20px auto;border-radius:12px;"
        />
      `)
      .run();
  };

  const updatePost = async () => {
    if (!editor) return;

    const { error } = await supabase
      .from("blog_posts")
      .update({
        title,
        description,
        cover_image: coverImage,
        content: editor.getHTML(),
        published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Post updated successfully.");
    router.push("/admin/blog");
  };

  return (
    <AdminGuard>
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1>Edit Blog Post</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={inputStyle}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        style={{
          ...inputStyle,
          minHeight: "120px",
        }}
      />

      <input
        value={coverImage}
        onChange={(e) => setCoverImage(e.target.value)}
        placeholder="Cover image URL"
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
        style={{
          border: "1px solid #CBD5E1",
          borderRadius: "12px",
          minHeight: "400px",
          padding: "16px",
          marginBottom: "20px",
          background: "#FFFFFF",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <label
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published
      </label>

      <button
        onClick={updatePost}
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
        Save Changes
      </button>
    </main>
    </AdminGuard>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
};

const toolbarButton: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};
