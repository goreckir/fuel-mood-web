// Styled tooltips replacing the browser's native `title` bubbles.

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { BandGlyph } from "./BandGlyph";
import { BAND_CLASS, bandLabel, formatWeek, signed, type Band, type Cell, type MarkerStyle } from "./data";

const CARD = "pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-16";

/**
 * Small bubble shown above (or below) its trigger on hover or keyboard focus.
 * Rendered in a portal with `position: fixed`, so scrolling panels can't clip it or grow a scrollbar.
 */
export function HoverTip({ tip, children, className, side = "top" }: { tip: ReactNode; children: ReactNode; className?: string; side?: "top" | "bottom" }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number }>();
    const show = () => {
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ x: r.left + r.width / 2, y: side === "top" ? r.top : r.bottom });
    };
    const hide = () => setPos(undefined);
    return (
        <span ref={ref} className={cn("inline-flex", className)}
            onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
            {children}
            {pos && createPortal(
                <span role="tooltip"
                    className={cn(CARD, "fixed z-50 whitespace-nowrap px-200 py-100 text-200")}
                    style={{
                        // Keep the bubble on screen near the viewport edges
                        left: Math.min(Math.max(pos.x, 120), window.innerWidth - 120),
                        top: pos.y,
                        transform: side === "top" ? "translate(-50%, calc(-100% - 6px))" : "translate(-50%, 6px)",
                    }}>
                    {tip}
                </span>,
                document.body,
            )}
        </span>
    );
}

/** One-line tooltip content for a Bulletin week: date, band glyph + name, weekly change and price. */
export function WeekTip({ week, cell, bands, markerStyle }: { week: string; cell: Cell; bands: Band[]; markerStyle: MarkerStyle }) {
    const band = bands.find((b) => b.BandCode === cell.band);
    return (
        <span className="flex items-center gap-200">
            <span className="font-semibold">{formatWeek(week, "short")}</span>
            <BandGlyph band={cell.band} style={markerStyle} />
            {band && <span className={cn("font-medium", BAND_CLASS[cell.band].text)}>{bandLabel(band, markerStyle)}</span>}
            <span className="tabular-nums">{signed(cell.weather)} w/w</span>
            <span className="tabular-nums text-muted-foreground">€{cell.price.toFixed(3)}</span>
        </span>
    );
}

type CountryCardProps = {
    name: string;
    code: string;
    fuelLabel: string;
    week: string;
    cell: Cell;
    bands: Band[];
    markerStyle: MarkerStyle;
    /** Position in px inside the map container (the card sits above this point). */
    x: number;
    y: number;
};

/** Hover card for a Country on the map. */
export function CountryCard({ name, code, fuelLabel, week, cell, bands, markerStyle, x, y }: CountryCardProps) {
    const band = bands.find((b) => b.BandCode === cell.band);
    return (
        <div role="tooltip" className={cn(CARD, "absolute z-20 w-60 p-300 text-200")}
            style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 14px))" }}>
            <div className="flex items-baseline justify-between gap-200">
                <span className="font-heading text-300 font-semibold">{name}</span>
                <span className="text-muted-foreground">{code} · {fuelLabel}</span>
            </div>
            <div className="mt-200 flex items-center gap-200">
                <BandGlyph band={cell.band} style={markerStyle} className={markerStyle === "weather" ? "text-500" : "icon-size-500"} />
                <div>
                    <div className="font-numeric text-400 font-semibold tabular-nums">€{cell.price.toFixed(3)}<span className="text-200 text-muted-foreground"> /L</span></div>
                    {band && <div className={cn("font-medium", BAND_CLASS[cell.band].text)}>{bandLabel(band, markerStyle)}</div>}
                </div>
            </div>
            <dl className="mt-200 grid grid-cols-[1fr_auto] gap-x-300 gap-y-100 border-t border-border pt-200 tabular-nums">
                <dt className="text-muted-foreground">vs previous week</dt>
                <dd className={cn("text-right font-semibold", BAND_CLASS[cell.band].text)}>{signed(cell.weather)}</dd>
                <dt className="text-muted-foreground">vs baseline ({formatWeek(cell.baselineWeek, "short")})</dt>
                <dd className="text-right font-semibold">{signed(cell.heat)}</dd>
                <dt className="text-muted-foreground">Baseline price</dt>
                <dd className="text-right">€{cell.baseline.toFixed(3)}</dd>
            </dl>
            <div className="mt-200 text-muted-foreground">Bulletin week {formatWeek(week)} · click for details</div>
        </div>
    );
}
