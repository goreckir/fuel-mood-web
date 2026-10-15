// Data adapter: reads the static snapshot public/europe.geojson + public/weather.json
// (weather.json is rebuilt by scripts/refresh-data.mjs from the EC Weekly Oil Bulletin).

import { useEffect, useState } from "react";

export type CountryProps = { code: string; name: string; isEU: boolean; labelLon: number; labelLat: number };
export type Geo = { type: "FeatureCollection"; features: { type: "Feature"; properties: CountryProps; geometry: GeoJSON.MultiPolygon }[] };
export type Cell = { price: number; baseline: number; baselineWeek: string; heat: number; weather: number; band: string };
export type Band = { BandCode: string; BandName: string; UpperLimitPct: string; SortOrder: string };
export type PyCell = Pick<Cell, "price" | "baseline" | "baselineWeek" | "heat">;
/** Per Fuel: Bulletin week -> Country -> cell. */
type FuelSeries<T> = Record<string, Record<string, Record<string, T>>>;
export type Weather = {
    baselineBefore: string;
    bands: Band[];
    /** Pump price; `net` and `taxes` hold the other Price components in the same shape. */
    fuels: FuelSeries<Cell>;
    net: FuelSeries<Cell>;
    taxes: FuelSeries<Cell>;
    /** Same window one year earlier, each Country against its own last Bulletin week before 28 Feb of that year. */
    previousYear: { baselineBefore: string; fuels: FuelSeries<PyCell>; net: FuelSeries<PyCell>; taxes: FuelSeries<PyCell> };
    /** EU average (EC weighted EU-27) per Price component and Fuel: Bulletin week -> €/L. */
    euAverage: Record<PriceComponent, Record<FuelCode, Record<string, number>>>;
};

export const FUELS = [
    { code: "e95", label: "Euro 95" },
    { code: "diesel", label: "Diesel" },
] as const;
export type FuelCode = (typeof FUELS)[number]["code"];

export const PRICE_COMPONENTS = [
    { code: "pump", label: "Pump", name: "Pump price" },
    { code: "net", label: "Net", name: "Net price" },
    { code: "taxes", label: "Taxes", name: "Taxes" },
] as const;
export type PriceComponent = (typeof PRICE_COMPONENTS)[number]["code"];

/** The weather.json key holding a Price component (Pump price lives in `fuels`, as before components existed). */
const COMPONENT_KEY = { pump: "fuels", net: "net", taxes: "taxes" } as const;

export function componentSeries(weather: Weather, component: PriceComponent, fuel: FuelCode) {
    return weather[COMPONENT_KEY[component]][fuel];
}

export function componentPySeries(weather: Weather, component: PriceComponent, fuel: FuelCode) {
    return weather.previousYear[COMPONENT_KEY[component]][fuel];
}

export const BAND_ICON: Record<string, string> = { falling: "🌈", sun: "☀️", sunny_spells: "🌤️", cloudy: "☁️", rain: "🌧️", storm: "⛈️" };

/** Full class names per Weather band (literal strings so Tailwind can see them). */
export const BAND_CLASS: Record<string, { surface: string; text: string }> = {
    falling: { surface: "bg-band-falling border-band-falling-fg/30", text: "text-band-falling-fg" },
    sun: { surface: "bg-band-sun border-band-sun-fg/30", text: "text-band-sun-fg" },
    sunny_spells: { surface: "bg-band-sunny-spells border-band-sunny-spells-fg/30", text: "text-band-sunny-spells-fg" },
    cloudy: { surface: "bg-band-cloudy border-band-cloudy-fg/30", text: "text-band-cloudy-fg" },
    rain: { surface: "bg-band-rain border-band-rain-fg/30", text: "text-band-rain-fg" },
    storm: { surface: "bg-band-storm border-band-storm-fg/30", text: "text-band-storm-fg" },
};

/** How markers show the Weather band: weather icons, driver's mood (Fluent Emoji faces), or arrows. */
export type MarkerStyle = "weather" | "mood" | "arrows";

/** What the number on a marker shows: this week's change (with the band glyph) or the change since the Baseline. */
export type MarkerValue = "week" | "baseline";

export const MARKER_VALUES: { value: MarkerValue; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "baseline", label: "Baseline" },
];

