import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { BandGlyph } from "./BandGlyph";
import { HoverTip } from "./Tooltip";
import { bandFor, euAverageWeather, formatWeek, signed, type Band, type Cell, type MarkerStyle } from "./data";

type Props = {
    weeks: string[];
    series: Record<string, Record<string, Cell>>;
    bands: Band[];
    index: number;
    playing: boolean;
    markerStyle: MarkerStyle;
    onIndex: (i: number) => void;
    onPlaying: (p: boolean) => void;
};

/** Week slider with Play; above each week the EU-27 average Weather, so the timeline doubles as an EU Weather strip. */
export function Timeline({ weeks, series, bands, index, playing, markerStyle, onIndex, onPlaying }: Props) {
    const eu = euAverageWeather(series[weeks[index]]);
    return (
        <section aria-label="Bulletin week" className="flex w-full max-w-4xl items-center gap-400 rounded-xl border border-border bg-glass px-400 py-300 shadow-16 backdrop-blur-md">
            <button
                type="button"
                onClick={() => onPlaying(!playing)}
                aria-label={playing ? "Pause" : "Play weeks"}
                className="flex size-800 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
            >
                {playing ? <Pause className="icon-size-200" /> : <Play className="icon-size-200" />}
            </button>

            <div className="min-w-0 flex-1">
                {/* One equal column per week, so the row always fits the slider width; glyphs shrink when space is tight */}
                <div className="grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }} aria-hidden>
                    {weeks.map((w, i) => (
                        <HoverTip key={w} className="min-w-0 justify-center" tip={<span className="tabular-nums"><b>{formatWeek(w, "short")}</b> · EU-27 average {signed(euAverageWeather(series[w]), 2)} w/w</span>}>
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => { onPlaying(false); onIndex(i); }}
                                className={cn("flex w-full min-w-0 justify-center text-200 leading-none transition-opacity", i === index ? "scale-125" : "opacity-60 hover:opacity-100")}
                            >
                                <BandGlyph band={bandFor(euAverageWeather(series[w]), bands).BandCode} style={markerStyle}
                                    className={markerStyle === "weather" ? "text-[length:min(12px,100%)]" : "aspect-square h-auto w-full max-w-4"} />
                            </button>
                        </HoverTip>
                    ))}
                </div>
                <input
                    type="range"
                    min={0}
                    max={weeks.length - 1}
                    value={index}
                    onChange={(e) => { onPlaying(false); onIndex(Number(e.target.value)); }}
                    aria-label="Bulletin week"
                    aria-valuetext={formatWeek(weeks[index])}
                    className="mt-100 w-full accent-primary"
                />
                <div className="flex justify-between text-200 text-muted-foreground">
                    <span>{formatWeek(weeks[0], "short")}</span>
                    <span>{formatWeek(weeks[weeks.length - 1], "short")}</span>
                </div>
            </div>

            <div className="shrink-0 text-right">
                <div className="font-heading text-400 font-semibold tabular-nums">{formatWeek(weeks[index])}</div>
                <div className="text-200 text-muted-foreground">EU-27 average {signed(eu, 2)}</div>
            </div>
        </section>
    );
}
