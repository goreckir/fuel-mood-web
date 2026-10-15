// Country comparison map: each Country coloured by its Gap to EU average (no moods, no Heat).

import { useEffect, useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";

import { cn } from "@/lib/utils";
import { GAP_SCALE, cssVar, euro, formatWeek, gapColour, gapGradient, signed, textOn, type Geo } from "./data";
import type { CompareRow } from "./CompareList";

const EMPTY_STYLE = { version: 8 as const, sources: {}, layers: [] };
const EU_BOUNDS: [[number, number], [number, number]] = [[-10.5, 34.5], [34.5, 70.5]];

function readColours() {
    return {
        land: cssVar("--color-map-land"),
        border: cssVar("--color-map-border"),
        low: cssVar("--color-gap-low"),
        mid: cssVar("--color-gap-mid"),
        high: cssVar("--color-gap-high"),
        selected: cssVar("--color-selected"),
    };
}

type Props = {
    geo: Geo;
    /** Country code -> its comparison row (Price level, Gap to EU average, Rank). */
    rows: Record<string, CompareRow>;
    componentName: string;
    week: string;
    selected?: string;
    hovered?: string;
    isDark: boolean;
    onSelect: (code: string | undefined) => void;
    onHover: (code: string | undefined) => void;
};

export function CompareMap({ geo, rows, componentName, week, selected, hovered, isDark, onSelect, onHover }: Props) {
    const [tip, setTip] = useState<{ code: string; x: number; y: number }>();

    const data = useMemo(() => ({
        ...geo,
        features: geo.features.map((f) => {
            const row = rows[f.properties.code];
            return { ...f, properties: { ...f.properties, hasData: !!row, gap: row?.gap ?? 0 } };
        }),
    }), [geo, rows]);

    // Colours are theme tokens; wait a tick for useAppTheme to toggle `.dark` (child effects run first).
    const [colours, setColours] = useState(readColours);
    useEffect(() => {
        const timer = setTimeout(() => setColours(readColours()), 0);
        return () => clearTimeout(timer);
    }, [isDark]);

    const fill = ["case", ["get", "hasData"],
        ["interpolate", ["linear"], ["get", "gap"], GAP_SCALE.min, colours.low, 0, colours.mid, GAP_SCALE.max, colours.high],
        colours.land];

    const tipRow = tip ? rows[tip.code] : undefined;

    return (
        <div className="absolute inset-0">
            <Map
                initialViewState={{ bounds: EU_BOUNDS, fitBoundsOptions: { padding: { top: 16, left: 16, right: 16, bottom: 72 } } }}
                minZoom={2}
                maxZoom={7}
                style={{ position: "absolute", inset: 0 }}
                mapStyle={EMPTY_STYLE}
                interactiveLayerIds={["compare-fill"]}
                cursor={hovered ? "pointer" : "grab"}
                attributionControl={false}
                onMouseMove={(e) => {
                    const f = e.features?.[0];
                    const code = f?.properties?.hasData ? (f.properties.code as string) : undefined;
                    onHover(code);
                    setTip(code ? { code, x: e.point.x, y: e.point.y } : undefined);
                }}
                onMouseLeave={() => { onHover(undefined); setTip(undefined); }}
                onMoveStart={() => setTip(undefined)}
                onClick={(e) => {
                    const f = e.features?.[0];
                    onSelect(f?.properties?.hasData ? f.properties.code : undefined);
                }}
                onError={(e) => console.error("MapLibre:", e.error ?? e)}
            >
                <Source id="compare-countries" type="geojson" data={data}>
                    <Layer id="compare-fill" type="fill" paint={{
                        "fill-color": fill as never,
                        "fill-opacity": ["case", ["==", ["get", "code"], hovered ?? ""], 1, 0.9] as never,
                    }} />
                    <Layer id="compare-line" type="line" paint={{ "line-color": colours.border, "line-width": 0.7 }} />
                    <Layer id="compare-hovered" type="line" filter={["==", ["get", "code"], hovered ?? ""]}
                        paint={{ "line-color": colours.selected, "line-width": 1.5, "line-opacity": 0.6 }} />
                    <Layer id="compare-selected" type="line" filter={["==", ["get", "code"], selected ?? ""]}
                        paint={{ "line-color": colours.selected, "line-width": 2.5 }} />
                </Source>

                {/* Price level label per Country, e.g. "€1.80" (2 decimals to keep the map readable; the list keeps 3) */}
                {data.features.filter((f) => f.properties.hasData).map((f) => {
                    const { code, name, labelLon, labelLat } = f.properties;
                    const row = rows[code];
                    const bg = gapColour(row.gap, colours);
                    return (
                        <Marker key={code} longitude={labelLon} latitude={labelLat} anchor="center"
                            onClick={(e) => { e.originalEvent.stopPropagation(); onSelect(code); }}>
                            <button type="button"
                                aria-label={`${row.rank}. ${name}: ${componentName} ${euro(row.level)}, ${signed(row.gap, 0)} vs EU average`}
                                onMouseEnter={() => onHover(code)}
                                onMouseLeave={() => onHover(undefined)}
                                onFocus={() => onHover(code)}
                                onBlur={() => onHover(undefined)}
                                // Same as the map page's Baseline pills: the pill takes the Country's colour, text picks dark/white for contrast
                                style={{ backgroundColor: bg, color: textOn(bg) }}
                                className={cn(
                                    "rounded-full border border-black/15 px-200-nudge py-100-nudge font-numeric text-200 font-bold leading-tight tabular-nums shadow-8 transition-transform",
                                    "focus-visible:outline-2 focus-visible:outline-ring",
                                    code === selected ? "scale-110 ring-2 ring-selected" : code === hovered ? "scale-105" : "hover:scale-105",
                                )}>
                                €{row.level.toFixed(2)}
                            </button>
                        </Marker>
                    );
                })}
            </Map>

            {tip && tipRow && (
                <div className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-300 py-200 text-200 text-popover-foreground shadow-16"
                    style={{ left: tip.x, top: tip.y, transform: "translate(-50%, calc(-100% - 12px))" }}>
                    <div className="whitespace-nowrap font-semibold">{tipRow.rank}. {tipRow.name}</div>
                    <div className="whitespace-nowrap tabular-nums">
                        {componentName} {euro(tipRow.level)} · <b>{signed(tipRow.gap, 0)}</b> vs EU average
                    </div>
                    {tipRow.levelWeek !== week && <div className="text-muted-foreground">Bulletin week {formatWeek(tipRow.levelWeek)}</div>}
                </div>
            )}

            <GapLegend />
        </div>
    );
}

/** Small legend of the Gap to EU average scale. */
function GapLegend() {
    return (
        <section aria-label="Legend" className="absolute bottom-300 left-300 w-64 max-w-[calc(100%-1.5rem)] rounded-xl border border-border bg-glass px-300 py-200 shadow-16 backdrop-blur-md">
            <h2 className="mb-100 text-200 font-semibold">Gap to EU average</h2>
            <div className="h-200 rounded-full" style={{ background: gapGradient() }} aria-hidden />
            <div className="mt-100 flex justify-between text-100 tabular-nums text-muted-foreground">
                {GAP_SCALE.steps.map((s) => (
                    <span key={s}>{s === 0 ? "EU avg" : `${s === GAP_SCALE.min ? "≤ " : s === GAP_SCALE.max ? "≥ " : ""}${s > 0 ? "+" : "−"}${Math.abs(s)}%`}</span>
                ))}
            </div>
            <div className="flex justify-between text-100 text-muted-foreground">
                <span>cheaper</span><span>dearer</span>
            </div>
        </section>
    );
}
