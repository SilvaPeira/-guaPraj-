import { usuarioAtual } from "@/lib/sessao";
import { desinscrever, inscrever } from "@/lib/notificar";

// Aparelho aceitou (POST) ou recusou/desligou (DELETE) as notificações.
type Corpo = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

const valido = (c: Corpo): c is { endpoint: string; keys: { p256dh: string; auth: string } } =>
  typeof c.endpoint === "string" &&
  /^https:\/\//.test(c.endpoint) &&
  c.endpoint.length < 1000 &&
  typeof c.keys?.p256dh === "string" &&
  typeof c.keys?.auth === "string" &&
  c.keys.p256dh.length < 200 &&
  c.keys.auth.length < 100;

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return Response.json({ erro: "Entre na sua conta." }, { status: 401 });
  const corpo = (await req.json().catch(() => ({}))) as Corpo;
  if (!valido(corpo)) return Response.json({ erro: "Inscrição inválida." }, { status: 400 });
  await inscrever(u.id, corpo);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await usuarioAtual();
  if (!u) return Response.json({ erro: "Entre na sua conta." }, { status: 401 });
  const corpo = (await req.json().catch(() => ({}))) as Corpo;
  if (typeof corpo.endpoint === "string") await desinscrever(u.id, corpo.endpoint);
  return Response.json({ ok: true });
}
