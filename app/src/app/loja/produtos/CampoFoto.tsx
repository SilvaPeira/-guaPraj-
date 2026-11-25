"use client";

/* eslint-disable @next/next/no-img-element -- prévia local (data URL) */
import { useRef, useState } from "react";
import { prepararFotoQuadrada } from "@/lib/imagem";

/**
 * Foto do produto: tira na hora (câmera do celular) ou escolhe da galeria.
 * A imagem é recortada em quadrado e reduzida no próprio aparelho antes de enviar.
 * Envia "foto" (data URL) ou "remover_foto"=1.
 */
export default function CampoFoto({ atualUrl = null, travado = false }: { atualUrl?: string | null; travado?: boolean }) {
  const [nova, setNova] = useState("");
  const [remover, setRemover] = useState(false);
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const previa = remover ? null : nova || atualUrl;

  async function receber(f: File | undefined) {
    if (!f) return;
    setErro("");
    if (!f.type.startsWith("image/")) return setErro("Escolha uma imagem (foto).");
    if (f.size > 15_000_000) return setErro("Imagem muito grande (máx. 15 MB).");
    setLendo(true);
    try {
      setNova(await prepararFotoQuadrada(f));
      setRemover(false);
    } catch {
      setErro("Não conseguimos abrir essa imagem. Tente outra.");
    } finally {
      setLendo(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="foto" value={remover ? "" : nova} />
      <input type="hidden" name="remover_foto" value={remover ? "1" : ""} />
      {previa ? (
        <img src={previa} alt="Foto do produto" className="size-20 flex-none rounded-xl border border-borda object-cover" />
      ) : (
        <span className="flex size-20 flex-none items-center justify-center rounded-xl border-2 border-dashed border-borda2 text-xs text-tinta-suave">sem foto</span>
      )}
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <label className={`botao-peq-sec ${travado ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
          {lendo ? "Preparando…" : previa ? "Trocar foto" : "Adicionar foto"}
          <input ref={input} type="file" accept="image/*" className="sr-only" disabled={travado} onChange={(e) => receber(e.target.files?.[0])} />
        </label>
        {previa && !travado && (
          <button type="button" className="text-sm font-semibold text-tinta-suave underline" onClick={() => {
              setNova("");
              setRemover(true);
            }}>
            Remover foto
          </button>
        )}
        {!previa && <span className="text-xs text-tinta-suave">Foto quadrada, fundo claro. Vende mais!</span>}
        {erro && (
          <span role="alert" className="text-xs font-semibold text-terra-esc">
            {erro}
          </span>
        )}
      </div>
    </div>
  );
}
