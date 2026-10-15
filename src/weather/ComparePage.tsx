// Country comparison page: Price levels side by side, with the EC EU average as the reference (levels, not changes).
// Fuel, Price component, Selected week and the selected Country come from App, so they are shared with the map page.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { List, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CompareList, type CompareRow, type EuRow } from "./CompareList";
import { CompareMap } from "./CompareMap";
import { Timeline } from "./Timeline";
import {
    componentSeries, cssVar, euro, gapToEu, lastAvailable, priceLevel, rank,
    type FuelCode, type Geo, type PriceComponent, type Weather,
} from "./data";

type Props = {
    geo?: Geo;
    weather?: Weather;
    error?: string;
    brand: ReactNode;
    controls: ReactNode;
    fuel: FuelCode;
    fuelLabel: string;
    component: PriceComponent;
    componentName: string;
    weeks: string[];
    index: number;
    isDark: boolean;
    country?: string;
    onCountry: (code: string | undefined) => void;
    playing: boolean;
    onPlaying: (p: boolean) => void;
    onIndex: (i: number) => void;
};

/** Desktop shows map and list side by side; below this width a Map / List toggle shows one of them. */
const WIDE = "(min-width: 768px)";

export function ComparePage(props: Props) {
    const { geo, weather, error, brand, controls, fuel, fuelLabel, component, componentName, weeks, index, isDark, country, onCountry, playing, onPlaying, onIndex } = props;
    const wide = useMediaQuery(WIDE);
    const [mobileView, setMobileView] = useState<"map" | "list">("list");
    const [hovered, setHovered] = useState<string>();
    const week = weeks[index];

    const names = useMemo(() => Object.fromEntries((geo?.features ?? []).map((f) => [f.properties.code, f.properties.name])), [geo]);

    const comparison = useMemo(() => {
        if (!weather || !week) return undefined;
        const series = componentSeries(weather, component, fuel);
        const pump = weather.fuels[fuel], net = weather.net[fuel], taxes = weather.taxes[fuel];
        // The EU average for the Selected week (or its last available week), per Price component.
        const euOf = (c: PriceComponent) => lastAvailable(weather.euAverage[c][fuel], weeks, index);
        const euLevel = euOf(component);
        if (!euLevel) return undefined;
        const eu: EuRow = {
            level: euLevel.value, levelWeek: euLevel.week,
            net: euOf("net")?.value ?? 0, taxes: euOf("taxes")?.value ?? 0, pump: euOf("pump")?.value ?? 0,
        };
        const codes = Object.keys(pump[weeks[weeks.length - 1]] ?? {});
        const rows = rank(codes.flatMap((code) => {
            const level = priceLevel(series, weeks, index, code);
            if (!level) return [];
            // Bars use the same Bulletin week as the Price level.
            const at = weeks.indexOf(level.week);
            return [{
                code, name: names[code] ?? code, level: level.price, levelWeek: level.week,
                net: priceLevel(net, weeks, at, code)?.price ?? 0,
                taxes: priceLevel(taxes, weeks, at, code)?.price ?? 0,
                pump: priceLevel(pump, weeks, at, code)?.price ?? 0,
                gap: gapToEu(level.price, eu.level),
            }];
        })) satisfies CompareRow[];
        return { eu, rows, byCode: Object.fromEntries(rows.map((r) => [r.code, r])) };
    }, [weather, week, weeks, index, component, fuel, names]);

    // Gap colours for the list swatches; theme tokens, read a tick after the theme class toggles.
    const [gapColours, setGapColours] = useState(readGapColours);
    useEffect(() => {
        const timer = setTimeout(() => setGapColours(readGapColours()), 0);
        return () => clearTimeout(timer);
    }, [isDark]);

    const showMap = wide || mobileView === "map";
    const showList = wide || mobileView === "list";

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-background">
            <div className="flex flex-wrap items-start justify-between gap-200 p-400 pb-200">
                {brand}
                {controls}
            </div>

            {!wide && (
                <div role="tablist" aria-label="Show" className="mx-400 mb-200 flex gap-100 rounded-lg border border-border p-100">
                    {([["list", "List", List], ["map", "Map", MapIcon]] as const).map(([v, label, Icon]) => (
                        <button key={v} type="button" role="tab" aria-selected={mobileView === v} onClick={() => setMobileView(v)}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-100 rounded-md px-300 py-100 text-300 font-medium focus-visible:outline-2 focus-visible:outline-ring",
                                mobileView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                            )}>
                            <Icon className="icon-size-200" aria-hidden /> {label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div role="alert" className="mx-400 rounded-lg bg-destructive px-400 py-200 text-300 text-destructive-foreground">Could not load data: {error}</div>
            )}
            {!error && !comparison && (
                <div className="flex flex-1 items-center justify-center text-300 text-muted-foreground">Loading Bulletin weeks…</div>
            )}

            {comparison && week && (
                <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-400 px-400 md:grid-cols-[minmax(0,1fr)_minmax(26rem,34rem)]">
                    {showMap && geo && (
                        <div className="relative min-h-0 overflow-hidden rounded-xl border border-border bg-map-sea">
                            <CompareMap geo={geo} rows={comparison.byCode} componentName={componentName} week={week}
                                selected={country} hovered={hovered} isDark={isDark} onSelect={onCountry} onHover={setHovered} />
                        </div>
                    )}
                    {showList && (
                        <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-card">
                            <CompareList rows={comparison.rows} eu={comparison.eu} component={component} componentName={componentName}
                                fuelLabel={fuelLabel} week={week} selected={country} hovered={hovered} gapColours={gapColours}
                                onSelect={onCountry} onHover={setHovered} />
                        </div>
                    )}
                </main>
            )}

            {weather && comparison && week && (
                <div className="flex justify-center p-400 pt-300">
                    <Timeline weeks={weeks} series={componentSeries(weather, component, fuel)} bands={weather.bands} index={index}
                        playing={playing} markerStyle="mood" showWeather={false}
                        caption={<>EU average {euro(comparison.eu.level)}</>}
                        onIndex={onIndex} onPlaying={onPlaying} />
                </div>
            )}
        </div>
    );
}

function readGapColours() {
    return { low: cssVar("--color-gap-low"), mid: cssVar("--color-gap-mid"), high: cssVar("--color-gap-high") };
}

function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);
    return matches;
}
