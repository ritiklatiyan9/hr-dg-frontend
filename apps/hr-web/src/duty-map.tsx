import { memo, useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Geometry } from "geojson";
import { LocateFixed, Maximize2, Map as MapIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import { DutyMotion } from "./duty-motion";
import "leaflet/dist/leaflet.css";

export type DutyMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  observed_at: string;
  received_at?: string;
  label?: string;
  status?: string;
  classification?: string;
};
type Props = {
  points: DutyMapPoint[];
  fence: Geometry | null;
  history?: boolean;
  livePoint?: DutyMapPoint;
  nowMs: number;
  onSelect?: (id: string) => void;
  /** Overview only: centre on this employee's pin and show its label. */
  focus?: { id: string };
};
const valid = (p: DutyMapPoint) =>
  Number.isFinite(p.latitude) &&
  Math.abs(p.latitude) <= 90 &&
  Number.isFinite(p.longitude) &&
  Math.abs(p.longitude) <= 180;
/** Idle: the phone is connected but still, so its last fix is still current. */
const current = (p: DutyMapPoint) =>
  !p.status || p.status === "fresh" || p.status === "idle";
const colour = (p: DutyMapPoint) =>
  !current(p)
    ? "#64748b"
    : p.classification === "outside"
      ? "#c06b20"
      : "#137c68";
function description(p: DutyMapPoint) {
  const el = document.createElement("div");
  el.textContent = `${p.label ?? "Received location"} · ${new Date(p.observed_at).toLocaleString()} · ±${Math.round(p.accuracy_m)} m${p.status === "idle" ? " · not moving" : current(p) ? "" : " · last known"}`;
  return el;
}

