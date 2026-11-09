// Confere o simulador contra a "Tabela pronta" da seção 4 do documento.
// Rodar: npm run test:simulador
import { simular, type Moradores } from "../src/lib/simulador.ts";

const z = { criancas: 0, bebes: 0, adolescentes: 0, idosos: 0 };
const casos: [string, Moradores, number, number][] = [
  ["1 adulto", { ...z, adultos: 1 }, 6, 8],
  ["2 adultos", { ...z, adultos: 2 }, 11, 12],
  ["2 adultos + 1 criança", { ...z, adultos: 2, criancas: 1 }, 14, 16],
  ["2 adultos + 2 crianças", { ...z, adultos: 2, criancas: 2 }, 17, 20],
  ["3 adultos + 2 crianças", { ...z, adultos: 3, criancas: 2 }, 22, 24],
  ["4 adultos + 3 crianças", { ...z, adultos: 4, criancas: 3 }, 31, 32],
];

let ok = true;
for (const [nome, m, galoesMes, plano] of casos) {
  const r = simular(m, { calor: true, cozinha: true })!;
  const passou = r.galoesMes === galoesMes && r.planoSugerido === plano;
  ok &&= passou;
  console.log(
    passou ? "OK  " : "FALHA",
    nome.padEnd(24),
    `${r.litrosDia} L/dia`,
    `${r.galoesMes} galões/mês`,
    `${r.galoesSemanaMin}-${r.galoesSemanaMax}/semana`,
    `plano ${r.planoSugerido}`,
    `${r.litrosSemana} L/semana`,
  );
}
if (simular({ adultos: 0, ...z }, { calor: true, cozinha: true }) !== null) ok = false;
process.exit(ok ? 0 : 1);
