import type { Instrumentation } from "next";

/**
 * Erros do servidor (telas, actions, rotas): vão para o log e para Admin → Erros.
 * Só no runtime Node (o banco não roda em outros runtimes).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const mensagem = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  const { registrarErro } = await import("./lib/erros");
  await registrarErro({ mensagem, rota: request.path, metodo: request.method, tipo: context.routeType, digest });
};
