// Fuel Mood — EU-27 price-mood map and Country comparison. Terms follow ../CONTEXT.md.
// Data is a static snapshot in public/ (see scripts/refresh-data.mjs and docs/adr/0001-committed-data-snapshot.md).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChartBarBig, ChevronDown, ChevronRight, Info, ListOrdered, Moon, Sun, Thermometer, TrendingUp, X } from "lucide-react";

import { COMPACT, SHORT_LANDSCAPE, useMediaQuery } from "@/hooks/use-media-query";
import { useThemeContext } from "@/hooks/theme.context";
import { cn } from "@/lib/utils";
import { ComparePage } from "./weather/ComparePage";
import { CountryPanel, CountryPeek } from "./weather/CountryPanel";
import {
    FUELS, HEAT_SCALES, PRICE_COMPONENTS, componentPySeries, componentSeries, formatWeek, heatGradient, usePersistentState, useWeatherData,
    type FuelCode, type MarkerStyle, type MarkerValue, type PriceComponent,
} from "./weather/data";
import { InfoPage } from "./weather/InfoPage";
import { HoverTip } from "./weather/Tooltip";
import { Legend } from "./weather/Legend";
import { Timeline } from "./weather/Timeline";
import { WeatherMap } from "./weather/WeatherMap";

function App() {
    const { isDark, toggleTheme } = useThemeContext();
    const { geo, weather, error } = useWeatherData();

    const [fuel, setFuel] = usePersistentState<FuelCode>("fw.fuel", "e95");
    const [storedComponent, setComponent] = usePersistentState<PriceComponent>("fw.priceComponent", "pump");
    const priceComponent = PRICE_COMPONENTS.find((c) => c.code === storedComponent) ?? PRICE_COMPONENTS[0];
    const component = priceComponent.code;
    const [country, setCountry] = usePersistentState<string>("fw.country", "PL");
    const [markerStyle, setMarkerStyle] = usePersistentState<MarkerStyle>("fw.markers", "mood");
    const [markerValue, setMarkerValue] = usePersistentState<MarkerValue>("fw.markerValue", "week");
    const [view, setView] = useState<"country" | "ranking">("country");
    const [weekIndex, setWeekIndex] = useState<number>();
    const [playing, setPlaying] = useState(false);
    const [heatRange, setHeatRange] = useState<[number, number]>();
    const { page, back } = useHashPage();

    // Phone layout: one-row header with a Display settings sheet, and the Country panel / Legend as sheets
    // (bottom sheet in portrait, side sheet on a short landscape screen). Only one sheet is open at a time.
    const compact = useMediaQuery(COMPACT);
    const landscape = useMediaQuery(SHORT_LANDSCAPE);
    const [sheet, setSheet] = useState<"closed" | "peek" | "expanded">("closed");
    const [legendOpen, setLegendOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Bulletin weeks come from the Pump price; every Price component has the same weeks.
    const pumpSeries = weather?.fuels[fuel];
    const series = weather ? componentSeries(weather, component, fuel) : undefined;
    const weeks = useMemo(() => (pumpSeries ? Object.keys(pumpSeries).sort() : []), [pumpSeries]);
    const index = weekIndex ?? weeks.length - 1;
    const week = weeks[index];

    useEffect(() => {
        if (!playing || !weeks.length) return;
        const timer = setInterval(() => setWeekIndex((i) => ((i ?? weeks.length - 1) + 1) % weeks.length), 800);
        return () => clearInterval(timer);
    }, [playing, weeks.length]);

    const names = useMemo(() => Object.fromEntries((geo?.features ?? []).map((f) => [f.properties.code, f.properties.name])), [geo]);
    const fuelLabel = FUELS.find((f) => f.code === fuel)!.label;
    const baselineWeek = series && week ? Object.values(series[week] ?? {})[0]?.baselineWeek : undefined;

    if (page === "info" && weather) {
        return <InfoPage bands={weather.bands} backLabel={back === "compare" ? "Back to the Country comparison" : "Back to the map"}
            onBack={() => { window.location.hash = back === "compare" ? "compare" : ""; }} />;
    }

    // Fuel, Price component, Selected week and the selected Country live here, so both pages share them.
    const brand = <Brand subtitle={`EU-27 · ${fuelLabel} · ${priceComponent.name} · Bulletin week ${week ? formatWeek(week) : "…"}`} />;
    const onComponent = (c: PriceComponent) => { setComponent(c); setHeatRange(undefined); };
    const controls = compact
        ? <CompactHeader page={page === "compare" ? "compare" : "map"} label={`${fuelLabel} · ${priceComponent.label}`}
            settingsOpen={settingsOpen} onSettings={() => setSettingsOpen(true)} />
        : <HeaderControls page={page === "compare" ? "compare" : "map"} fuel={fuel} onFuel={setFuel} component={component}
            onComponent={onComponent} isDark={isDark} onTheme={toggleTheme} />;
    const settings = compact && settingsOpen && (
        <SettingsSheet side={landscape} fuel={fuel} onFuel={setFuel} component={component} onComponent={onComponent}
            isDark={isDark} onTheme={toggleTheme} onClose={() => setSettingsOpen(false)} />
    );

    if (page === "compare") {
        return (
            <>
                <ComparePage geo={geo} weather={weather} error={error} brand={compact ? null : brand} controls={controls} fuel={fuel} fuelLabel={fuelLabel}
                    component={component} componentName={priceComponent.name} weeks={weeks} index={index} isDark={isDark}
                    country={country || undefined} onCountry={(code) => setCountry(code ?? "")}
                    playing={playing} onPlaying={setPlaying} onIndex={setWeekIndex} />
                {settings}
            </>
        );
    }

    const map = geo && series && week && (
        <WeatherMap
            geo={geo}
            cells={series[week] ?? {}}
            pumpCells={pumpSeries![week] ?? {}}
            component={component}
            selected={country || undefined}
            heatRange={heatRange}
            isDark={isDark}
            markerStyle={markerStyle}
            markerValue={markerValue}
            bands={weather!.bands}
            fuelLabel={fuelLabel}
            week={week}
            onSelect={(code) => {
                setCountry(code ?? "");
                if (code) setView("country");
                // Phones: a tapped Country opens the peek (or keeps the sheet expanded); tapping the sea closes the sheet.
                if (compact) {
                    setLegendOpen(false);
                    setSheet((s) => (!code ? "closed" : s === "expanded" ? s : "peek"));
                }
            }}
        />
    );
    const status = (
        <>
            {error && (
                <div role="alert" className="absolute left-1/2 top-400 z-10 -translate-x-1/2 rounded-lg bg-destructive px-400 py-200 text-300 text-destructive-foreground">
                    Could not load map data: {error}
                </div>
            )}
            {!error && !series && (
                <div className="absolute inset-0 flex items-center justify-center text-300 text-muted-foreground">Loading Bulletin weeks…</div>
            )}
        </>
    );

    if (compact) {
        const ready = !!(weather && series && week);
        const sheetOpen = sheet === "expanded" || (sheet === "peek" && !!country);
        const panelProps = {
            view, onView: setView, country: country || undefined, names, fuelLabel, component, componentName: priceComponent.name,
            weeks, index, series: series ?? {}, bands: weather?.bands ?? [], markerStyle,
            onSelect: (code: string | undefined) => setCountry(code ?? ""),
            onIndex: (i: number) => { setPlaying(false); setWeekIndex(i); },
        };
        const panel = weather && (
            <CountryPanel variant="sheet" {...panelProps}
                pumpSeries={weather.fuels[fuel]} netSeries={weather.net[fuel]} taxesSeries={weather.taxes[fuel]}
                pySeries={componentPySeries(weather, component, fuel)}
                onClose={() => setSheet("closed")} />
        );
        const legend = weather && (
            <Legend variant="sheet" onClose={() => setLegendOpen(false)}
                bands={weather.bands} component={component} componentName={priceComponent.name} baselineWeek={baselineWeek ? formatWeek(baselineWeek) : "baseline"}
                heatRange={heatRange} onHeatRange={setHeatRange}
                markerStyle={markerStyle} onMarkerStyle={setMarkerStyle}
                markerValue={markerValue} onMarkerValue={setMarkerValue} />
        );
        const timeline = weather && series && (
            <Timeline compact weeks={weeks} series={series} bands={weather.bands} index={index} playing={playing} markerStyle={markerStyle}
                onIndex={setWeekIndex} onPlaying={setPlaying} />
        );
        const chips = (
            <div className="pointer-events-auto flex flex-wrap gap-200">
                <Chip onClick={() => { setSheet("closed"); setLegendOpen(true); }} label="Legend">
                    <Thermometer className="icon-size-200 shrink-0" aria-hidden />
                    <span className="h-200 w-12 rounded-full" style={{ background: heatGradient(HEAT_SCALES[component]) }} aria-hidden />
                </Chip>
                <Chip onClick={() => { setLegendOpen(false); setView("ranking"); setSheet("expanded"); }} label="All countries">
                    <ListOrdered className="icon-size-200 shrink-0" aria-hidden />
                </Chip>
            </div>
        );
        const header = (
            <div className={cn("absolute left-300 top-[max(0.75rem,env(safe-area-inset-top))] z-10", !landscape && "right-300")}>{controls}</div>
        );

        if (landscape) {
            const sideOpen = legendOpen || sheetOpen;
            return (
                <div className="relative h-full w-full overflow-hidden bg-map-sea">
                    {map}
                    {header}
                    {status}
                    {ready && (
                        <>
                            <div className={cn("pointer-events-none absolute bottom-200 left-[max(0.75rem,env(safe-area-inset-left))] flex flex-col items-start gap-200",
                                sideOpen ? "right-[calc(20rem+0.75rem)]" : "right-[max(0.75rem,env(safe-area-inset-right))]")}>
                                <div className="pointer-events-auto w-full overflow-hidden rounded-xl border border-border shadow-16">{timeline}</div>
                            </div>
                            {!sideOpen && (
                                <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] mt-100-nudge">{chips}</div>
                            )}
                            {sideOpen && (
                                <aside className="absolute inset-y-0 right-0 flex w-80 flex-col border-l border-border bg-card pr-[env(safe-area-inset-right)] pt-200 shadow-28">
                                    {legendOpen ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{legend}</div> : panel}
                                </aside>
                            )}
                        </>
                    )}
                    {settings}
                </div>
            );
        }

        const hasSheet = legendOpen || sheetOpen;
        const expanded = !legendOpen && sheet === "expanded";
        return (
            <div className="relative h-full w-full overflow-hidden bg-map-sea">
                {map}
                {header}
                {status}
                {ready && (
                    <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 flex flex-col",
                        expanded && "top-[calc(max(0.75rem,env(safe-area-inset-top))+4.25rem)]")}>
                        {!hasSheet && <div className="px-300 pb-200">{chips}</div>}
                        <section aria-label={legendOpen ? "Legend" : sheetOpen ? "Country" : "Bulletin week"}
                            className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-28">
                            {hasSheet && (
                                <SheetHandle label={legendOpen ? "Close legend" : expanded ? "Collapse country details" : "Expand country details"}
                                    onToggle={() => (legendOpen ? setLegendOpen(false) : setSheet(expanded ? (country ? "peek" : "closed") : "expanded"))}
                                    onSwipe={(dir) => {
                                        if (legendOpen) { if (dir === "down") setLegendOpen(false); return; }
                                        if (dir === "up") setSheet("expanded");
                                        else setSheet(expanded && country ? "peek" : "closed");
                                    }} />
                            )}
                            {legendOpen
                                ? <div className="max-h-[60dvh] min-h-0 overflow-y-auto overscroll-contain">{legend}</div>
                                : expanded
                                    ? <div className="min-h-0 flex-1">{panel}</div>
                                    : sheetOpen && country && (
                                        <CountryPeek {...panelProps} country={country}
                                            onExpand={() => setSheet("expanded")} onClose={() => setSheet("closed")} />
                                    )}
                            <div className={cn(hasSheet && "border-t border-border")}>{timeline}</div>
                        </section>
                    </div>
                )}
                {settings}
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden bg-map-sea">
            {map}

            {/* Brand */}
            <div className="absolute left-400 top-400">{brand}</div>

            {/* Actions */}
            <div className="absolute right-400 top-400">{controls}</div>

            {status}

            {weather && series && week && (
                <>
                    <div className="absolute bottom-[7.5rem] left-400 xl:bottom-400">
                        <Legend bands={weather.bands} component={component} componentName={priceComponent.name} baselineWeek={baselineWeek ? formatWeek(baselineWeek) : "baseline"}
                            heatRange={heatRange} onHeatRange={setHeatRange}
                            markerStyle={markerStyle} onMarkerStyle={setMarkerStyle}
                            markerValue={markerValue} onMarkerValue={setMarkerValue} />
                    </div>

                    <div className="absolute bottom-[7.5rem] right-400 top-[5.5rem] xl:bottom-400">
                        <CountryPanel
                            view={view} onView={setView} country={country || undefined} names={names} fuelLabel={fuelLabel}
                            component={component} componentName={priceComponent.name}
                            pumpSeries={pumpSeries!} netSeries={weather.net[fuel]} taxesSeries={weather.taxes[fuel]}
                            weeks={weeks} index={index} series={series} pySeries={componentPySeries(weather, component, fuel)} bands={weather.bands} markerStyle={markerStyle}
                            onSelect={(code) => setCountry(code ?? "")}
                            onIndex={(i) => { setPlaying(false); setWeekIndex(i); }}
                        />
                    </div>

                    <div className="pointer-events-none absolute inset-x-400 bottom-400 flex justify-center xl:left-[22rem] xl:right-[26rem]">
                        <div className="pointer-events-auto w-full">
                            <Timeline weeks={weeks} series={series} bands={weather.bands} index={index} playing={playing} markerStyle={markerStyle}
                                onIndex={setWeekIndex} onPlaying={setPlaying} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const COMPONENT_TIP: Record<PriceComponent, string> = {
    pump: "Pump price: what you pay, taxes included",
    net: "Net price: without taxes, moves with the market",
    taxes: "Taxes: Pump price − Net price, in €/L",
};

type Page = "map" | "compare" | "info";

/**
 * Tiny hash router: `#compare` opens the Country comparison, `#info` the Additional info page, anything else is the map.
 * `back` is the last map or comparison page, where Additional info returns to.
 */
function useHashPage() {
    const read = (): Page => (window.location.hash === "#info" ? "info" : window.location.hash === "#compare" ? "compare" : "map");
    const [state, setState] = useState<{ page: Page; back: Exclude<Page, "info"> }>(() => {
        const page = read();
        return { page, back: page === "compare" ? "compare" : "map" };
    });
    useEffect(() => {
        const onHash = () => setState((prev) => {
            const page = read();
            return { page, back: page === "info" ? prev.back : page };
        });
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);
    return state;
}

function Brand({ subtitle }: { subtitle: string }) {
    return (
        <header className="flex items-center gap-300 rounded-xl border border-border bg-glass px-400 py-300 shadow-16 backdrop-blur-md">
            <span className="text-[length:var(--icon-size-500)] leading-none" aria-hidden>⛽</span>
            <div className="min-w-0">
                <h1 className="font-heading text-500 font-semibold leading-tight">Fuel Mood</h1>
                <p className="text-200 text-muted-foreground">{subtitle}</p>
            </div>
        </header>
    );
}

const PILL = "rounded-full px-400 py-100 text-300 font-medium focus-visible:outline-2 focus-visible:outline-ring";
const PILL_ON = "bg-primary text-primary-foreground";
const PILL_OFF = "text-muted-foreground hover:text-foreground";
const GROUP = "flex rounded-full border border-border bg-glass p-100 shadow-16 backdrop-blur-md";

const PAGES = [
    { page: "map", href: "#", label: "Changes", Icon: TrendingUp, tip: "Price changes: this week's mood and the change since February" },
    { page: "compare", href: "#compare", label: "Levels", Icon: ChartBarBig, tip: "Price levels: €/L by Country vs the EU average" },
] as const;

type HeaderControlsProps = {
    page: "map" | "compare";
    fuel: FuelCode;
    onFuel: (f: FuelCode) => void;
    component: PriceComponent;
    onComponent: (c: PriceComponent) => void;
    isDark: boolean;
    onTheme: () => void;
};

/** Page switch (Changes · Levels), Fuel, Price component, Additional info and theme: the same on both pages. */
function HeaderControls({ page, fuel, onFuel, component, onComponent, isDark, onTheme }: HeaderControlsProps) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-200">
            <nav aria-label="Page" className={GROUP}>
                {PAGES.map(({ page: p, href, label, Icon, tip }) => (
                    <HoverTip key={p} side="bottom" tip={tip}>
                        <a href={href} aria-current={page === p ? "page" : undefined}
                            className={cn(PILL, "flex items-center gap-100 px-300", page === p ? PILL_ON : PILL_OFF)}>
                            <Icon className="hidden icon-size-200 sm:block" aria-hidden /> {label}
                        </a>
                    </HoverTip>
                ))}
            </nav>
            <div role="radiogroup" aria-label="Fuel" className={GROUP}>
                {FUELS.map((f) => (
                    <button key={f.code} type="button" role="radio" aria-checked={fuel === f.code} onClick={() => onFuel(f.code)}
                        className={cn(PILL, fuel === f.code ? PILL_ON : PILL_OFF)}>
                        {f.label}
                    </button>
                ))}
            </div>
            <div role="radiogroup" aria-label="Price component" className={GROUP}>
                {PRICE_COMPONENTS.map((c) => (
                    <HoverTip key={c.code} side="bottom" tip={COMPONENT_TIP[c.code]}>
                        <button type="button" role="radio" aria-checked={component === c.code} onClick={() => onComponent(c.code)}
                            className={cn(PILL, component === c.code ? PILL_ON : PILL_OFF)}>
                            {c.label}
                        </button>
                    </HoverTip>
                ))}
            </div>
            <a href="#info"
                className="flex h-800 items-center gap-100 rounded-full border border-border bg-glass px-300 text-300 font-medium text-foreground shadow-16 backdrop-blur-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                <Info className="icon-size-200" aria-hidden /> Additional info
            </a>
            <IconButton label={isDark ? "Light mode" : "Dark mode"} onClick={onTheme}>
                {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </IconButton>
        </div>
    );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <HoverTip side="bottom" tip={label}>
            <button type="button" aria-label={label} onClick={onClick}
                className="flex size-800 items-center justify-center rounded-full border border-border bg-glass text-foreground shadow-16 backdrop-blur-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                {children}
            </button>
        </HoverTip>
    );
}

/** Phone header: one row with the page switch and a button that opens Display settings and shows the current Fuel and Price component. */
function CompactHeader({ page, label, settingsOpen, onSettings }: { page: "map" | "compare"; label: string; settingsOpen: boolean; onSettings: () => void }) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-200 rounded-2xl border border-border bg-glass pl-200 pr-100 shadow-16 backdrop-blur-md">
            <span className="hidden text-[length:var(--icon-size-500)] leading-none min-[380px]:inline" aria-hidden>⛽</span>
            <h1 className="sr-only">Fuel Mood</h1>
            <nav aria-label="Page" className="flex shrink-0 rounded-full border border-border bg-card p-100-nudge">
                {PAGES.map(({ page: p, href, label: text }) => (
                    <a key={p} href={href} aria-current={page === p ? "page" : undefined}
                        className={cn(PILL, "flex min-h-10 items-center px-300", page === p ? PILL_ON : PILL_OFF)}>
                        {text}
                    </a>
                ))}
            </nav>
            <button type="button" onClick={onSettings} aria-haspopup="dialog" aria-expanded={settingsOpen} aria-label={`Display settings: ${label}`}
                className="ml-auto flex min-h-11 min-w-0 items-center gap-100-nudge rounded-full border border-border bg-card pl-300 pr-200 text-200 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <span className="truncate">{label}</span>
                <ChevronDown className="icon-size-200 shrink-0" aria-hidden />
            </button>
        </header>
    );
}

