// Fuel Mood — EU-27 price-mood map and Country comparison. Terms follow ../CONTEXT.md.
// Data is a static snapshot in public/ (see scripts/refresh-data.mjs and docs/adr/0001-committed-data-snapshot.md).

import { useEffect, useMemo, useState } from "react";
import { ChartBarBig, Info, Map as MapIcon, Moon, Sun } from "lucide-react";

import { useThemeContext } from "@/hooks/theme.context";
import { cn } from "@/lib/utils";
import { ComparePage } from "./weather/ComparePage";
import { CountryPanel } from "./weather/CountryPanel";
import {
    FUELS, PRICE_COMPONENTS, componentPySeries, componentSeries, formatWeek, usePersistentState, useWeatherData,
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
    const controls = (
        <HeaderControls page={page === "compare" ? "compare" : "map"} fuel={fuel} onFuel={setFuel} component={component}
            onComponent={(c) => { setComponent(c); setHeatRange(undefined); }} isDark={isDark} onTheme={toggleTheme} />
    );

    if (page === "compare") {
        return (
            <ComparePage geo={geo} weather={weather} error={error} brand={brand} controls={controls} fuel={fuel} fuelLabel={fuelLabel}
                component={component} componentName={priceComponent.name} weeks={weeks} index={index} isDark={isDark}
                country={country || undefined} onCountry={(code) => setCountry(code ?? "")}
                playing={playing} onPlaying={setPlaying} onIndex={setWeekIndex} />
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden bg-map-sea">
            {geo && series && week && (
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
                    onSelect={(code) => { setCountry(code ?? ""); if (code) setView("country"); }}
                />
            )}

            {/* Brand */}
            <div className="absolute left-400 top-400">{brand}</div>

            {/* Actions */}
            <div className="absolute right-400 top-400">{controls}</div>

            {error && (
                <div role="alert" className="absolute left-1/2 top-400 -translate-x-1/2 rounded-lg bg-destructive px-400 py-200 text-300 text-destructive-foreground">
                    Could not load map data: {error}
                </div>
            )}
            {!error && !series && (
                <div className="absolute inset-0 flex items-center justify-center text-300 text-muted-foreground">Loading Bulletin weeks…</div>
            )}

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
    { page: "map", href: "#", label: "Map", Icon: MapIcon, tip: "Price moods on the map" },
    { page: "compare", href: "#compare", label: "Compare", Icon: ChartBarBig, tip: "Country comparison: price levels vs the EU average" },
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

/** Page switch (Map · Compare), Fuel, Price component, Additional info and theme: the same on both pages. */
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

export default App;
