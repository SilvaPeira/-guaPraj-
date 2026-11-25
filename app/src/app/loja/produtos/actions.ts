"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { podeSerRetornavel } from "@/lib/catalogo";
import { primeiroErro, reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

/** Retornável: checkbox + preço só do líquido (menor que o preço normal). */
function lerLiquido(form: FormData, categoria: string, preco: number | null): { ok: true; valor: number | null } | { ok: false; erro: string } {
  if (form.get("retornavelBebida") !== "on" || !podeSerRetornavel(categoria)) return { ok: true, valor: null };
  const liquido = reaisParaCentavos(form.get("precoLiquido"));
  if (!liquido) return { ok: false, erro: "Informe o preço só do líquido (com o casco vazio)." };
  if (preco && liquido >= preco) return { ok: false, erro: "O preço do líquido deve ser menor que o preço normal (com casco)." };
  return { ok: true, valor: liquido };
}

const FOTO_MAX = 300_000; // caracteres do data URL (~220 KB); a foto chega já reduzida

/** Foto: undefined = não mexe; null = remover; string = nova. */
function lerFoto(form: FormData): { ok: true; valor: string | null | undefined } | { ok: false; erro: string } {
  if (form.get("remover_foto") === "1") return { ok: true, valor: null };
  const v = String(form.get("foto") ?? "");
  if (!v) return { ok: true, valor: undefined };
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return { ok: false, erro: "Formato de foto inválido. Escolha a foto de novo." };
  if (v.length > FOTO_MAX) return { ok: false, erro: "A foto ficou grande demais. Tente outra." };
  return { ok: true, valor: v };
}

/** Estoque digitado: vazio = não controla; senão inteiro de 0 a 99999. */
function lerEstoque(v: FormDataEntryValue | null): { ok: true; valor: number | null } | { ok: false } {
  const s = String(v ?? "").trim();
  if (s === "") return { ok: true, valor: null };
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 99999 ? { ok: true, valor: n } : { ok: false };
}

const esquemaNovo = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(80),
  marca: z.string().trim().max(60).optional(),
  categoriaId: z.string().uuid({ message: "Escolha a categoria." }),
});

/** Categoria escolhida (Admin → Categorias): precisa existir e estar ativa. O tipo dela define as regras. */
async function lerCategoria(db: Awaited<ReturnType<typeof exigirLoja>>["db"], id: string) {
  const [c] = await db
    .select()
    .from(schema.categoriasProduto)
    .where(and(eq(schema.categoriasProduto.id, id), eq(schema.categoriasProduto.ativa, true)))
    .limit(1);
  return c ?? null;
}

export async function criarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const r = esquemaNovo.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: primeiroErro(r.error) };
  const cat = await lerCategoria(db, r.data.categoriaId);
  if (!cat) return { erro: "Escolha uma categoria da lista." };
  const tipo = cat.tipo;
  const preco = reaisParaCentavos(form.get("preco"));
  if (!preco) return { erro: "Informe o preço." };
  const estoque = lerEstoque(form.get("estoque"));
  if (!estoque.ok) return { erro: "Quantidade em estoque inválida (use um número inteiro, ou deixe vazio)." };
  const liquido = lerLiquido(form, tipo, preco);
  if (!liquido.ok) return { erro: liquido.erro };
  const foto = lerFoto(form);
  if (!foto.ok) return { erro: foto.erro };
  const alcoolico = tipo === "alcoolica";
  if (alcoolico && !loja.vendeAlcool) {
    return { erro: "Sua loja não está habilitada para bebida alcoólica. Ative em Ajustes (precisa de alvará)." };
  }
  await db.insert(schema.produtos).values({
    lojaId: loja.id,
    nome: r.data.nome,
    marca: r.data.marca || null,
    categoria: tipo,
    categoriaId: cat.id,
    retornavel: tipo === "agua_galao",
    alcoolico,
    precoCentavos: preco,
    precoLiquidoCentavos: liquido.valor,
    foto: foto.valor ?? null,
    estoque: estoque.valor,
    ordem: tipo === "casco" ? 99 : 10,
  });
  revalidatePath("/loja/produtos");
  return { ok: `${r.data.nome} adicionado.` };
}