/** Order of the legend toggle; Mood is the default. */
export const MARKER_STYLES: { style: MarkerStyle; label: string }[] = [
    { style: "mood", label: "Mood" },
    { style: "arrows", label: "Arrows" },
    { style: "weather", label: "Weather" },
];

/** Band names per marker style: weather names come from dim_weather_band, mood and arrow names are UI wording. */
const STYLE_NAME: Record<Exclude<MarkerStyle, "weather">, Record<string, string>> = {
    mood: { falling: "Delighted", sun: "Calm", sunny_spells: "Meh", cloudy: "Uneasy", rain: "Angry", storm: "Furious" },
    arrows: { falling: "Falling", sun: "Stable", sunny_spells: "Edging up", cloudy: "Rising", rain: "Rising fast", storm: "Surging" },
};

/** Legend heading per marker style. */
export const STYLE_HEADING: Record<MarkerStyle, string> = { weather: "Weather", mood: "Mood", arrows: "Price trend" };

export function bandLabel(band: Band, style: MarkerStyle) {
    return style === "weather" ? band.BandName : STYLE_NAME[style][band.BandCode] ?? band.BandName;
}

/** Weekly change + Heat in one consistent format: "+1.7% w/w · +32% vs Feb". */
export const changeLabel = (weather: number, heat: number) => `${signed(weather)} w/w · ${signed(heat, 0)} vs Feb`;

/**
 * Heat thermometer per Price component, in percent: colours run cold (min) → mid (halfway) → hot (max) and clamp outside.
 * Taxes use a diverging scale around 0 (a tax cut is cold, a rise is hot); `steps` are the legend's filter buttons.
 * Colours come from --color-heat-* tokens.
 */
export type HeatScale = { min: number; max: number; mid: "warm" | "neutral"; steps: number[] };
export const HEAT_SCALES: Record<PriceComponent, HeatScale> = {
    pump: { min: 0, max: 50, mid: "warm", steps: [0, 10, 20, 30, 40, 50] },
    net: { min: 0, max: 100, mid: "warm", steps: [0, 20, 40, 60, 80, 100] },
    taxes: { min: -25, max: 25, mid: "neutral", steps: [-25, -15, -5, 5, 15, 25] },
};

/** CSS gradient of a Heat scale, left (min) to right (max). */
export const heatGradient = (scale: HeatScale, direction = "90deg") =>
    `linear-gradient(${direction}, var(--color-heat-cold), var(--color-heat-${scale.mid}), var(--color-heat-hot))`;

/** Position of a Heat value on its scale, 0…1, clamped. */
export const heatPosition = (heat: number, scale: HeatScale) => Math.min(1, Math.max(0, (heat - scale.min) / (scale.max - scale.min)));

/**
 * Gap to EU average colour scale, in percent: cheaper than the EU average (low) → EU average (mid) → dearer (high),
 * clamped at ±30%. Its own palette (--color-gap-* tokens), so it doesn't read as Heat ("change").
 */
export const GAP_SCALE = { min: -30, max: 30, steps: [-30, -15, 0, 15, 30] } as const;

/** CSS gradient of the Gap to EU average scale, left (min) to right (max). */
export const gapGradient = (direction = "90deg") =>
    `linear-gradient(${direction}, var(--color-gap-low), var(--color-gap-mid), var(--color-gap-high))`;

export type GapColours = { low: string; mid: string; high: string };

