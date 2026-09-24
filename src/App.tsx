// Fuel Mood — EU-27 price-mood map. Terms follow ../CONTEXT.md.
// Data is a static snapshot in public/ (see scripts/refresh-data.mjs and docs/adr/0001-committed-data-snapshot.md).

import { useEffect, useMemo, useState } from "react";
import { Info, Moon, Sun } from "lucide-react";

import { useThemeContext } from "@/hooks/theme.context";
import { cn } from "@/lib/utils";
import { CountryPanel } from "./weather/CountryPanel";
import { FUELS, formatWeek, usePersistentState, useWeatherData, type FuelCode, type MarkerStyle, type MarkerValue } from "./weather/data";
import { InfoPage } from "./weather/InfoPage";
import { HoverTip } from "./weather/Tooltip";
import { Legend } from "./weather/Legend";
import { Timeline } from "./weather/Timeline";
import { WeatherMap } from "./weather/WeatherMap";

function App() {
    const { isDark, toggleTheme } = useThemeContext();
    const { geo, weather, error } = useWeatherData();

    const [fuel, setFuel] = usePersistentState<FuelCode>("fw.fuel", "e95");
    const [country, setCountry] = usePersistentState<string>("fw.country", "PL");
    const [markerStyle, setMarkerStyle] = usePersistentState<MarkerStyle>("fw.markers", "mood");
    const [markerValue, setMarkerValue] = usePersistentState<MarkerValue>("fw.markerValue", "week");
    const [view, setView] = useState<"country" | "ranking">("country");
    const [weekIndex, setWeekIndex] = useState<number>();
    const [playing, setPlaying] = useState(false);
    const [heatRange, setHeatRange] = useState<[number, number]>();
    const page = useHashPage();

    const series = weather?.fuels[fuel];
    const weeks = useMemo(() => (series ? Object.keys(series).sort() : []), [series]);
    const index = weekIndex ?? weeks.length - 1;
    const week = weeks[index];

    useEffect(() => {
        if (!playing || !weeks.length) return;
        const timer = setInterval(() => setWeekIndex((i) => ((i ?? weeks.length - 1) + 1) % weeks.length), 800);
        return () => clearInterval(timer);
    }, [playing, weeks.length]);

    const names = useMemo(() => Object.fromEntries((geo?.features ?? []).map((f) => [f.properties.code, f.properties.name])), [geo]);
    const fuelLabel = FUELS.find((f) => f.code === fuel)!.label;
    const baselineWeek = series && week ? Object.values(series[week])[0]?.baselineWeek : undefined;

    if (page === "info" && weather) {
        return <InfoPage bands={weather.bands} onBack={() => { window.location.hash = ""; }} />;
    }

    return (
        <div className="relative h-full w-full overflow-hidden bg-map-sea">
            {geo && series && week && (
                <WeatherMap
                    geo={geo}
                    cells={series[week]}
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
            <header className="absolute left-400 top-400 flex items-center gap-300 rounded-xl border border-border bg-glass px-400 py-300 shadow-16 backdrop-blur-md">
                <span className="text-[length:var(--icon-size-500)] leading-none" aria-hidden>⛽</span>
                <div>
                    <h1 className="font-heading text-500 font-semibold leading-tight">Fuel Mood</h1>
                    <p className="text-200 text-muted-foreground">
                        EU-27 · {fuelLabel} · Bulletin week {week ? formatWeek(week) : "…"}
                    </p>
                </div>
            </header>

            {/* Actions */}
            <div className="absolute right-400 top-400 flex items-center gap-200">
                <div role="radiogroup" aria-label="Fuel" className="flex rounded-full border border-border bg-glass p-100 shadow-16 backdrop-blur-md">
                    {FUELS.map((f) => (
                        <button key={f.code} type="button" role="radio" aria-checked={fuel === f.code} onClick={() => setFuel(f.code)}
                            className={cn(
                                "rounded-full px-400 py-100 text-300 font-medium focus-visible:outline-2 focus-visible:outline-ring",
                                fuel === f.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                            )}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <a href="#info"
                    className="flex h-800 items-center gap-100 rounded-full border border-border bg-glass px-300 text-300 font-medium text-foreground shadow-16 backdrop-blur-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <Info className="icon-size-200" aria-hidden /> Additional info
                </a>
                <IconButton label={isDark ? "Light mode" : "Dark mode"} onClick={toggleTheme}>
                    {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
                </IconButton>
            </div>

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
                        <Legend bands={weather.bands} baselineWeek={baselineWeek ? formatWeek(baselineWeek) : "baseline"}
                            heatRange={heatRange} onHeatRange={setHeatRange}
                            markerStyle={markerStyle} onMarkerStyle={setMarkerStyle}
                            markerValue={markerValue} onMarkerValue={setMarkerValue} />
                    </div>

                    <div className="absolute bottom-[7.5rem] right-400 top-[5.5rem] xl:bottom-400">
                        <CountryPanel
                            view={view} onView={setView} country={country || undefined} names={names} fuelLabel={fuelLabel}
                            weeks={weeks} index={index} series={series} pySeries={weather.previousYear.fuels[fuel]} bands={weather.bands} markerStyle={markerStyle}
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

/** Tiny hash router: `#info` opens the Additional info page, anything else is the map. */
function useHashPage() {
    const read = () => (window.location.hash === "#info" ? "info" : "map");
    const [page, setPage] = useState<"map" | "info">(read);
    useEffect(() => {
        const onHash = () => setPage(read());
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);
    return page;
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
