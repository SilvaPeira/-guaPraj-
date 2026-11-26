// Testes: chave Pix da loja e "Pix copia e cola" (BR Code do Banco Central).
// Rodar: npm run test:pix
import { chaveLegivel, crc16, normalizarChavePix, pixCopiaECola } from "../src/lib/pix";
import { linkCurto, urlLegivel } from "../src/lib/dominio";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

// CRC16-CCITT: vetor padrão e o exemplo do manual do BR Code (Banco Central).
confere("CRC de 123456789 = 29B1", crc16("123456789"), "29B1");
const exemploBcb = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
confere("CRC do exemplo do Banco Central = 1D3D", crc16(exemploBcb), "1D3D");

// Chaves.
confere("CPF válido (com pontos)", normalizarChavePix("cpf", "529.982.247-25"), { ok: true, chave: "52998224725" });
confere("CPF com dígito errado", normalizarChavePix("cpf", "529.982.247-26").ok, false);
confere("CNPJ válido", normalizarChavePix("cnpj", "11.222.333/0001-81"), { ok: true, chave: "11222333000181" });
confere("CNPJ inválido", normalizarChavePix("cnpj", "11.222.333/0001-82").ok, false);
confere("celular vira +55", normalizarChavePix("telefone", "(94) 9 9999-8888"), { ok: true, chave: "+5594999998888" });
confere("celular curto: erro", normalizarChavePix("telefone", "9999").ok, false);
confere("e-mail em minúsculas", normalizarChavePix("email", " Pix@Loja.com "), { ok: true, chave: "pix@loja.com" });
confere("chave aleatória", normalizarChavePix("aleatoria", "123E4567-E89B-12D3-A456-426614174000"), { ok: true, chave: "123e4567-e89b-12d3-a456-426614174000" });
confere("tipo desconhecido: erro", normalizarChavePix("xyz", "1").ok, false);
confere("CNPJ legível", chaveLegivel("cnpj", "11222333000181"), "11.222.333/0001-81");
confere("celular legível", chaveLegivel("telefone", "+5594999998888"), "(94) 9 9999-8888");

// Copia e cola com valor.
const cc = pixCopiaECola({ chave: "11222333000181", nome: "Distribuidora Água Boa", cidade: "Canaã dos Carajás", valorCentavos: 3300, identificador: "PEDIDO12" });
confere("começa com o formato do BR Code", cc.startsWith("000201"), true);
confere("tem a chave", cc.includes("0014br.gov.bcb.pix011411222333000181"), true);
confere("tem o valor 33.00", cc.includes("540533.00"), true);
confere("nome sem acento e maiúsculo", cc.includes("5922DISTRIBUIDORA AGUA BOA"), true);
confere("cidade sem acento (até 15)", cc.includes("6015CANAA DOS CARAJ"), true);
confere("identificador do pedido", cc.includes("0508PEDIDO12"), true);
confere("CRC confere", cc.slice(-4), crc16(cc.slice(0, -4)));

// Link legível.
confere("link com acento", urlLegivel("https://xn--guapraj-gwah.tech/l/loja"), "https://águaprajá.tech/l/loja");
confere("link curto", linkCurto("https://xn--guapraj-gwah.tech/l/loja"), "águaprajá.tech/l/loja");

console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
