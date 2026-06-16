"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated successfully.");
    window.location.href = "/";
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "80px auto",
        padding: "24px",
      }}
    >
      <h1>Reset Password</h1>

      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "12px",
        }}
      />

      <button
        onClick={updatePassword}
        style={{
          width: "100%",
          padding: "12px",
          background: "#2563EB",
          color: "#FFF",
          border: "none",
          borderRadius: "8px",
        }}
      >
        Update Password
      </button>
    </div>
  );
}