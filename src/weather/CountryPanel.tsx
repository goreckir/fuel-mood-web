import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { BandGlyph } from "./BandGlyph";
import { HoverTip, WeekTip } from "./Tooltip";
import { BAND_CLASS, HEAT_MAX, bandLabel, changeOver, formatWeek, signed, type Band, type Cell, type MarkerStyle, type PyCell } from "./data";

type Props = {
    view: "country" | "ranking";
    onView: (v: "country" | "ranking") => void;
    country?: string;
    names: Record<string, string>;
    fuelLabel: string;
    weeks: string[];
    index: number;
    series: Record<string, Record<string, Cell>>;
    /** Previous-year window for the PY trend overlay. */
    pySeries: Record<string, Record<string, PyCell>>;
    bands: Band[];
    markerStyle: MarkerStyle;
    onSelect: (code: string | undefined) => void;
    onIndex: (i: number) => void;
};

export function CountryPanel(props: Props) {
    const { view, onView } = props;
    return (
        <aside className="flex max-h-full w-96 flex-col rounded-xl border border-border bg-glass shadow-28 backdrop-blur-md">
            <div role="tablist" className="flex gap-100 border-b border-border p-200">
                {(["country", "ranking"] as const).map((v) => (
                    <button
                        key={v}
                        role="tab"
                        type="button"
                        aria-selected={view === v}
                        onClick={() => onView(v)}
                        className={cn(
                            "flex-1 rounded-lg px-300 py-100 text-300 font-medium focus-visible:outline-2 focus-visible:outline-ring",
                            view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                        )}
                    >
                        {v === "country" ? "Country" : "All countries"}
                    </button>
                ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-400">
                {view === "country" ? <CountryDetails {...props} /> : <Ranking {...props} />}
            </div>
        </aside>
    );
}

function CountryDetails({ country, names, fuelLabel, weeks, index, series, pySeries, bands, markerStyle, onSelect, onIndex }: Props) {
    const cell = country ? series[weeks[index]]?.[country] : undefined;
    if (!country || !cell) {
        return <p className="py-800 text-center text-300 text-muted-foreground">Click a country on the map to see its price weather.</p>;
    }
    const band = bands.find((b) => b.BandCode === cell.band)!;
    const windows = [
        { label: "1 week", value: cell.weather },
        { label: "4 weeks", value: changeOver(series, weeks, index, country, 4) },
        { label: "13 weeks", value: changeOver(series, weeks, index, country, 13) },
        { label: "Since baseline", value: cell.heat },
    ];

    return (
        <div className="space-y-400">
            <header className="flex items-start justify-between">
                <div>
                    <div className="text-200 font-semibold tracking-widest text-muted-foreground">{country} · {fuelLabel}</div>
                    <h2 className="font-heading text-600 font-semibold">{names[country]}</h2>
                </div>
                <button type="button" aria-label="Close" onClick={() => onSelect(undefined)}
                    className="rounded-md p-100 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <X className="icon-size-200" />
                </button>
            </header>

            <div className="flex items-center gap-400">
                <BandGlyph band={cell.band} style={markerStyle} className={markerStyle === "weather" ? "text-[length:var(--icon-size-700)]" : "icon-size-700"} />
                <div>
                    <div className="font-numeric text-600 font-semibold tabular-nums">€{cell.price.toFixed(3)}<span className="text-300 text-muted-foreground"> /L</span></div>
                    <div className="text-300"><span className={cn("font-semibold", BAND_CLASS[cell.band].text)}>{bandLabel(band, markerStyle)}</span> · <span className="tabular-nums">{signed(cell.weather)} w/w · {signed(cell.heat, 0)} vs Feb</span></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-200">
                <Stat label="Baseline price" value={`€${cell.baseline.toFixed(3)}`} hint={formatWeek(cell.baselineWeek)} />
                <Stat label="vs baseline" value={signed(cell.heat)} hint={`since ${formatWeek(cell.baselineWeek, "short")}`}>
                    <div className="mt-100 h-100 rounded-full bg-muted">
                        <div className="h-100 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, cell.heat) / HEAT_MAX * 100)}%`, background: "linear-gradient(90deg, var(--color-heat-cold), var(--color-heat-warm), var(--color-heat-hot))" }} />
                    </div>
                </Stat>
            </div>

            <div className="grid grid-cols-4 gap-100 rounded-lg border border-border p-200 text-center">
                {windows.map((w) => (
                    <div key={w.label}>
                        <div className="text-200 text-muted-foreground">{w.label}</div>
                        <div className="font-numeric text-300 font-semibold tabular-nums">{w.value === undefined ? "—" : signed(w.value)}</div>
                    </div>
                ))}
            </div>

            <div>
                <h3 className="mb-200 text-200 font-semibold tracking-widest text-muted-foreground">WEEK BY WEEK</h3>
                <div className="grid grid-cols-7 gap-100">
                    {weeks.map((w, i) => {
                        const c = series[w]?.[country];
                        return (
                            <HoverTip key={w} className="w-full" tip={c ? <WeekTip week={w} cell={c} bands={bands} markerStyle={markerStyle} /> : formatWeek(w)}>
                            <button
                                type="button"
                                onClick={() => onIndex(i)}
                                className={cn(
                                    "flex w-full flex-col items-center rounded-md py-100 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                                    i === index && "bg-primary text-primary-foreground hover:bg-primary",
                                )}
                            >
                                {c ? <BandGlyph band={c.band} style={markerStyle} className="text-400" /> : <span aria-hidden>·</span>}
                                <span className="whitespace-nowrap text-200 tabular-nums">{formatWeek(w, "short")}</span>
                            </button>
                            </HoverTip>
                        );
                    })}
                </div>
            </div>

            <PyTrendStrip weeks={weeks} index={index} series={series} pySeries={pySeries} country={country} onIndex={onIndex} />
        </div>
    );
}

/** Card-coloured outline behind chart labels so they stay legible over lines. */
const HALO = { paintOrder: "stroke" as const, stroke: "var(--color-card)", strokeWidth: 3, strokeLinejoin: "round" as const };

const CHART_W = 360, CHART_H = 130, PAD_L = 4, PAD_R = 74, PAD_Y = 14;

/** Thermometer gradient mapped onto the chart's y axis (baseline = cold, +HEAT_MAX% = hot). */
function HeatGradient({ id, y0, y1 }: { id: string; y0: number; y1: number }) {
    return (
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y0} y2={y1}>
            <stop offset="0" stopColor="var(--color-heat-cold)" />
            <stop offset="0.5" stopColor="var(--color-heat-warm)" />
            <stop offset="1" stopColor="var(--color-heat-hot)" />
        </linearGradient>
    );
}

/**
 * Price trend vs previous year: this year's Heat curve (solid) with the previous year's (dotted) laid over it.
 * Both are % change against their own Baseline (last Bulletin week before 28 Feb), aligned week by week from it;
 * the 0% line is labelled at its left end with both baseline prices.
 */
function PyTrendStrip({ weeks, index, series, pySeries, country, onIndex }: Pick<Props, "weeks" | "index" | "series" | "pySeries" | "onIndex"> & { country: string }) {
    const [hover, setHover] = useState<number>();
    const pyWeeks = Object.keys(pySeries).sort();
    const now = weeks.map((w) => series[w]?.[country]?.heat);
    const py = weeks.map((_, i) => pySeries[pyWeeks[i]]?.[country]?.heat);
    const values = [...now, ...py, 0].filter((v): v is number => v !== undefined);
    if (values.length < 3) return null;

    const yMax = Math.max(...values) + 2, yMin = Math.min(...values) - 2;
    const x = (i: number) => PAD_L + (i / (weeks.length - 1)) * (CHART_W - PAD_L - PAD_R);
    const y = (v: number) => PAD_Y + (1 - (v - yMin) / (yMax - yMin)) * (CHART_H - 2 * PAD_Y);
    const path = (vs: (number | undefined)[]) =>
        vs.map((v, i) => (v === undefined ? "" : `${i && vs[i - 1] !== undefined ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ");
    const lastIndex = (vs: (number | undefined)[]) => vs.reduce<number>((acc, v, i) => (v === undefined ? acc : i), -1);
    const nowEnd = lastIndex(now), pyEnd = lastIndex(py);
    const base = series[weeks[0]]?.[country];
    const pyBase = pySeries[pyWeeks[0]]?.[country];
    const year = weeks[0].slice(0, 4), pyYear = pyWeeks[0]?.slice(0, 4);
    const gradientId = `py-heat-${country}`;
    // Keep the two end labels apart when the curves finish close together.
    let nowLabelY = y(now[nowEnd]!) + 4, pyLabelY = y(py[pyEnd]!) + 4;
    if (Math.abs(nowLabelY - pyLabelY) < 13) {
        const mid = (nowLabelY + pyLabelY) / 2;
        [nowLabelY, pyLabelY] = now[nowEnd]! >= py[pyEnd]! ? [mid - 7, mid + 7] : [mid + 7, mid - 7];
    }

    return (
        <div>
            <h3 className="text-200 font-semibold tracking-widest text-muted-foreground">PRICE TREND · PREVIOUS YEAR (PY)</h3>
            <div className="mb-200 text-200 text-muted-foreground">
                <p>Change since each year's own February baseline, week by week.</p>
                {/* Two aligned rows: the "=" signs line up because the labels sit in their own column */}
                <dl className="mt-100 grid grid-cols-[auto_1fr] gap-x-200 tabular-nums">
                    <dt>Solid</dt>
                    <dd>= {year} (baseline €{base?.baseline.toFixed(3)}, {base && formatWeek(base.baselineWeek, "short")})</dd>
                    <dt>Dotted</dt>
                    <dd>= {pyYear} (baseline €{pyBase?.baseline.toFixed(3)}, {pyBase && formatWeek(pyBase.baselineWeek, "short")})</dd>
                </dl>
            </div>
            <div className="relative rounded-lg border border-border p-200" onMouseLeave={() => setHover(undefined)}>
                <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full text-muted-foreground" role="img"
                    aria-label={`Change since baseline for ${country}: ${year} ${now[nowEnd] !== undefined ? signed(now[nowEnd]!) : ""}, ${pyYear} ${py[pyEnd] !== undefined ? signed(py[pyEnd]!) : ""}`}>
                    <defs><HeatGradient id={gradientId} y0={y(0)} y1={y(HEAT_MAX)} /></defs>
                    <line x1={PAD_L} x2={x(Math.max(nowEnd, pyEnd))} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.7} strokeDasharray="4 3" />
                    <path d={path(py)} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="1 3" strokeLinecap="round" />
                    <path d={path(now)} fill="none" stroke={`url(#${gradientId})`} strokeWidth={2.5} strokeLinejoin="round" />
                    {nowEnd >= 0 && (
                        <text x={x(nowEnd) + 6} y={nowLabelY} fontSize={11} {...HALO} fontWeight={600} className="fill-foreground">{year} {signed(now[nowEnd]!, 0)}</text>
                    )}
                    {pyEnd >= 0 && (
                        <text x={x(pyEnd) + 6} y={pyLabelY} fontSize={11} {...HALO} fill="currentColor">{pyYear} {signed(py[pyEnd]!, 0)}</text>
                    )}
                    <line x1={x(index)} x2={x(index)} y1={PAD_Y} y2={CHART_H - PAD_Y} stroke="currentColor" strokeOpacity={0.35} />
                    {hover !== undefined && (
                        <>
                            <line x1={x(hover)} x2={x(hover)} y1={PAD_Y} y2={CHART_H - PAD_Y} stroke="currentColor" strokeOpacity={0.6} strokeDasharray="2 2" />
                            {now[hover] !== undefined && <circle cx={x(hover)} cy={y(now[hover]!)} r={3.5} fill="var(--color-primary)" stroke="var(--color-card)" strokeWidth={1.5} />}
                            {py[hover] !== undefined && <circle cx={x(hover)} cy={y(py[hover]!)} r={3} fill="currentColor" stroke="var(--color-card)" strokeWidth={1.5} />}
                        </>
                    )}
                    {weeks.map((w, i) => (
                        <rect key={w} x={x(i) - (CHART_W / weeks.length) / 2} y={0} width={CHART_W / weeks.length} height={CHART_H} fill="transparent"
                            className="cursor-pointer" onClick={() => onIndex(i)} onMouseEnter={() => setHover(i)} />
                    ))}
                </svg>
                {hover !== undefined && (
                    <div role="tooltip"
                        className="pointer-events-none absolute top-200 z-20 rounded-lg border border-border bg-popover px-200 py-100 text-200 text-popover-foreground shadow-16"
                        // Beside the hovered week (left of it in the right half, right of it in the left half), inside the chart box
                        style={{
                            left: `${(x(hover) / CHART_W) * 100}%`,
                            transform: x(hover) > CHART_W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
                        }}>
                        <div className="font-semibold">{formatWeek(weeks[hover], "short")} · week {hover + 1}</div>
                        <div className="grid grid-cols-[auto_auto] gap-x-300 tabular-nums">
                            <span>{year}</span><span className="text-right font-semibold">{now[hover] !== undefined ? signed(now[hover]!) : "—"}</span>
                            <span className="text-muted-foreground">{pyYear}</span><span className="text-right text-muted-foreground">{py[hover] !== undefined ? signed(py[hover]!) : "—"}</span>
                        </div>
                    </div>
                )}
                <div className="mt-100 flex justify-between text-200 text-muted-foreground">
                    <span>{formatWeek(weeks[0], "short")}</span>
                    <span>{formatWeek(weeks[weeks.length - 1], "short")}</span>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, hint, children }: { label: string; value: string; hint: string; children?: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-border p-300">
            <div className="text-200 text-muted-foreground">{label}</div>
            <div className="font-numeric text-500 font-semibold tabular-nums">{value}</div>
            <div className="text-200 text-muted-foreground">{hint}</div>
            {children}
        </div>
    );
}

function Ranking({ names, weeks, index, series, country, markerStyle, onSelect, onView }: Props) {
    const rows = Object.entries(series[weeks[index]] ?? {}).sort(([, a], [, b]) => b.weather - a.weather);
    return (
        <table className="w-full text-300">
            <thead>
                <tr className="text-left text-200 text-muted-foreground">
                    <th className="pb-200 font-medium">Country</th>
                    <th className="pb-200 text-right font-medium">w/w</th>
                    <th className="pb-200 text-right font-medium">vs Feb</th>
                    <th className="pb-200 text-right font-medium">€/L</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([code, c]) => (
                    <tr key={code}
                        onClick={() => { onSelect(code); onView("country"); }}
                        className={cn("cursor-pointer border-t border-border hover:bg-accent", code === country && "bg-accent")}>
                        <td className="py-100">
                            <span className="inline-flex items-center gap-200"><BandGlyph band={c.band} style={markerStyle} />{names[code]}</span>
                        </td>
                        <td className={cn("py-100 text-right font-semibold tabular-nums", BAND_CLASS[c.band].text)}>{signed(c.weather)}</td>
                        <td className="py-100 text-right tabular-nums">{signed(c.heat)}</td>
                        <td className="py-100 text-right tabular-nums">{c.price.toFixed(3)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
