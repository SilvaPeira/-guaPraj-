// Teste do login por senha. Rodar: npm run test:senha
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { conferirHash, definirSenha, entrarComSenha, gerarHash, validarSenhaNova } from "../src/lib/senha";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://";
  confere("senha curta", !!validarSenhaNova("abc", "abc"), true);
  confere("senha óbvia", !!validarSenhaNova("111111", "111111"), true);
  confere("confirmação diferente", !!validarSenhaNova("agua2026", "agua2027"), true);
  confere("senha boa", validarSenhaNova("agua2026", "agua2026"), null);

  const h = await gerarHash("agua2026");
  confere("hash não contém a senha", h.includes("agua2026"), false);
  confere("hash confere", await conferirHash("agua2026", h), true);
  confere("hash recusa outra", await conferirHash("agua2025", h), false);
  confere("dois hashes da mesma senha são diferentes (sal)", h === (await gerarHash("agua2026")), false);

  const db = await getDb();
  const [u0] = await db.insert(schema.usuarios).values({ telefone: "94900000300" }).returning();
  await definirSenha(u0.id, "agua2026");
  const ler = async () => (await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, u0.id)))[0];

  confere("entra com a senha certa", (await entrarComSenha(await ler(), "agua2026")).ok, true);
  for (let i = 0; i < 4; i++) await entrarComSenha(await ler(), "errada");
  confere("4 erros ainda não bloqueia", (await ler()).bloqueadoAte, null);
  const quinto = await entrarComSenha(await ler(), "errada");
  confere("5º erro bloqueia", !quinto.ok && quinto.erro.includes("aguarde"), true);
  confere("bloqueado recusa até a senha certa", (await entrarComSenha(await ler(), "agua2026")).ok, false);
  await db.update(schema.usuarios).set({ bloqueadoAte: new Date(Date.now() - 1000) }).where(eq(schema.usuarios.id, u0.id));
  confere("depois do bloqueio, senha certa entra", (await entrarComSenha(await ler(), "agua2026")).ok, true);
  confere("acerto zera as falhas", (await ler()).falhasSenha, 0);

  const [sem] = await db.insert(schema.usuarios).values({ telefone: "94900000301" }).returning();
  confere("conta sem senha não entra com senha", (await entrarComSenha(sem, "qualquer1")).ok, false);

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
