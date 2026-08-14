import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pixores en Español",
  description: "Acceso en español a las principales herramientas de imágenes de Pixores.",
  alternates: { canonical: "https://www.pixores.com/es" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

const tools = [
  { title: "Convertir JPG a PNG", description: "Crea una copia PNG para edición o compatibilidad.", href: "/jpg-to-png" },
  { title: "Convertir PNG a JPG", description: "Prepara una copia fotográfica compatible y más compacta.", href: "/png-to-jpg" },
  { title: "Comprimir imagen", description: "Reduce el peso de una copia destinada a la web.", href: "/compress-image" },
  { title: "Redimensionar imagen", description: "Cambia las dimensiones antes de publicar o compartir.", href: "/resize-image" },
  { title: "Recortar imagen", description: "Selecciona visualmente un área o usa medidas exactas.", href: "/crop-image" },
  { title: "Quitar fondo", description: "Crea un PNG transparente mediante procesamiento con IA.", href: "/remove-background" },
];

export default function SpanishLandingPage() {
  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "54px 20px 72px", color: "#0f172a" }}>
      <header style={{ maxWidth: "800px", marginBottom: "38px" }}>
        <span style={{ color: "#2563eb", fontWeight: 850, fontSize: "13px" }}>PIXORES EN ESPAÑOL</span>
        <h1 style={{ margin: "10px 0 16px", fontSize: "clamp(38px, 6vw, 58px)", lineHeight: 1.08 }}>Herramientas prácticas para preparar imágenes</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "19px", lineHeight: 1.75 }}>Esta página facilita el acceso a las herramientas principales. La interfaz completa y las guías técnicas todavía están en inglés; por esa razón esta sección no se presenta como una traducción completa del sitio.</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }} aria-label="Herramientas destacadas">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} style={{ padding: "22px", border: "1px solid #dbe3ee", borderRadius: "10px", background: "#fff", color: "inherit", textDecoration: "none" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>{tool.title}</h2>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.65 }}>{tool.description}</p>
          </Link>
        ))}
      </section>

      <section style={{ maxWidth: "820px", marginTop: "50px", padding: "28px", borderRadius: "12px", background: "#eff6ff", lineHeight: 1.75 }}>
        <h2 style={{ marginTop: 0 }}>Antes de procesar un archivo</h2>
        <p>Conserva siempre el original y crea una copia para convertir, comprimir o redimensionar. Revisa el archivo descargado antes de eliminar cualquier versión anterior. Algunas operaciones se realizan localmente en el navegador y otras necesitan procesamiento en los servidores de Pixores; cada herramienta explica su comportamiento y sus límites.</p>
        <p>Estamos manteniendo esta página fuera del índice hasta que toda la experiencia, las instrucciones y el soporte estén disponibles correctamente en español.</p>
      </section>
    </main>
  );
}
