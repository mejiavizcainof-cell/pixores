"use client";

import React from "react";

type Layer = {
  id: number;
  type: "text" | "image";
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isUppercase?: boolean;
};

interface ToolbarProps {
  selectedLayer: Layer;
  onChange: (updatedFields: Partial<Layer>) => void;
}

export default function Toolbar({ selectedLayer, onChange }: ToolbarProps) {
  if (selectedLayer.type !== "text") return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#FFFFFF",
      padding: "6px 16px",
      borderRadius: "30px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      border: "1px solid #E2E8F0",
      width: "fit-content",
      margin: "0 auto 16px auto",
    }}>
      {/* Selector de Fuente */}
      <select
        value={selectedLayer.fontFamily}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        style={{ border: "none", background: "none", fontSize: "14px", fontWeight: 500, outline: "none", cursor: "pointer", paddingRight: "8px" }}
      >
        <option value="Arial">Arial</option>
        <option value="Impact">Impact</option>
        <option value="Oswald">Oswald</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Bebas Neue">Bebas Neue</option>
      </select>

      <span style={{ color: "#E2E8F0" }}>|</span>

      {/* Control de Tamaño (- VALUE +) */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button 
          onClick={() => onChange({ fontSize: Math.max(12, (selectedLayer.fontSize || 40) - 4) })}
          style={{ border: "none", background: "none", width: "24px", height: "24px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
        >
          -
        </button>
        <span style={{ fontSize: "14px", fontWeight: 600, minWidth: "24px", textAlign: "center" }}>
          {selectedLayer.fontSize}
        </span>
        <button 
          onClick={() => onChange({ fontSize: (selectedLayer.fontSize || 40) + 4 })}
          style={{ border: "none", background: "none", width: "24px", height: "24px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
        >
          +
        </button>
      </div>

      <span style={{ color: "#E2E8F0" }}>|</span>

      {/* Selector de Color Integrado (Estilo Canva Arcoíris) */}
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
        <span style={{ fontSize: "16px", fontWeight: "bold", textDecoration: "underline", textDecorationColor: selectedLayer.color, WebkitTextStroke: "1px #ccc" }}>A</span>
        <div style={{ height: "4px", width: "16px", background: "linear-gradient(to right, red, orange, yellow, green, blue, purple)", position: "absolute", bottom: "-2px", borderRadius: "2px" }} />
        <input 
          type="color" 
          value={selectedLayer.color} 
          onChange={(e) => onChange({ color: e.target.value })} 
          style={{ position: "absolute", opacity: 0, width: "20px", cursor: "pointer" }} 
        />
      </label>

      {/* Botón Negrita (B) */}
      <button
        onClick={() => onChange({ isBold: !selectedLayer.isBold })}
        style={{
          border: "none",
          background: selectedLayer.isBold ? "#F1F5F9" : "none",
          fontWeight: "bold",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        B
      </button>

      {/* Botón Cursiva (I) */}
      <button
        onClick={() => onChange({ isItalic: !selectedLayer.isItalic })}
        style={{
          border: "none",
          background: selectedLayer.isItalic ? "#F1F5F9" : "none",
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        I
      </button>

      {/* Botón Subrayado (U) */}
      <button
        onClick={() => onChange({ isUnderline: !selectedLayer.isUnderline })}
        style={{
          border: "none",
          background: selectedLayer.isUnderline ? "#F1F5F9" : "none",
          textDecoration: "underline",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        U
      </button>

      {/* Botón Mayúsculas/Minúsculas (aA) */}
      <button
        onClick={() => onChange({ isUppercase: !selectedLayer.isUppercase })}
        style={{
          border: "none",
          background: selectedLayer.isUppercase ? "#F1F5F9" : "none",
          fontSize: "13px",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        aA
      </button>
    </div>
  );
}