/** Hex colour of a Gap to EU average, the same linear scale as the comparison map's `fill-color`. */
export function gapColour(gap: number, c: GapColours) {
    const v = (Math.min(GAP_SCALE.max, Math.max(GAP_SCALE.min, gap)) - GAP_SCALE.min) / (GAP_SCALE.max - GAP_SCALE.min) * 2;
    const [from, to, k] = v <= 1 ? [c.low, c.mid, v] : [c.mid, c.high, v - 1];
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
    return `#${[0, 1, 2].map((i) => Math.round(ch(from, i) + (ch(to, i) - ch(from, i)) * k).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Last available value at or before the Selected week (a Country without a price that week keeps its last one,
 * labelled with that Bulletin week).
 */
export function lastAvailable<T>(byWeek: Record<string, T | undefined>, weeks: string[], index: number) {
    for (let i = index; i >= 0; i--) {
        const value = byWeek[weeks[i]];
        if (value !== undefined) return { value, week: weeks[i] };
    }
    return undefined;
}

/** Price level: the €/L of one Price component for a Country in the Selected week (or its last available week). */
export function priceLevel(series: Record<string, Record<string, Cell>>, weeks: string[], index: number, country: string) {
    for (let i = index; i >= 0; i--) {
        const cell = series[weeks[i]]?.[country];
        if (cell) return { price: cell.price, week: weeks[i] };
    }
    return undefined;
}

/** Gap to EU average in percent (negative = cheaper than the EU average). */
export const gapToEu = (level: number, euAverage: number) => (level / euAverage - 1) * 100;

/** Rank 1…n by `level`, lowest first; equal levels share a Rank (1, 2, 2, 4). Returns a new array sorted by Rank. */
export function rank<T extends { level: number }>(items: T[]): (T & { rank: number })[] {
    const sorted = [...items].sort((a, b) => a.level - b.level);
    return sorted.map((item, i) => ({ ...item, rank: i > 0 && item.level === sorted[i - 1].level ? sorted.findIndex((x) => x.level === item.level) + 1 : i + 1 }));
}

/** €/L with 3 decimals, e.g. "€1.734"; `sign` adds + / − for a change. */
export function euro(v: number, sign = false) {
    const r = Math.round(v * 1000) / 1000; // sign follows the rounded value, so −0.0004 shows as "+€0.000"
    return `${sign ? (r >= 0 ? "+" : "−") : ""}€${Math.abs(r).toFixed(3)}`;
}

/** Tax share label, e.g. "44%". */
export const taxShareLabel = (taxes: number, pump: number) => `${Math.round((taxes / pump) * 100)}%`;

export function useWeatherData() {
    const [geo, setGeo] = useState<Geo>();
    const [weather, setWeather] = useState<Weather>();
    const [error, setError] = useState<string>();
    useEffect(() => {
        const base = import.meta.env.BASE_URL;
        const load = (file: string) => fetch(`${base}${file}`).then((r) => {
            if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
            return r.json();
        });
        Promise.all([load("europe.geojson"), load("weather.json")])
            .then(([g, w]) => { setGeo(g); setWeather(w); })
            .catch((e) => setError(String(e)));
    }, []);
    return { geo, weather, error };
}

export function bandFor(changePct: number, bands: Band[]): Band {
    return bands.find((b) => b.UpperLimitPct === "" || changePct <= Number(b.UpperLimitPct)) ?? bands[bands.length - 1];
}

/** Human-readable range of a Weather band, e.g. "≤ +0.5%", "+1% … +3%", "> +4%". */
export function bandRange(band: Band, bands: Band[]): string {
    const i = bands.indexOf(band);
    const prev = i > 0 ? Number(bands[i - 1].UpperLimitPct) : undefined;
    const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v}%`;
    if (band.UpperLimitPct === "") return `> ${fmt(prev!)}`;
    if (prev === undefined) return `≤ ${fmt(Number(band.UpperLimitPct))}`;
    return `${fmt(prev)} … ${fmt(Number(band.UpperLimitPct))}`;
}

/** Price change over the last `weeks` Bulletin weeks, or undefined when the window starts before the data. */
export function changeOver(series: Record<string, Record<string, Cell>>, weeks: string[], index: number, country: string, span: number) {
    if (index - span < 0) return undefined;
    const now = series[weeks[index]]?.[country];
    const then = series[weeks[index - span]]?.[country];
    return now && then ? (now.price / then.price - 1) * 100 : undefined;
}

/** EU-27 average Weather for a week (simple mean of Countries), used on the timeline. */
export function euAverageWeather(cells: Record<string, Cell>): number {
    const values = Object.values(cells).map((c) => c.weather);
    return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}

export const signed = (v: number, digits = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}%`;

export function formatWeek(week: string, style: "short" | "long" = "long") {
    return new Date(`${week}T00:00:00Z`).toLocaleDateString("en-GB", style === "long"
        ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
        : { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Read a CSS custom property from :root (MapLibre paint needs raw colour values, not var()). */
export function cssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function usePersistentState<T extends string>(key: string, fallback: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            return (localStorage.getItem(key) as T | null) ?? fallback;
        } catch {
            return fallback;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(key, value);
        } catch {
            // storage blocked (private mode / iframe policy): keep the in-memory value
        }
    }, [key, value]);
    return [value, setValue] as const;
}
