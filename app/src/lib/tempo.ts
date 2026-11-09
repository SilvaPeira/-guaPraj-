// Datas e horas no fuso do Pará (America/Belem, UTC−3, sem horário de verão).
// Datas trafegam como "AAAA-MM-DD" e horas como "HH:MM".

export const FUSO = "America/Belem";
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const DIAS_PLURAL = ["aos domingos", "às segundas", "às terças", "às quartas", "às quintas", "às sextas", "aos sábados"];

/** Data e hora "agora" no Pará. */
export function agoraLocal(): { data: string; hora: string; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  const hora = `${v("hour")}:${v("minute")}`;
  return { data: `${v("year")}-${v("month")}-${v("day")}`, hora, minutos: paraMinutos(hora) };
}

export function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function deMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Soma dias a uma data "AAAA-MM-DD" (calendário puro, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/** "Hoje · Seg, 10/11", "Amanhã · Ter, 11/11", "Qua, 12/11". */
export function dataBonita(data: string, hoje = agoraLocal().data): string {
  const [, m, d] = data.split("-");
  const base = `${DIAS_CURTOS[diaDaSemana(data)]}, ${d}/${m}`;
  if (data === hoje) return `Hoje · ${base}`;
  if (data === somarDias(hoje, 1)) return `Amanhã · ${base}`;
  return base;
}

export function horaBonita(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}
