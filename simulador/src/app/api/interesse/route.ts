import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validarLead } from "@/lib/lead";

// Recebe o cadastro de interesse e envia para a planilha do Google
// (via Apps Script — ver README). Sem a variável configurada, em
// desenvolvimento grava em data/leads.jsonl para teste local.

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "Dados inválidos." }, { status: 400 });
  }

  // campo-armadilha anti-robô: humanos não preenchem
  if (body && typeof body === "object" && (body as Record<string, unknown>).site) {
    return Response.json({ ok: true });
  }

  const r = validarLead(body);
  if ("erro" in r) return Response.json({ ok: false, erro: r.erro }, { status: 400 });

  const registro = { recebidoEm: new Date().toISOString(), ...r.lead, bebidas: r.lead.bebidas.join(", ") };
  const webhook = process.env.PLANILHA_WEBHOOK_URL;

  try {
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segredo: process.env.PLANILHA_SEGREDO ?? "", registro }),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`Planilha respondeu ${res.status}`);
      const txt = await res.text();
      if (!txt.includes('"ok":true')) throw new Error(`Planilha recusou: ${txt.slice(0, 200)}`);
    } else if (process.env.NODE_ENV !== "production") {
      const dir = path.join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(path.join(dir, "leads.jsonl"), JSON.stringify(registro) + "\n", "utf8");
    } else {
      throw new Error("PLANILHA_WEBHOOK_URL não configurada");
    }
  } catch (e) {
    console.error("[interesse] falha ao salvar:", e);
    return Response.json(
      { ok: false, erro: "Não conseguimos salvar agora. Tente de novo ou fale com a gente no WhatsApp." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
