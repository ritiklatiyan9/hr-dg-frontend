import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Geometry } from "geojson";
import { LocateFixed, Trash2, Undo2 } from "lucide-react";
import { Button } from "./components/ui/button";
import "leaflet/dist/leaflet.css";
import { boundary, type Pt } from "./geofence-shape";

/** Click-to-draw site boundary. Writes the closed ring as JSON into a hidden input. */
export default function GeofencePicker({
  name,
  fence,
  readOnly = false,
}: {
  name: string;
  fence: Geometry | null;
  readOnly?: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(null);
  const layer = useRef<L.LayerGroup>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [radius, setRadius] = useState(100);
  const [goTo, setGoTo] = useState("");
  const [error, setError] = useState("");
  const [tileError, setTileError] = useState(false);
  const shape = boundary(points, radius);

  useEffect(() => {
    const m = L.map(element.current!, {
      center: [22.5, 79],
      zoom: 5,
      zoomAnimation: false,
    });
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
        referrerPolicy: "strict-origin-when-cross-origin",
      },
    ).addTo(m);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    layer.current = L.layerGroup().addTo(m);
    if (!readOnly)
      m.on("click", (e) =>
        setPoints((p) =>
          p.length < 99
            ? [...p, [+e.latlng.lng.toFixed(7), +e.latlng.lat.toFixed(7)]]
            : p,
        ),
      );
    if (fence?.type) {
      // Current boundary for reference only; a new one is drawn from scratch.
      const current = L.geoJSON(fence, {
        style: {
          color: "#64748b",
          weight: 2,
          dashArray: "6 5",
          fillOpacity: 0.04,
        },
        interactive: false,
      }).addTo(m);
      m.fitBounds(current.getBounds(), { maxZoom: 18 });
    }
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current!);
    map.current = m;
    return () => {
      observer.disconnect();
      map.current = null;
      m.stop();
      layer.current?.clearLayers();
      m.remove();
    };
  }, []);
  useEffect(() => {
    const g = layer.current!;
    g.clearLayers();
    if (shape)
      L.polygon(
        shape.map(([x, y]) => [y, x]),
        { color: "#15806b", weight: 2, fillOpacity: 0.12, interactive: false },
      ).addTo(g);
    for (const [x, y] of points)
      L.circleMarker([y, x], {
        radius: 5,
        color: "#15806b",
        fillOpacity: 1,
        interactive: false,
      }).addTo(g);
  }, [points, radius]);

  const jump = (useCentre = false) => {
    const m = goTo.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const lat = Number(m?.[1]),
      lng = Number(m?.[2]);
    if (!m || Math.abs(lat) > 85 || Math.abs(lng) > 180)
      return setError("Paste coordinates as: latitude, longitude");
    setError("");
    map.current?.setView([lat, lng], 17);
    if (useCentre) setPoints([[lng, lat]]);
  };
  return (
    <div className="geofence-picker">
      <p>
        {!readOnly &&
          "Click three or more site corners to draw a boundary, or choose one centre point and a radius."}
        {fence?.type && " The dashed outline is the saved boundary."}
      </p>
      <div className="geofence-picker-tools">
        <input
          aria-label="Go to latitude, longitude"
          placeholder="Go to: 28.6139, 77.2090"
          value={goTo}
          onChange={(e) => setGoTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              jump();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => jump()}>
          Go
        </Button>
        {!readOnly && (
          <Button type="button" variant="outline" onClick={() => jump(true)}>
            Use as centre
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigator.geolocation.getCurrentPosition(
              (p) => {
                if (!map.current) return;
                setGoTo(
                  `${p.coords.latitude.toFixed(7)}, ${p.coords.longitude.toFixed(7)}`,
                );
                map.current.setView(
                  [p.coords.latitude, p.coords.longitude],
                  17,
                );
              },
              () => setError("Your location is unavailable"),
            )
          }
        >
          <LocateFixed /> My location
        </Button>
      </div>
      {tileError && (
        <p role="status">
          Map tiles are unavailable. You can still define the boundary using
          coordinates.
        </p>
      )}
      <div ref={element} className="geofence-picker-map" />
      {!readOnly && (
        <div className="geofence-picker-tools">
          {points.length === 1 && (
            <label>
              Radius (metres)
              <input
                type="number"
                min={10}
                max={5000}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value) || 10)}
              />
            </label>
          )}
          <span>
            {points.length} point{points.length === 1 ? "" : "s"}
            {points.length === 2 && " · add one more corner"}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!points.length}
            onClick={() => setPoints((p) => p.slice(0, -1))}
          >
            <Undo2 /> Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!points.length}
            onClick={() => setPoints([])}
          >
            <Trash2 /> Clear
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <input
        type="hidden"
        name={name}
        value={shape ? JSON.stringify(shape) : ""}
      />
    </div>
  );
}