export async function atualizarProduto(form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "");
  const onde = and(eq(schema.produtos.id, id), eq(schema.produtos.lojaId, loja.id), isNull(schema.produtos.excluidoEm));
  const [p] = await db.select().from(schema.produtos).where(onde).limit(1);
  if (!p) return { erro: "Produto não encontrado." };

  if (acao === "alternar") {
    await db.update(schema.produtos).set({ disponivel: !p.disponivel }).where(onde);
  } else if (acao === "excluir") {
    // Galão usado em plano ativo não pode sumir: os assinantes dependem dele.
    const [usoPlano] = await db
      .select({ n: count() })
      .from(schema.planos)
      .where(and(eq(schema.planos.produtoId, p.id), eq(schema.planos.ativo, true)));
    if (usoPlano.n > 0) return { erro: "Este galão está nos seus planos mensais. Desative os planos (ou troque o galão deles) antes de excluir." };
    const [usoPedido] = await db.select({ n: count() }).from(schema.itensPedido).where(eq(schema.itensPedido.produtoId, p.id));
    const [usoPlanoAntigo] = await db.select({ n: count() }).from(schema.planos).where(eq(schema.planos.produtoId, p.id));
    if (usoPedido.n === 0 && usoPlanoAntigo.n === 0) await db.delete(schema.produtos).where(onde);
    // Já foi vendido: some do catálogo, mas fica guardado para os pedidos antigos.
    else await db.update(schema.produtos).set({ excluidoEm: new Date(), disponivel: false, foto: null }).where(onde);
    revalidatePath("/loja/produtos");
    return { ok: `${p.nome} excluído.` };
  } else if (acao === "salvar") {
    const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
    if (nome.length < 2) return { erro: "Informe o nome do produto." };
    // Trocar de categoria: galão e casco não mudam (os planos e a troca de casco dependem deles).
    let novaCat: { id: string; tipo: typeof p.categoria } | null = null;
    const pedidaId = String(form.get("categoriaId") ?? "");
    if (pedidaId && pedidaId !== p.categoriaId) {
      if (p.categoria === "agua_galao" || p.categoria === "casco") return { erro: "Galão e casco não mudam de categoria." };
      const c = await lerCategoria(db, pedidaId);
      if (!c || c.sistema) return { erro: "Escolha uma categoria da lista." };
      if (c.tipo === "alcoolica" && !loja.vendeAlcool) return { erro: "Sua loja não está habilitada para bebida alcoólica. Ative em Ajustes (precisa de alvará)." };
      novaCat = { id: c.id, tipo: c.tipo };
    }
    const tipoFinal = novaCat?.tipo ?? p.categoria;
    const foto = lerFoto(form);
    if (!foto.ok) return { erro: foto.erro };
    const preco = reaisParaCentavos(form.get("preco"));
    const estoque = lerEstoque(form.get("estoque"));
    const marca = String(form.get("marca") ?? "").trim().slice(0, 60) || null;
    const liquido = lerLiquido(form, tipoFinal, preco ?? p.precoCentavos);
    if (!liquido.ok) return { erro: liquido.erro };
    await db
      .update(schema.produtos)
      .set({
        nome,
        marca,
        ...(novaCat ? { categoriaId: novaCat.id, categoria: novaCat.tipo, alcoolico: novaCat.tipo === "alcoolica" } : {}),
        precoLiquidoCentavos: liquido.valor,
        ...(foto.valor !== undefined ? { foto: foto.valor } : {}),
        ...(preco ? { precoCentavos: preco } : {}),
        ...(estoque.ok ? { estoque: estoque.valor } : {}),
      })
      .where(onde);
  } else if (acao === "somar" || acao === "tirar") {
    // Ajuste rápido de estoque (+1 / −1). Só para itens que controlam estoque.
    if (p.estoque !== null) {
      const novo = Math.max(0, p.estoque + (acao === "somar" ? 1 : -1));
      await db.update(schema.produtos).set({ estoque: novo }).where(onde);
    }
  }
  revalidatePath("/loja/produtos");
  return { ok: "Salvo." };
}

/** Botões rápidos da lista (em falta, +1, −1). */
export async function acaoRapidaProduto(form: FormData): Promise<void> {
  await atualizarProduto(form);
}
