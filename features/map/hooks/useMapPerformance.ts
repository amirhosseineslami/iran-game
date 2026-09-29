import { useState, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { eventBus } from "../../realtime/eventBus";
import type { LocationEventData } from "../../realtime/types";

export interface MapPerformanceOptions {
  enableLODDisplay?: boolean;
  enableSpatialIndex?: boolean;
  maxRenderTimeMs?: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  featuresCount: number;
  lastFrameAt: number;
}

export function useMapPerformance(
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  _options: MapPerformanceOptions = {},
): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    featuresCount: 0,
    lastFrameAt: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef<number>(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    let running = true;

    const measure = () => {
      if (!running) return;

      const now = performance.now();
      frameCount.current++;

      if (lastTime.current === 0) {
        lastTime.current = now;
      }

      const delta = now - lastTime.current;
      if (delta >= 1000) {
        setMetrics((prev) => ({
          ...prev,
          fps: Math.round((frameCount.current / delta) * 1000),
          frameTime: delta / frameCount.current,
          lastFrameAt: Date.now(),
        }));
        frameCount.current = 0;
        lastTime.current = now;
      }

      const map = mapRef.current;
      if (map) {
        try {
          const source = map.getSource("cells") as
            | maplibregl.GeoJSONSource
            | undefined;
          if (source && typeof (source as unknown as Record<string, unknown>)["getGeoJSON"] === "function") {
            const geojson = (source as unknown as { getGeoJSON: () => { _features?: unknown[] } }).getGeoJSON();
            setMetrics((prev) => ({
              ...prev,
              featuresCount: geojson?._features?.length ?? 0,
            }));
          }
        } catch {
          // Source may not exist
        }
      }

      rafId.current = requestAnimationFrame(measure);
    };

    rafId.current = requestAnimationFrame(measure);

    return () => {
      running = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let renderStart = 0;

    const onRenderStart = () => {
      renderStart = performance.now();
    };

    const onRender = () => {
      setMetrics((prev) => ({
        ...prev,
        renderTime: performance.now() - renderStart,
        lastFrameAt: Date.now(),
      }));
    };

    map.on("movestart", onRenderStart);
    map.on("render", onRender);

    return () => {
      map.off("movestart", onRenderStart);
      map.off("render", onRender);
    };
  }, [mapRef]);

  return metrics;
}

export function syncMapWithRealtime(mapRef: React.MutableRefObject<maplibregl.Map | null>) {
  const listener = eventBus.subscribe("player_location_update");

  const handler = ((event: unknown) => {
    const e = event as { data: LocationEventData };
    const map = mapRef.current;
    if (!map) return;

    const data = e.data;
    if ("longitude" in data && "latitude" in data) {
      const lng = data.longitude as number;
      const lat = data.latitude as number;
      map.jumpTo({ center: [lng, lat] });
    }
  }) as (event: unknown) => void;

  listener.addListener(handler);

  return () => {
    listener.removeListener();
  };
}
