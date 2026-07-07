"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { countryDisplayName } from "@/lib/geo/continents";
import "leaflet/dist/leaflet.css";

export type SignupMapPoint = {
  id: string;
  email: string;
  lat: number;
  lng: number;
  city?: string | null;
  region?: string | null;
  country: string;
  tier?: string;
};

const signupIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;background:#00e676;border:2px solid #ecfdf5;border-radius:50%;box-shadow:0 0 8px rgba(0,230,118,0.55)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8],
});

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    fix();
    const t1 = setTimeout(fix, 50);
    const t2 = setTimeout(fix, 300);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
}

function FitBoundsOnce({ fitKey, points }: { fitKey: string; points: SignupMapPoint[] }) {
  const map = useMap();
  const lastFitKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    if (points.length === 0) {
      map.setView([20, 0], 2, { animate: false });
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12, animate: false });
  }, [map, fitKey, points]);

  return null;
}

export default function SignupLeafletMap({
  points,
  fitKey,
}: {
  points: SignupMapPoint[];
  fitKey: string;
}) {
  return (
    <div className="h-[480px] w-full">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix />
        <FitBoundsOnce fitKey={fitKey} points={points} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={signupIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{p.email}</strong>
                <p>
                  {p.city ? `${p.city}, ` : ""}
                  {countryDisplayName(p.country)}
                </p>
                {p.tier && <p>Tier: {p.tier}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
