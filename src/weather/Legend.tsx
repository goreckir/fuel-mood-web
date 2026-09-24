import { useState } from "react";
import { ChevronDown, ChevronUp, Thermometer } from "lucide-react";

import { cn } from "@/lib/utils";
import { BandGlyph } from "./BandGlyph";
import { BAND_CLASS, HEAT_MAX, MARKER_STYLES, MARKER_VALUES, STYLE_HEADING, bandLabel, bandRange, type Band, type MarkerStyle, type MarkerValue } from "./data";

const HEAT_STEPS = [0, 10, 20, 30, 40, HEAT_MAX];

type Props = {
    bands: Band[];
    baselineWeek: string;
    heatRange?: [number, number];
    onHeatRange: (range: [number, number] | undefined) => void;
    markerStyle: MarkerStyle;
    onMarkerStyle: (s: MarkerStyle) => void;
    markerValue: MarkerValue;
    onMarkerValue: (v: MarkerValue) => void;
};

/** Thermometer (Heat) + Weather bands. Clicking a Heat step highlights its Countries on the map. */
export function Legend({ bands, baselineWeek, heatRange, onHeatRange, markerStyle, onMarkerStyle, markerValue, onMarkerValue }: Props) {
    // Collapsed by default on narrower screens so the legend doesn't cover Iberia.
    const [open, setOpen] = useState(() => window.innerWidth >= 1280);
    return (
        <section aria-label="Legend" className="w-80 rounded-xl border border-border bg-glass p-400 shadow-16 backdrop-blur-md">
            <h2 className="mb-200 flex items-center gap-100 font-heading text-300 font-semibold">
                <Thermometer className="icon-size-200" aria-hidden /> Price
                <span className="font-base text-200 font-normal text-muted-foreground">% change vs baseline · {baselineWeek}</span>
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Collapse legend" : "Expand legend"}
                    className="ml-auto rounded-md p-100 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    {open ? <ChevronDown className="icon-size-200" /> : <ChevronUp className="icon-size-200" />}
                </button>
            </h2>
            <div
                className="h-200 rounded-full"
                style={{ background: "linear-gradient(90deg, var(--color-heat-cold), var(--color-heat-warm), var(--color-heat-hot))" }}
                aria-hidden
            />
            <div className="mt-100 grid grid-cols-5 gap-100">
                {HEAT_STEPS.slice(0, -1).map((from, i) => {
                    const to = i === HEAT_STEPS.length - 2 ? Infinity : HEAT_STEPS[i + 1];
                    const active = heatRange?.[0] === from;
                    return (
                        <button
                            key={from}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onHeatRange(active ? undefined : [from, to])}
                            className={cn(
                                "whitespace-nowrap rounded-md px-100 py-100 text-200 tabular-nums text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                                active && "bg-primary text-primary-foreground hover:bg-primary",
                            )}
                        >
                            {to === Infinity ? `${from}+` : `${from}–${to}`}
                        </button>
                    );
                })}
            </div>

            {open && (<>
            <h2 className="mb-200 mt-400 font-heading text-300 font-semibold">
                {STYLE_HEADING[markerStyle]} <span className="font-base text-200 font-normal text-muted-foreground">change vs previous week</span>
            </h2>
            <div className="mb-200 flex items-center gap-200 text-200 text-muted-foreground">
                Markers
                <div role="radiogroup" aria-label="Marker style" className="flex rounded-full border border-border p-100">
                    {MARKER_STYLES.map(({ style, label }) => (
                        <button key={style} type="button" role="radio" aria-checked={markerStyle === style} onClick={() => onMarkerStyle(style)}
                            className={cn("rounded-full px-200 text-200 font-medium focus-visible:outline-2 focus-visible:outline-ring",
                                markerStyle === style ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mb-200 flex items-center gap-200 text-200 text-muted-foreground">
                On markers
                <div role="radiogroup" aria-label="Marker value" className="flex rounded-full border border-border p-100">
                    {MARKER_VALUES.map(({ value, label }) => (
                        <button key={value} type="button" role="radio" aria-checked={markerValue === value} onClick={() => onMarkerValue(value)}
                            className={cn("rounded-full px-200 text-200 font-medium focus-visible:outline-2 focus-visible:outline-ring",
                                markerValue === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="mb-200 text-200 text-muted-foreground">
                {markerValue === "week"
                    ? "The number on a country is the change vs the previous week (w/w). The country colour is the change since the Baseline price."
                    : "The number on a country is the change since the Baseline price, the same as its colour. Switch to Week for this week's change."}
            </p>
            <ul className="grid grid-cols-1 gap-100">
                {bands.map((b) => (
                    <li key={b.BandCode} className="flex items-center gap-200 text-200">
                        <span className="flex w-600 justify-center py-100 text-400">
                            <BandGlyph band={b.BandCode} style={markerStyle} />
                        </span>
                        <span className={cn("w-24 font-medium", BAND_CLASS[b.BandCode].text)}>{bandLabel(b, markerStyle)}</span>
                        <span className="tabular-nums text-muted-foreground">{bandRange(b, bands)}</span>
                    </li>
                ))}
            </ul>

            <p className="mt-400 text-200 leading-relaxed text-muted-foreground">
                Source: European Commission, Weekly Oil Bulletin. © European Union, 2005–2026,{" "}
                <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
                Changes computed by Fuel Mood. Made with Natural Earth. Mood faces: Fluent Emoji © Microsoft, MIT. Shows recent changes, not a forecast.
            </p>
            </>)}
        </section>
    );
}
