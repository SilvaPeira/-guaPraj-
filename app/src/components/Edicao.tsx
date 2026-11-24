"use client";

import { useState } from "react";

/**
 * Padrão do sistema para registros já salvos:
 * os campos ficam bloqueados; "Editar" libera; "Salvar" grava; "Cancelar" desfaz.
 *
 *   const ed = useEdicao(estado);              // volta a bloquear quando o salvar devolve { ok }
 *   <form key={ed.chave} …>
 *     <fieldset disabled={!ed.editando}>…campos…</fieldset>
 *     <BotoesEdicao ed={ed} />
 */
export function useEdicao(resultado?: { ok?: string } | null, inicialEditando = false) {
  const [editando, setEditando] = useState(inicialEditando);
  const [chave, setChave] = useState(0); // trocar a key do form desfaz o que foi digitado
  const [ultimo, setUltimo] = useState(resultado);
  // Cada envio devolve um objeto novo: se veio com "ok", bloqueia de novo
  // (ajuste de estado durante o render, padrão recomendado pelo React).
  if (resultado !== ultimo) {
    setUltimo(resultado);
    if (resultado?.ok) setEditando(false);
  }
  return {
    editando,
    chave,
    editar: () => setEditando(true),
    cancelar: () => {
      setEditando(false);
      setChave((c) => c + 1);
    },
    concluir: () => setEditando(false),
  };
}
export type Edicao = ReturnType<typeof useEdicao>;

export function BotoesEdicao({
  ed,
  salvando,
  textoSalvar = "Salvar",
  textoEditar = "Editar",
  pequeno = false,
}: {
  ed: Edicao;
  salvando?: boolean;
  textoSalvar?: string;
  textoEditar?: string;
  pequeno?: boolean;
}) {
  const principal = pequeno ? "botao-peq" : "botao";
  const secundario = pequeno ? "botao-peq-sec" : "botao-sec";
  if (!ed.editando) {
    return (
      <button type="button" className={secundario} onClick={ed.editar}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        {textoEditar}
      </button>
    );
  }
  return (
    <div className={`grid grid-cols-2 gap-2 ${pequeno ? "" : "w-full"}`}>
      <button type="button" className={secundario} onClick={ed.cancelar} disabled={salvando}>
        Cancelar
      </button>
      <button type="submit" className={principal} disabled={salvando}>
        {salvando ? "Salvando…" : textoSalvar}
      </button>
    </div>
  );
}
