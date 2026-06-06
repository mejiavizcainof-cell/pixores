"use client";

import React from "react";

interface ImageUploaderProps {
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  title: string;
  accept: string;
}

export default function ImageUploader({
  onChange,
  title,
  accept,
}: ImageUploaderProps) {
  return (
    <label
      htmlFor="image-upload"
      style={{
        display: "block",
        border: "2px dashed #2563EB",
        borderRadius: "16px",
        padding: "60px 30px",
        textAlign: "center",
        marginBottom: "30px",
        backgroundColor: "#F8FAFC",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          fontSize: "60px",
          marginBottom: "15px",
        }}
      >
        📤
      </div>

      <h2
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          marginBottom: "10px",
          color: "#0F172A",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: "18px",
          color: "#475569",
          marginBottom: "12px",
        }}
      >
        Click here to upload your image
      </p>

      <p
        style={{
          color: "#64748B",
          fontSize: "14px",
        }}
      >
        JPG • PNG • WebP • HEIC
      </p>

      <p
        style={{
          color: "#94A3B8",
          fontSize: "13px",
          marginTop: "10px",
        }}
      >
        You can also drag and drop your file here
      </p>

      <input
        id="image-upload"
        type="file"
        accept={accept}
        onChange={onChange}
        style={{
          display: "none",
        }}
      />
    </label>
  );
}