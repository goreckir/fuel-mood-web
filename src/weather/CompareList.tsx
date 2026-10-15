// Country comparison list: Countries by Price level (cheapest first) with Rank, the EU average row and bars
// anchored at the Net | Taxes boundary. Rows glide to their new place when Ranks change (FLIP, no dependency).

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { euro, formatWeek, gapColour, signed, taxShareLabel, type GapColours, type PriceComponent } from "./data";

/** One Country (or the EU average) in the comparison; Net, Taxes and Pump are from the same Bulletin week as `level`. */
export type CompareRow = {
    code: string;
    name: string;
    /** Price level of the selected Price component, €/L. */
    level: number;
    /** Bulletin week of `level`: the Selected week, or the last available one. */
    levelWeek: string;
    net: number;
    taxes: number;
    pump: number;
    /** Gap to EU average, %. */
    gap: number;
    rank: number;
};

export type EuRow = Omit<CompareRow, "code" | "name" | "gap" | "rank">;

type Props = {
    rows: CompareRow[];
    eu: EuRow;
    component: PriceComponent;
    componentName: string;
    fuelLabel: string;
    week: string;
    selected?: string;
    hovered?: string;
    gapColours: GapColours;
    onSelect: (code: string | undefined) => void;
    onHover: (code: string | undefined) => void;
};

const EU_KEY = "EU";

