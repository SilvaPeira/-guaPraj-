import { ImageResponse } from "next/og";

// Ícone do app ÁguaPrajá instalável (192, 512, 180 p/ iPhone; "-mascara" = área segura p/ Android).
const TAMANHOS = new Set([180, 192, 512]);

export async function GET(_: Request, ctx: RouteContext<"/app-icone/[tamanho]">) {
  const { tamanho: t } = await ctx.params;
  const mascara = t.endsWith("-mascara");
  const tamanho = Number(t.replace("-mascara", ""));
  if (!TAMANHOS.has(tamanho)) return new Response("Tamanho inválido", { status: 400 });
  const gota = tamanho * (mascara ? 0.5 : 0.62);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e3b2c", borderRadius: mascara ? 0 : tamanho * 0.18 }}>
        <svg width={gota} height={gota} viewBox="0 0 24 24" fill="#7fc8e3">
          <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
