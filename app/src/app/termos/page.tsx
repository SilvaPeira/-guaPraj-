import type { Metadata } from "next";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Termos de uso e privacidade" };

// RASCUNHO — revisar com advogado/contador antes do lançamento.
export default function Termos() {
  return (
    <>
      <Topo titulo="Termos de uso e privacidade" voltar="/" />
      <main className="conteudo">
        <article className="cartao pilha text-[15px] leading-relaxed">
          <p className="aviso-info text-sm">Versão preliminar para o período de testes.</p>

          <h2 className="titulo-secao">1. O que é o ÁguaPrajá</h2>
          <p>
            O ÁguaPrajá é uma plataforma que conecta famílias a distribuidoras de água e bebidas da cidade. Quem vende, emite a nota
            fiscal e entrega é a distribuidora escolhida; o ÁguaPrajá organiza pedidos, planos, agenda e pagamentos.
          </p>

          <h2 className="titulo-secao">2. Planos</h2>
          <ul className="list-disc pl-5">
            <li>O plano é contado em galões por mês e cobrado no início de cada ciclo.</li>
            <li>Você pode pular uma entrega até a véspera, pedir galão extra, pausar ou cancelar sem multa; o cancelamento vale até o fim do mês pago.</li>
            <li>Galões não usados acumulam para o mês seguinte até o limite definido pela loja.</li>
            <li>Casco: troca 1 por 1. Sem casco, o vasilhame é cobrado no primeiro pedido.</li>
          </ul>

          <h2 className="titulo-secao">3. Bebidas alcoólicas</h2>
          <p>
            A venda de bebidas alcoólicas é proibida para menores de 18 anos (Estatuto da Criança e do Adolescente, art. 243). Ao
            pedir, você declara ter 18 anos ou mais, e o entregador confere documento com foto. Sem documento, o item alcoólico não é
            entregue.
          </p>

          <h2 className="titulo-secao">4. Seus dados (LGPD)</h2>
          <ul className="list-disc pl-5">
            <li>Guardamos nome, celular, endereço, ponto no mapa e o número de moradores (sem nomes) para calcular o plano e entregar.</li>
            <li>A localização é usada só para a entrega e para mostrar as lojas que atendem você.</li>
            <li>A distribuidora vê apenas o necessário para entregar o seu pedido.</li>
            <li>Você pode pedir a correção ou exclusão dos seus dados a qualquer momento pelo WhatsApp de suporte.</li>
          </ul>

          <h2 className="titulo-secao">5. Distribuidoras</h2>
          <p>
            Só entram lojas que vendem água com o Selo Fiscal de Controle e Qualidade do Pará (Lei Estadual 9.084/2020). A loja é
            responsável pela qualidade dos produtos, pela validade dos vasilhames, pela emissão de nota fiscal e pelo cumprimento dos
            horários combinados.
          </p>
        </article>
      </main>
    </>
  );
}
