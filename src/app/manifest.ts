import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitácora",
    short_name: "Bitácora",
    description: "Tareas, reuniones, notas y archivos de todos tus proyectos.",
    lang: "es-UY",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Capturar", url: "/bandeja?capturar=1" },
      { name: "Hoy", url: "/" },
    ],
  };
}
