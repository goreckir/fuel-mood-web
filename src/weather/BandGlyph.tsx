import { ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, ChevronsUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BAND_CLASS, BAND_ICON, type MarkerStyle } from "./data";

const BAND_ARROW: Record<string, LucideIcon> = {
    falling: ArrowDownRight,
    sun: ArrowRight,
    sunny_spells: ArrowUpRight,
    cloudy: ArrowUpRight,
    rain: ArrowUp,
    storm: ChevronsUp,
};

const MOOD_CLASS: Record<string, string> = {
    falling: "bg-mood-falling", sun: "bg-mood-sun", sunny_spells: "bg-mood-sunny-spells",
    cloudy: "bg-mood-cloudy", rain: "bg-mood-rain", storm: "bg-mood-storm",
};

/**
 * The Weather band as a weather icon (emoji), a mood face or a coloured arrow.
 * Faces: Fluent Emoji, High Contrast style, © Microsoft Corporation, MIT (public/mood/*.svg + LICENSE).
 * The single-colour SVG is used as a CSS mask, so the face takes its band colour (green -> red) from theme tokens.
 */
export function BandGlyph({ band, style, className }: { band: string; style: MarkerStyle; className?: string }) {
    if (style === "mood") {
        const mask = `url(${import.meta.env.BASE_URL}mood/${band}.svg) center / contain no-repeat`;
        return <span aria-hidden className={cn("icon-size-200 inline-block shrink-0", MOOD_CLASS[band], className)}
            style={{ mask, WebkitMask: mask }} />;
    }
    if (style === "arrows") {
        const Arrow = BAND_ARROW[band];
        return <Arrow className={cn("icon-size-200 shrink-0", BAND_CLASS[band].text, className)} strokeWidth={2.75} aria-hidden />;
    }
    return <span className={cn("leading-none", className)} aria-hidden>{BAND_ICON[band]}</span>;
}