/** One map per mounted scope. Update layers in place; never predict a GPS fix. */
export default memo(function DutyMap({
  points,
  fence,
  history = false,
  livePoint,
  nowMs,
  onSelect,
  focus,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    map: L.Map;
    tiles: L.TileLayer;
    samples: L.LayerGroup;
    fence: L.GeoJSON;
    markers: Map<string, L.CircleMarker | L.Marker>;
    accuracy: L.Circle;
    bounds: L.LatLngBounds;
    fitted: boolean;
    lastId?: string;
    motion: DutyMotion;
    head?: L.Marker;
  }>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const followRef = useRef(false);
  const [follow, setFollow] = useState(false);
  const [tileError, setTileError] = useState(false);
  const reduced = useRef(false);
  const currentTime = useRef(nowMs);
  currentTime.current = nowMs;
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = motion.matches;
    const motionChanged = () => {
      reduced.current = motion.matches;
      if (motion.matches) {
        engine.current?.motion.settle();
        engine.current?.map.stop();
      }
    };
    motion.addEventListener("change", motionChanged);
    const map = L.map(element.current!, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 19,
      preferCanvas: false,
      scrollWheelZoom: false,
      // Leaflet 1.9's CSS zoom timer can outlive a removed dialog. Camera pans
      // remain animated through cancellable public panTo/stop methods.
      zoomAnimation: false,
      fadeAnimation: !motion.matches,
      attributionControl: true,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    // Browser caching, visible attribution, no prefetch/offline tile download.
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 1,
        referrerPolicy: "strict-origin-when-cross-origin",
      },
    ).addTo(map);
    tiles.on("tileerror", () => setTileError(true));

    const samples = L.layerGroup().addTo(map);
    const boundary = L.geoJSON(undefined, {
      style: {
        color: "#15806b",
        weight: 2,
        fillOpacity: 0.07,
        dashArray: "6 5",
      },
      interactive: false,
    }).addTo(map);
    const accuracy = L.circle([0, 0], {
      radius: 0,
      color: "#137c68",
      weight: 1,
      fillOpacity: 0.09,
      interactive: false,
    });
    engine.current = {
      map,
      tiles,
      samples,
      fence: boundary,
      markers: new Map(),
      accuracy,
      bounds: L.latLngBounds([]),
      fitted: false,
      motion: new DutyMotion({
        now: () => performance.now(),
        request: (callback) => requestAnimationFrame(callback),
        cancel: (id) => cancelAnimationFrame(id),
      }),
    };
    const visibility = () => {
      if (document.hidden) {
        engine.current?.motion.settle();
        map.stop();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    const manual = () => {
      followRef.current = false;
      setFollow(false);
    };
    map.on("dragstart", manual);
    const keyboard = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "+", "-"].includes(
          e.key,
        )
      )
        manual();
    };
    element.current!.addEventListener("keydown", keyboard);
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false, debounceMoveend: true }),
    );
    observer.observe(element.current!);
    const container = element.current!;
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", motionChanged);
      container.removeEventListener("keydown", keyboard);
      document.removeEventListener("visibilitychange", visibility);
      engine.current?.motion.dispose();
      // Remove vector layers before their renderer and detach tile callbacks.
      samples.clearLayers();
      boundary.clearLayers();
      accuracy.remove();
      tiles.off();
      map.stop();
      map.remove();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    const e = engine.current!;
    e.fence.clearLayers();
    if (fence?.type) e.fence.addData(fence);
  }, [fence]);
  useEffect(() => {
    const e = engine.current!;
    const shown = points.filter(valid).slice(-2000);
    const latest = history ? shown.at(-1) : undefined;
    const keep = new Set(shown.map((p) => p.id));
    for (const [id, marker] of e.markers) {
      if (!keep.has(id)) {
        e.samples.removeLayer(marker);
        e.markers.delete(id);
        e.motion.remove(id);
      }
    }
    const bounds = L.latLngBounds([]);
    const boundaryBounds = e.fence.getBounds();
    if (boundaryBounds.isValid()) bounds.extend(boundaryBounds);
    shown.forEach((p) => {
      const ll: L.LatLngTuple = [p.latitude, p.longitude];
      bounds.extend(ll);
      let marker = e.markers.get(p.id);
      if (!marker) {
        marker = history
          ? L.circleMarker(ll, { radius: 4, weight: 1, fillOpacity: 0.8 })
          : L.marker(ll, {
              icon: L.divIcon({
                className: "duty-map-pin",
                html: '<span aria-hidden="true"></span><i class="duty-map-heading" aria-hidden="true"></i>',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
              title: p.label ?? "Employee location",
              keyboard: true,
            });
        marker.on("click", () => select.current?.(p.id));
        marker.bindTooltip(description(p), {
          direction: "top",
          offset: [0, -10],
        });
        marker.addTo(e.samples);
        e.markers.set(p.id, marker);
      }
      marker.setTooltipContent(description(p));
      if (marker instanceof L.CircleMarker) {
        marker
          .setLatLng(ll)
          .setRadius(p === latest ? 7 : 4)
          .setStyle({
            color: colour(p),
            fillColor: colour(p),
            weight: p === latest ? 3 : 1,
          });
      } else {
        const pin = marker;
        e.motion.update(
          p.id,
          p,
          (position, bearing, moving) => {
            pin.setLatLng(position);
            const el = pin.getElement();
            if (!el) return;
            el.dataset.motion = moving ? "gliding" : "settled";
            el.dataset.heading = String(
              bearing !== undefined && p.status === "fresh",
            );
            el.style.setProperty("--pin-bearing", `${bearing ?? 0}deg`);
          },
          !reduced.current && !document.hidden,
          currentTime.current,
        );
        marker.getElement()?.setAttribute("data-observed-at", p.observed_at);
        marker.getElement()?.style.setProperty("--pin-color", colour(p));
        marker
          .getElement()
          ?.setAttribute(
            "aria-label",
            `${p.label ?? "Employee"} · ${p.status === "idle" ? "idle, not moving" : current(p) ? "fresh location" : "last known location"} · open route`,
          );
      }
    });
    if (latest) {
      e.accuracy
        .setLatLng([latest.latitude, latest.longitude])
        .setRadius(Math.max(0, latest.accuracy_m))
        .addTo(e.map);
    } else e.accuracy.remove();
    e.bounds = bounds;
    if (!e.fitted && bounds.isValid()) {
      e.map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 17,
        animate: false,
      });
      e.fitted = true;
    }
    if (followRef.current && latest && latest.id !== e.lastId) {
      // A central safe area avoids camera jitter on every small GPS update.
      e.map.panInside([latest.latitude, latest.longitude], {
        padding: [80, 80],
        animate: !reduced.current && !document.hidden,
        duration: 0.8,
      });
    }
    e.lastId = latest?.id;
  }, [points, fence, history]);
  useEffect(() => {
    const e = engine.current!;
    const marker = focus ? e.markers.get(focus.id) : undefined;
    if (!marker) return;
    followRef.current = false;
    setFollow(false);
    e.map.setView(marker.getLatLng(), Math.max(e.map.getZoom(), 16), {
      animate: !reduced.current,
    });
    marker.openTooltip();
  }, [focus]);
  useEffect(() => {
    const e = engine.current!;
    if (history && livePoint && valid(livePoint)) {
      const p = livePoint;
      if (!e.head) {
        e.head = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            className: "duty-map-pin duty-map-head",
            html: '<span aria-hidden="true"></span><i class="duty-map-heading" aria-hidden="true"></i>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          keyboard: true,
          zIndexOffset: 1000,
        })
          .addTo(e.samples)
          .bindTooltip(description(p));
      }
      const pin = e.head;
      pin.setTooltipContent(description(p));
      pin.getElement()?.setAttribute("data-observed-at", p.observed_at);
      pin.getElement()?.style.setProperty("--pin-color", colour(p));
      pin
        .getElement()
        ?.setAttribute(
          "aria-label",
          `${p.status === "fresh" ? "Latest received position" : "Last known position"} · ${p.label ?? "Employee"}`,
        );
      e.motion.update(
        "route-head",
        p,
        (position, bearing, moving) => {
          pin.setLatLng(position);
          const el = pin.getElement();
          if (!el) return;
          el.dataset.motion = moving ? "gliding" : "settled";
          el.dataset.heading = String(
            bearing !== undefined && p.status === "fresh",
          );
          el.style.setProperty("--pin-bearing", `${bearing ?? 0}deg`);
        },
        !reduced.current && !document.hidden,
        nowMs,
      );
    } else if (e.head) {
      e.head.remove();
      e.head = undefined;
      e.motion.remove("route-head");
    }
  }, [history, livePoint, nowMs]);
  return (
    <figure className="duty-map-frame">
      <div className="duty-map-toolbar">
        <span>
          <MapIcon size={15} /> {history ? "Recorded route" : "Site overview"}
        </span>
        <div>
          {history && (
            <Button
              size="sm"
              variant={follow ? "default" : "outline"}
              aria-pressed={follow}
              onClick={() => {
                const next = !follow;
                followRef.current = next;
                setFollow(next);
                const p = points.filter(valid).at(-1);
                if (next && p)
                  engine.current?.map.panTo([p.latitude, p.longitude], {
                    animate: !reduced.current,
                    duration: 0.6,
                  });
              }}
            >
              <LocateFixed size={14} /> Follow latest
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              followRef.current = false;
              setFollow(false);
              const e = engine.current!;
              if (e.bounds.isValid())
                e.map.fitBounds(e.bounds, {
                  padding: [45, 45],
                  maxZoom: 17,
                  animate: !reduced.current,
                  duration: 0.6,
                });
            }}
          >
            <Maximize2 size={14} /> Fit locations
          </Button>
        </div>
      </div>
      <div
        ref={element}
        className="duty-leaflet-map"
        role="region"
        aria-label={
          history
            ? "Received duty positions map"
            : "Employee location overview map"
        }
      />
      {tileError && (
        <div className="duty-map-error" role="status">
          Basemap unavailable. Recorded points and the site boundary remain
          visible.
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTileError(false);
              engine.current?.tiles.redraw();
            }}
          >
            Retry basemap
          </Button>
        </div>
      )}
      {!points.length && (
        <div className="duty-map-empty">
          No received locations yet. The current site boundary is shown when
          configured.
        </div>
      )}
      <figcaption>
        <span className="map-key boundary" /> Current geofence{" "}
        <span className="map-key fresh" /> Received location{" "}
        <span className="map-key stale" /> Last known
        <span>
          · Smooth movement between fresh updates; stops at the latest received
          fix.
        </span>
        {history && (
          <span>
            {" "}
            · Latest point includes its reported accuracy circle.{" "}
            {points.length > 2000
              ? "Latest 2,000 loaded samples shown."
              : ""}{" "}
            The glide and direction arrow are visual estimates between fixes,
            not a recorded road route. Gaps and delayed uploads are not
            animated.
          </span>
        )}
      </figcaption>
    </figure>
  );
});