export function CompareList({ rows, eu, component, componentName, fuelLabel, week, selected, hovered, gapColours, onSelect, onHover }: Props) {
    // The EU average row sits where its Price level belongs, without a Rank.
    const euAt = rows.findIndex((r) => r.level > eu.level);
    const items: (CompareRow | (EuRow & { code: typeof EU_KEY }))[] = [...rows];
    items.splice(euAt < 0 ? rows.length : euAt, 0, { ...eu, code: EU_KEY });

    // Shared axis: Net grows left of the anchor, Taxes right of it; the whole bar is the Pump price.
    const maxNet = Math.max(eu.net, ...rows.map((r) => r.net));
    const maxTaxes = Math.max(eu.taxes, ...rows.map((r) => r.taxes));
    const total = maxNet + maxTaxes;
    const anchor = (maxNet / total) * 100;

    const listRef = useRef<HTMLOListElement>(null);
    const tops = useRef(new Map<string, number>());
    const order = items.map((i) => i.code).join();
    // FLIP: after a re-order, start each row at its old offset and let it glide to the new one.
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        for (const el of Array.from(list.children) as HTMLElement[]) {
            const key = el.dataset.code!;
            const before = tops.current.get(key);
            const now = el.offsetTop;
            tops.current.set(key, now);
            if (reduce || before === undefined || before === now) continue;
            // Web Animations leave no inline style behind, so a row can never get stuck at an offset.
            el.getAnimations().forEach((a) => a.cancel());
            el.animate([{ transform: `translateY(${before - now}px)` }, { transform: "none" }],
                { duration: 450, easing: "cubic-bezier(0.2, 0, 0, 1)" });
        }
    }, [order]);

    // Keep the selected Country's row in view when it is picked on the map.
    useLayoutEffect(() => {
        const list = listRef.current;
        const el = selected ? list?.querySelector<HTMLElement>(`[data-code="${selected}"]`) : undefined;
        if (!list || !el) return;
        // Scroll only the list (scrollIntoView would also move the page on mobile).
        const pad = 8;
        if (el.offsetTop - pad < list.scrollTop) list.scrollTop = el.offsetTop - pad;
        else if (el.offsetTop + el.offsetHeight + pad > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight + pad - list.clientHeight;
    }, [selected]);

    const strong = { net: component !== "taxes", taxes: component !== "net" };

    return (
        <section aria-label="Country comparison" className="flex h-full min-h-0 flex-col">
            <header className="border-b border-border px-400 pb-200 pt-300">
                <h2 className="font-heading text-400 font-semibold">{componentName} by Country · {fuelLabel}</h2>
                <p className="text-200 text-muted-foreground">Cheapest first · {formatWeek(week)} · Gap to the EU average</p>
                <div className="mt-200 grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] gap-x-200 gap-y-100 text-100 font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-[1.5rem_8.5rem_minmax(0,1fr)_3.5rem]" aria-hidden>
                    <span className="text-right">#</span>
                    <span className="hidden sm:block">Country</span>
                    <span className="relative col-span-3 col-start-1 row-start-2 mx-[3rem] block h-300 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                        <span className="absolute mr-100 whitespace-nowrap" style={{ right: `${100 - anchor}%` }}>← Net</span>
                        <span className="absolute ml-100 whitespace-nowrap" style={{ left: `${anchor}%` }}>Taxes →</span>
                    </span>
                    <span className="col-start-3 row-start-1 text-right sm:col-start-4">vs EU</span>
                </div>
            </header>

            <ol ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-200 py-100">
                {items.map((item) => {
                    const isEu = item.code === EU_KEY;
                    const row = isEu ? undefined : (item as CompareRow);
                    const name = row ? row.name : "EU average";
                    const valueAt = component === "net" ? anchor - (item.net / total) * 100 : anchor + (item.taxes / total) * 100;
                    const stale = item.levelWeek !== week;
                    return (
                        <li key={item.code} data-code={item.code} className="relative">
                            <button
                                type="button"
                                aria-current={row && row.code === selected ? "true" : undefined}
                                aria-label={row
                                    ? `Rank ${row.rank}, ${name}: ${componentName} ${euro(item.level)}, ${signed(row.gap, 0)} vs EU average`
                                    : `EU average: ${componentName} ${euro(item.level)}`}
                                onClick={() => row && onSelect(row.code === selected ? undefined : row.code)}
                                onMouseEnter={() => onHover(row?.code)}
                                onMouseLeave={() => onHover(undefined)}
                                onFocus={() => onHover(row?.code)}
                                onBlur={() => onHover(undefined)}
                                className={cn(
                                    "grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] items-center gap-x-200 gap-y-100 rounded-lg px-200 py-100 text-left text-300",
                                    "sm:grid-cols-[1.5rem_8.5rem_minmax(0,1fr)_3.5rem]",
                                    "focus-visible:outline-2 focus-visible:outline-ring",
                                    isEu ? "cursor-default border border-primary/40 bg-primary/10 font-semibold" : "hover:bg-accent",
                                    row && row.code === hovered && "bg-accent",
                                    row && row.code === selected && "ring-2 ring-selected",
                                )}
                            >
                                <span className="text-right font-numeric text-200 tabular-nums text-muted-foreground">{row?.rank ?? ""}</span>
                                <span className="min-w-0 truncate">
                                    {name}
                                    {component === "taxes" && <span className="ml-100 text-200 font-normal text-muted-foreground">{taxShareLabel(item.taxes, item.pump)} tax</span>}
                                    {stale && <span className="ml-100 text-200 font-normal text-muted-foreground">({formatWeek(item.levelWeek, "short")})</span>}
                                </span>
                                {/* On narrow screens the bar takes its own line under the name */}
                                <span className="relative col-span-3 col-start-1 row-start-2 mx-[3rem] block h-300 sm:col-span-1 sm:col-start-3 sm:row-start-1" aria-hidden>
                                    <span className="absolute inset-y-0 w-px bg-border" style={{ left: `${anchor}%` }} />
                                    <span className={cn("absolute inset-y-0 rounded-l-sm transition-[width,right] duration-500", strong.net ? "bg-primary" : "bg-primary/20")}
                                        style={{ right: `${100 - anchor}%`, width: `${(item.net / total) * 100}%` }} />
                                    <span className={cn("absolute inset-y-0 rounded-r-sm transition-[width] duration-500", strong.taxes ? "bg-muted-foreground/70" : "bg-muted-foreground/20")}
                                        style={{ left: `${anchor}%`, width: `${(item.taxes / total) * 100}%` }} />
                                    {/* €/L of the selected component at the end of its segment (Pump: the bar end) */}
                                    <span className={cn("absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-numeric text-200 font-semibold tabular-nums transition-[left] duration-500",
                                        component === "net" ? "-translate-x-full pr-100" : "pl-100")}
                                        style={{ left: `${valueAt}%` }}>
                                        {euro(item.level)}
                                    </span>
                                </span>
                                <span className="flex items-center justify-end gap-100 font-numeric text-200 tabular-nums">
                                    {row ? (
                                        <>
                                            <span className="size-200 shrink-0 rounded-sm" style={{ backgroundColor: gapColour(row.gap, gapColours) }} aria-hidden />
                                            {signed(row.gap, 0)}
                                        </>
                                    ) : <span className="text-muted-foreground">ref.</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <p className="border-t border-border px-400 py-200 text-200 text-muted-foreground">
                EC caveat: national averages are collected in different ways, so cross-country comparisons have limited validity.{" "}
                <a href="#info" className="underline hover:text-foreground">More</a>
            </p>
        </section>
    );
}
