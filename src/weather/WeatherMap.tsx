import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setWorkerUrl } from "maplibre-gl";
// `?worker&url` bundles the worker with its shared chunk; plain `?url` copies only the entry file, which then 404s on its import.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";

import { cn } from "@/lib/utils";
import { BandGlyph } from "./BandGlyph";
import { BAND_CLASS, HEAT_MAX, cssVar, signed, type Band, type Cell, type Geo, type MarkerStyle, type MarkerValue } from "./data";
import { CountryCard } from "./Tooltip";

setWorkerUrl(workerUrl);

/** Approximate marker footprint in px, used for overlap hiding. */
const MARKER_W = 80, MARKER_H = 28;

const EMPTY_STYLE = { version: 8 as const, sources: {}, layers: [] };
const EU_BOUNDS: [[number, number], [number, number]] = [[-10.5, 34.5], [34.5, 70.5]];

/** Same linear scale as the `fill-color` interpolate expression (0 → cold, HEAT_MAX/2 → warm, HEAT_MAX → hot), clamped. */
function heatColour(heat: number, c: { cold: string; warm: string; hot: string }) {
    const v = Math.min(HEAT_MAX, Math.max(0, heat)) / (HEAT_MAX / 2);
    const [from, to, k] = v <= 1 ? [c.cold, c.warm, v] : [c.warm, c.hot, v - 1];
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
    return `#${[0, 1, 2].map((i) => Math.round(ch(from, i) + (ch(to, i) - ch(from, i)) * k).toString(16).padStart(2, "0")).join("")}`;
}

