/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatarKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** Até onde mostramos lojas "só retirada" (o cliente vai até lá). */
export const RAIO_RETIRADA_KM = 15;
