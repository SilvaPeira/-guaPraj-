// Manifesto do app ÁguaPrajá (instalável no celular e no computador, sem loja de aplicativos).
export function GET() {
  return Response.json(
    {
      id: "/",
      name: "ÁguaPrajá",
      short_name: "ÁguaPrajá",
      description: "Água em galão por assinatura, com entrega no dia e horário que você escolher.",
      lang: "pt-BR",
      start_url: "/?origem=app",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f4f7f3",
      theme_color: "#0e3b2c",
      icons: [
        { src: "/app-icone/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/app-icone/512", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/app-icone/512-mascara", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