/** Dark or white text, whichever reads better on a given background (WCAG relative luminance). */
function textOn(bg: string) {
    const lin = (i: number) => { const c = parseInt(bg.slice(1 + 2 * i, 3 + 2 * i), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const l = 0.2126 * lin(0) + 0.7152 * lin(1) + 0.0722 * lin(2);
    return l > 0.4 ? "#111827" : "#ffffff";
}

function readColours() {
    return {
        land: cssVar("--color-map-land"),
        border: cssVar("--color-map-border"),
        cold: cssVar("--color-heat-cold"),
        warm: cssVar("--color-heat-warm"),
        hot: cssVar("--color-heat-hot"),
        selected: cssVar("--color-selected"),
    };
}

/** Space taken by the overlays (legend left, panel right, timeline bottom); smaller screens stack the timeline lower. */
function framePadding() {
    const w = window.innerWidth;
    return { top: 90, left: Math.min(350, w * 0.22), right: Math.min(420, w * 0.28), bottom: w >= 1280 ? 40 : 130 };
}

type Props = {
    geo: Geo;
    cells: Record<string, Cell>;
    selected?: string;
    /** Heat range highlighted from the legend; other Countries are dimmed. */
    heatRange?: [number, number];
    isDark: boolean;
    markerStyle: MarkerStyle;
    markerValue: MarkerValue;
    bands: Band[];
    fuelLabel: string;
    week: string;
    onSelect: (code: string | undefined) => void;
};

export function WeatherMap({ geo, cells, selected, heatRange, isDark, markerStyle, markerValue, bands, fuelLabel, week, onSelect }: Props) {
    const mapRef = useRef<MapRef>(null);
    const [hovered, setHovered] = useState<string>();
    // Hover card: which Country and where (px inside the map container)
    const [tip, setTip] = useState<{ code: string; x: number; y: number }>();
    const names = useMemo(() => Object.fromEntries(geo.features.map((f) => [f.properties.code, f.properties.name])), [geo]);

    const data = useMemo(() => ({
        ...geo,
        features: geo.features.map((f) => {
            const cell = cells[f.properties.code];
            const inRange = !heatRange || (cell && cell.heat >= heatRange[0] && cell.heat < heatRange[1]);
            return { ...f, properties: { ...f.properties, hasData: !!cell, heat: cell?.heat ?? 0, dimmed: !inRange } };
        }),
    }), [geo, cells, heatRange]);

    // Colours are theme tokens. Child effects run before the parent's, so wait a tick for useAppTheme to toggle `.dark`.
    const [colours, setColours] = useState(readColours);
    useEffect(() => {
        const timer = setTimeout(() => setColours(readColours()), 0);
        return () => clearTimeout(timer);
    }, [isDark]);

    // Hide markers that would overlap: keep the selected Country first, then the biggest values of what the markers show.
    const markerMetric = (c: Cell) => Math.abs(markerValue === "week" ? c.weather : c.heat);
    const [visible, setVisible] = useState<Set<string>>();
    const updateVisible = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        const order = geo.features
            .filter((f) => cells[f.properties.code])
            .sort((a, b) => (a.properties.code === selected ? -1 : b.properties.code === selected ? 1 : 0)
                || markerMetric(cells[b.properties.code]) - markerMetric(cells[a.properties.code]));
        const placed: { x: number; y: number }[] = [];
        const keep = new Set<string>();
        for (const f of order) {
            const p = map.project([f.properties.labelLon, f.properties.labelLat]);
            if (placed.every((q) => Math.abs(q.x - p.x) > MARKER_W || Math.abs(q.y - p.y) > MARKER_H)) {
                placed.push(p);
                keep.add(f.properties.code);
            }
        }
        setVisible(keep);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geo, cells, selected, markerValue]);
    useEffect(() => { updateVisible(); }, [updateVisible]);

    const fill = ["case", ["get", "hasData"],
        ["interpolate", ["linear"], ["get", "heat"], 0, colours.cold, HEAT_MAX / 2, colours.warm, HEAT_MAX, colours.hot],
        colours.land];

    const tipCell = tip ? cells[tip.code] : undefined;

    return (
        <div className="absolute inset-0">
        <Map
            ref={mapRef}
            // Fit EU-27 into the area left free by the floating legend, Country panel and timeline.
            initialViewState={{ bounds: EU_BOUNDS, fitBoundsOptions: { padding: framePadding() } }}
            minZoom={2.5}
            maxZoom={7}
            style={{ position: "absolute", inset: 0 }}
            // No basemap: the sea is the container background (bg-map-sea), so it follows the theme without a style reload.
            mapStyle={EMPTY_STYLE}
            interactiveLayerIds={["country-fill"]}
            cursor={hovered ? "pointer" : "grab"}
            attributionControl={false}
            onMouseMove={(e) => {
                const f = e.features?.[0];
                const code = f?.properties?.hasData ? (f.properties.code as string) : undefined;
                setHovered(code);
                setTip(code ? { code, x: e.point.x, y: e.point.y } : undefined);
            }}
            onMouseLeave={() => { setHovered(undefined); setTip(undefined); }}
            onMoveStart={() => setTip(undefined)}
            onClick={(e) => {
                const f = e.features?.[0];
                onSelect(f?.properties?.hasData ? f.properties.code : undefined);
            }}
            onMoveEnd={updateVisible}
            onLoad={(e) => {
                (window as unknown as { __map: unknown }).__map = e.target; // debugging hook (e.g. repaint a hidden tab)
                updateVisible();
            }}
            onError={(e) => console.error("MapLibre:", e.error ?? e)}
        >
            <Source id="countries" type="geojson" data={data}>
                <Layer id="country-fill" type="fill" paint={{
                    "fill-color": fill as never,
                    "fill-opacity": ["case", ["get", "dimmed"], 0.25, ["==", ["get", "code"], hovered ?? ""], 1, 0.88] as never,
                }} />
                <Layer id="country-line" type="line" paint={{ "line-color": colours.border, "line-width": 0.7 }} />
                <Layer id="country-selected" type="line" filter={["==", ["get", "code"], selected ?? ""]}
                    paint={{ "line-color": colours.selected, "line-width": 2.5 }} />
            </Source>

            {data.features.filter((f) => f.properties.hasData && (!visible || visible.has(f.properties.code))).map((f) => {
                const { code, name, labelLon, labelLat, dimmed } = f.properties;
                const showTip = () => {
                    const p = mapRef.current?.project([labelLon, labelLat]);
                    if (p) setTip({ code, x: p.x, y: p.y - 12 });
                };
                const cell = cells[code];
                const isSelected = code === selected;
                return (
                    <Marker key={code} longitude={labelLon} latitude={labelLat} anchor="center"
                        onClick={(e) => { e.originalEvent.stopPropagation(); onSelect(code); }}>
                        {/* Marker: "week" = band glyph + weekly change; "baseline" = change since the Baseline only, on a pill in the Country's Heat colour */}
                        <button
                            type="button"
                            aria-label={`${name}: ${signed(cell.weather)} vs previous week, ${signed(cell.heat, 0)} since the Baseline`}
                            onMouseEnter={showTip}
                            onFocus={showTip}
                            onMouseLeave={() => setTip(undefined)}
                            onBlur={() => setTip(undefined)}
                            // Baseline mode: the pill takes the Country's Heat colour, the number picks dark/white text for contrast
                            style={markerValue === "baseline" ? { backgroundColor: heatColour(cell.heat, colours) } : undefined}
                            className={cn(
                                "flex items-center gap-100 rounded-full border px-200 py-100 leading-tight shadow-8 transition-transform",
                                "focus-visible:outline-2 focus-visible:outline-ring",
                                markerValue === "week" && "border-border bg-glass backdrop-blur-sm",
                                markerValue === "baseline" && "border-black/15",
                                isSelected ? "scale-110 ring-2 ring-selected" : "hover:scale-105",
                                dimmed && "opacity-40",
                            )}
                        >
                            {markerValue === "week" ? (
                                <>
                                    <BandGlyph band={cell.band} style={markerStyle} className={markerStyle === "weather" ? "text-300" : undefined} />
                                    <span className={cn("font-numeric text-300 font-semibold tabular-nums", BAND_CLASS[cell.band].text)}>{signed(cell.weather)}</span>
                                </>
                            ) : (
                                <span className="font-numeric text-300 font-bold tabular-nums" style={{ color: textOn(heatColour(cell.heat, colours)) }}>
                                    {signed(cell.heat, 0)}
                                </span>
                            )}
                        </button>
                    </Marker>
                );
            })}
        </Map>
        {tip && tipCell && (
            <CountryCard name={names[tip.code]} code={tip.code} fuelLabel={fuelLabel} week={week} cell={tipCell}
                bands={bands} markerStyle={markerStyle} x={tip.x} y={tip.y} />
        )}
        </div>
    );
}
