"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";

/** Centro de Canaã dos Carajás (cidade piloto). */
export const CENTRO_PADRAO = { lat: -6.4966, lng: -49.8783 };

type Props = {
  /** Nomes dos inputs escondidos que vão no formulário. */
  nomeLat?: string;
  nomeLng?: string;
  inicial?: { lat: number; lng: number } | null;
  cidade?: string;
};

const pinSvg = `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg"><path d="M18 1C8.6 1 1 8.6 1 18c0 12.4 17 27 17 27s17-14.6 17-27C35 8.6 27.4 1 18 1z" fill="#1b6b47" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="6.5" fill="#fff"/></svg>`;

export default function MapaPin({ nomeLat = "lat", nomeLng = "lng", inicial, cidade = "Canaã dos Carajás" }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<LMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const [pos, setPos] = useState(inicial ?? null);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !divRef.current || mapaRef.current) return;
      const centro = inicial ?? CENTRO_PADRAO;
      const mapa = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView([centro.lat, centro.lng], inicial ? 17 : 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa);
      const icone = L.divIcon({ html: pinSvg, className: "", iconSize: [36, 46], iconAnchor: [18, 45] });
      const pin = L.marker([centro.lat, centro.lng], { draggable: true, icon: icone, autoPan: true }).addTo(mapa);
      pin.on("dragend", () => {
        const p = pin.getLatLng();
        setPos({ lat: p.lat, lng: p.lng });
      });
      mapa.on("click", (e) => {
        pin.setLatLng(e.latlng);
        setPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapaRef.current = mapa;
      pinRef.current = pin;
    })();
    return () => {
      cancelado = true;
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mover(lat: number, lng: number, zoom = 17) {
    pinRef.current?.setLatLng([lat, lng]);
    mapaRef.current?.setView([lat, lng], zoom);
    setPos({ lat, lng });
  }

  function usarGps() {
    setMsg("");
    if (!("geolocation" in navigator)) return setMsg("Seu celular não permite localização. Busque a rua ou arraste o pino.");
    setCarregando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCarregando(false);
        mover(p.coords.latitude, p.coords.longitude, 18);
        setMsg("Pronto! Confira se o pino está no seu portão e arraste se precisar.");
      },
      () => {
        setCarregando(false);
        setMsg("Não conseguimos sua localização. Busque a rua ou arraste o pino até sua casa.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function buscar() {
    if (busca.trim().length < 3) return;
    setMsg("");
    setCarregando(true);
    try {
      const q = encodeURIComponent(`${busca}, ${cidade}, PA, Brasil`);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`, {
        headers: { "Accept-Language": "pt-BR" },
      });
      const lista = (await r.json()) as { lat: string; lon: string }[];
      if (lista[0]) {
        mover(Number(lista[0].lat), Number(lista[0].lon), 17);
        setMsg("Encontramos a região. Agora arraste o pino até o seu portão.");
      } else {
        setMsg("Não achamos esse endereço. Tente só o bairro, ou arraste o pino no mapa.");
      }
    } catch {
      setMsg("A busca falhou. Arraste o pino no mapa.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={usarGps} className="botao-sec" disabled={carregando}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Usar minha localização
      </button>
      <div className="flex gap-2">
        <input
          className="entrada"
          placeholder="Ou busque a rua / bairro"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          aria-label="Buscar endereço no mapa"
        />
        <button type="button" onClick={buscar} className="botao-peq-sec flex-none" disabled={carregando}>
          Buscar
        </button>
      </div>
      <div ref={divRef} className="h-72 w-full overflow-hidden rounded-2xl border border-borda2" aria-label="Mapa: arraste o pino até sua casa" />
      <p className="text-sm text-tinta-suave" aria-live="polite">
        {msg || "Arraste o pino (ou toque no mapa) até o portão da casa."}
      </p>
      <input type="hidden" name={nomeLat} value={pos?.lat ?? ""} />
      <input type="hidden" name={nomeLng} value={pos?.lng ?? ""} />
    </div>
  );
}
