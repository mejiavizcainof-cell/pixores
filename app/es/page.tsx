import type { Metadata } from "next";

export const metadata: Metadata = {
title: "Pixores - Herramientas Gratuitas para Imágenes y Archivos",
description:
"Convierte, comprime y optimiza imágenes online. Herramientas gratuitas para JPG, PNG, WebP, HEIC, PDF y favicons.",

keywords: [
"convertidor de imágenes",
"jpg a png",
"png a jpg",
"webp a jpg",
"jpg a webp",
"png a webp",
"webp a png",
"heic a jpg",
"jpg a pdf",
"pdf a jpg",
"generador de favicon",
"comprimir imágenes",
"redimensionar imágenes",
"herramientas para imágenes",
"convertidor online",
],
};

export default function Home() {
const tools = [
{
title: "JPG → PNG",
description: "Convierte imágenes JPG a formato PNG.",
link: "/jpg-to-png",
},
{
title: "PNG → JPG",
description: "Convierte imágenes PNG a formato JPG.",
link: "/png-to-jpg",
},
{
title: "WebP → JPG",
description: "Convierte imágenes WebP a formato JPG.",
link: "/webp-to-jpg",
},
{
title: "JPG → WebP",
description: "Convierte imágenes JPG a formato WebP.",
link: "/jpg-to-webp",
},
{
title: "PNG → WebP",
description: "Convierte imágenes PNG a formato WebP.",
link: "/png-to-webp",
},
{
title: "WebP → PNG",
description: "Convierte imágenes WebP a formato PNG.",
link: "/webp-to-png",
},
{
title: "HEIC → JPG",
description: "Convierte imágenes HEIC de iPhone a JPG.",
link: "/heic-to-jpg",
},
{
title: "JPG → PDF",
description: "Convierte imágenes JPG a archivos PDF.",
link: "/jpg-to-pdf",
},
{
title: "PDF → JPG",
description: "Convierte páginas PDF en imágenes JPG.",
link: "/pdf-to-jpg",
},
{
title: "Generador de Favicon",
description:
"Genera favicon.ico, Apple Touch Icons e iconos Android.",
link: "/favicon-generator",
},
{
title: "Comprimir Imagen",
description:
"Reduce el tamaño de las imágenes manteniendo la calidad.",
link: "/compress-image",
},
{
title: "Redimensionar Imagen",
description: "Cambia las dimensiones de una imagen fácilmente.",
link: "/resize-image",
},
];

return (
<main
style={{
maxWidth: "1200px",
margin: "0 auto",
padding: "40px 20px",
}}
>
<section
style={{
textAlign: "center",
marginBottom: "60px",
}}
>
<h1
style={{
fontSize: "56px",
fontWeight: "bold",
color: "#2563eb",
marginBottom: "20px",
}}
>
Convierte, Comprime y Optimiza Archivos Online </h1>

```
    <p
      style={{
        fontSize: "22px",
        color: "#555",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      Herramientas gratuitas para convertir imágenes,
      comprimir archivos, redimensionar fotografías y
      generar favicons.
    </p>
  </section>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "24px",
    }}
  >
    {tools.map((tool) => (
      <a
        key={tool.link}
        href={tool.link}
        style={{
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "24px",
            backgroundColor: "#ffffff",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.05)",
            height: "100%",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "12px",
            }}
          >
            {tool.title}
          </h2>

          <p
            style={{
              color: "#64748b",
              lineHeight: "1.6",
            }}
          >
            {tool.description}
          </p>
        </div>
      </a>
    ))}
  </div>

  <section
    style={{
      marginTop: "80px",
      lineHeight: "1.8",
    }}
  >
    <h2
      style={{
        fontSize: "32px",
        marginBottom: "20px",
      }}
    >
      Herramientas Gratuitas para Conversión de Imágenes
    </h2>

    <p>
      Pixores ofrece herramientas gratuitas para convertir
      imágenes entre formatos JPG, PNG, WebP, HEIC y PDF.
      También puedes comprimir imágenes, redimensionar
      fotografías y generar paquetes completos de favicons
      para sitios web.
    </p>

    <p>
      Todo el procesamiento se realiza automáticamente para
      ofrecer la mejor calidad posible manteniendo archivos
      ligeros y optimizados.
    </p>

    <p>
      Nuestra misión es proporcionar herramientas simples,
      rápidas y gratuitas para creadores de contenido,
      desarrolladores, diseñadores, empresas y profesionales
      de todo el mundo.
    </p>
  </section>
</main>
);
}