const COMPONENT_HINT: Record<PriceComponent, string> = { pump: "what you pay", net: "without taxes", taxes: "Pump − Net" };

/** Display settings on phones: Fuel, Price component, Additional info and theme. Bottom sheet, or a side sheet in landscape. */
function SettingsSheet({ side, fuel, onFuel, component, onComponent, isDark, onTheme, onClose }: {
    side: boolean; fuel: FuelCode; onFuel: (f: FuelCode) => void; component: PriceComponent; onComponent: (c: PriceComponent) => void;
    isDark: boolean; onTheme: () => void; onClose: () => void;
}) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    const option = (on: boolean) => cn(
        "flex min-h-12 flex-1 flex-col items-center justify-center rounded-lg px-200 text-300 font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-ring",
        on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
    );
    return (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Display settings">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
            <div className={cn("absolute overflow-y-auto overscroll-contain bg-card shadow-28",
                side ? "inset-y-0 right-0 w-80 border-l border-border pb-400 pl-400 pr-[max(1rem,env(safe-area-inset-right))] pt-200"
                    : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl px-400 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-200")}>
                {!side && <div className="mx-auto mb-100 h-[5px] w-10 rounded-full bg-muted-foreground/40" aria-hidden />}
                <div className="flex items-center">
                    <h2 className="flex-1 font-heading text-500 font-semibold">Display</h2>
                    <button ref={closeRef} type="button" aria-label="Close" onClick={onClose}
                        className="-mr-200 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                        <X className="icon-size-200" />
                    </button>
                </div>
                <SettingsGroup label="Fuel">
                    {FUELS.map((f) => (
                        <button key={f.code} type="button" role="radio" aria-checked={fuel === f.code} onClick={() => onFuel(f.code)} className={option(fuel === f.code)}>
                            {f.label}
                        </button>
                    ))}
                </SettingsGroup>
                <SettingsGroup label="Price component">
                    {PRICE_COMPONENTS.map((c) => (
                        <button key={c.code} type="button" role="radio" aria-checked={component === c.code} onClick={() => onComponent(c.code)} className={option(component === c.code)}>
                            {c.label}
                            <span className="text-100 font-normal opacity-85">{COMPONENT_HINT[c.code]}</span>
                        </button>
                    ))}
                </SettingsGroup>
                <div className="mt-400">
                    <a href="#info" onClick={onClose}
                        className="flex min-h-12 items-center gap-300 border-t border-border text-300 text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                        <Info className="icon-size-300" aria-hidden /><span className="flex-1">Additional info</span><ChevronRight className="icon-size-200 text-muted-foreground" aria-hidden />
                    </a>
                    <button type="button" role="switch" aria-checked={isDark} onClick={onTheme}
                        className="flex min-h-12 w-full items-center gap-300 border-t border-border text-left text-300 text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                        {isDark ? <Sun className="icon-size-300" aria-hidden /> : <Moon className="icon-size-300" aria-hidden />}
                        <span className="flex-1">Dark mode</span>
                        <span className={cn("relative h-[26px] w-11 rounded-full transition-colors", isDark ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden>
                            <span className={cn("absolute top-[3px] size-5 rounded-full bg-white transition-[left]", isDark ? "left-[21px]" : "left-[3px]")} />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="mt-400">
            <div className="mb-200 text-100 font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
            <div role="radiogroup" aria-label={label} className="flex gap-100 rounded-xl border border-border p-100">{children}</div>
        </div>
    );
}

/** Rounded chip over the map (phones): opens the Legend or the All countries ranking. */
function Chip({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick}
            className="flex min-h-11 items-center gap-200 rounded-full border border-border bg-glass px-400 text-300 font-semibold text-foreground shadow-16 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-ring">
            {children}{label}
        </button>
    );
}

/** Handle on top of a bottom sheet: a tap toggles it, a vertical swipe expands or collapses it. */
function SheetHandle({ label, onToggle, onSwipe }: { label: string; onToggle: () => void; onSwipe: (dir: "up" | "down") => void }) {
    const start = useRef<number | undefined>(undefined);
    const swiped = useRef(false);
    return (
        <button type="button" aria-label={label}
            onClick={() => { if (!swiped.current) onToggle(); swiped.current = false; }}
            onPointerDown={(e) => { start.current = e.clientY; swiped.current = false; }}
            onPointerUp={(e) => {
                const dy = start.current === undefined ? 0 : e.clientY - start.current;
                start.current = undefined;
                if (Math.abs(dy) > 30) { swiped.current = true; onSwipe(dy < 0 ? "up" : "down"); }
            }}
            className="flex h-7 w-full shrink-0 touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-ring">
            <span className="h-[5px] w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        </button>
    );
}

export default App;
