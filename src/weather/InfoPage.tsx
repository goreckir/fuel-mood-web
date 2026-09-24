// "Additional info": how Fuel Mood reads the data and why the winter Baseline is not misleading.
// Figures are EU-27 medians from the EC Weekly Oil Bulletin, 2015–2026 (a one-off seasonality analysis).

import { ArrowLeft } from "lucide-react";

import { BAND_ICON, bandRange, type Band } from "./data";

const SEASONALITY: { year: string; e95Summer: string; e95Sep: string; dieselSummer: string; dieselSep: string; note?: string; highlight?: boolean }[] = [
    { year: "2015", e95Summer: "+7.1%", e95Sep: "−1.4%", dieselSummer: "−0.7%", dieselSep: "−6.1%" },
    { year: "2016", e95Summer: "+8.0%", e95Sep: "+7.5%", dieselSummer: "+10.4%", dieselSep: "+10.1%" },
    { year: "2017", e95Summer: "−5.0%", e95Sep: "−2.4%", dieselSummer: "−6.4%", dieselSep: "−3.8%" },
    { year: "2018", e95Summer: "+7.4%", e95Sep: "+8.7%", dieselSummer: "+7.8%", dieselSep: "+9.5%" },
    { year: "2019", e95Summer: "+5.9%", e95Sep: "+3.8%", dieselSummer: "−0.7%", dieselSep: "−0.2%" },
    { year: "2020", e95Summer: "−11.4%", e95Sep: "−10.3%", dieselSummer: "−13.1%", dieselSep: "−14.6%", note: "COVID" },
    { year: "2021", e95Summer: "+9.8%", e95Sep: "+12.3%", dieselSummer: "+7.4%", dieselSep: "+9.8%" },
    { year: "2022", e95Summer: "+18.3%", e95Sep: "+3.9%", dieselSummer: "+21.2%", dieselSep: "+20.4%", note: "war" },
    { year: "2023", e95Summer: "+1.7%", e95Sep: "+7.4%", dieselSummer: "−4.0%", dieselSep: "+6.6%" },
    { year: "2024", e95Summer: "0.0%", e95Sep: "−5.9%", dieselSummer: "−5.9%", dieselSep: "−11.1%" },
    { year: "2025", e95Summer: "−5.2%", e95Sep: "−4.4%", dieselSummer: "−6.1%", dieselSep: "−5.9%", highlight: true },
    { year: "2026", e95Summer: "+16.0%", e95Sep: "+27.8%", dieselSummer: "+19.7%", dieselSep: "+39.8%", highlight: true },
];

export function InfoPage({ bands, onBack }: { bands: Band[]; onBack: () => void }) {
    return (
        <div className="h-full overflow-y-auto bg-background">
            <div className="mx-auto max-w-3xl space-y-800 px-400 py-800">
                <button type="button" onClick={onBack}
                    className="flex items-center gap-100 rounded-lg px-200 py-100 text-300 font-medium text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <ArrowLeft className="icon-size-200" /> Back to the map
                </button>

                <header>
                    <p className="text-200 font-semibold tracking-widest text-muted-foreground">ADDITIONAL INFO</p>
                    <h1 className="font-heading text-600 font-semibold">How to read Fuel Mood</h1>
                    <p className="mt-200 text-300 text-muted-foreground">
                        Fuel Mood shows recent changes in national fuel prices from the European Commission Weekly Oil Bulletin.
                        It does not forecast prices.
                    </p>
                </header>

                <section className="space-y-300">
                    <h2 className="font-heading text-500 font-semibold">Weekly change, change vs baseline and the Baseline price</h2>
                    <dl className="grid gap-300 text-300 sm:grid-cols-[10rem_1fr]">
                        <dt className="font-semibold">Baseline price</dt>
                        <dd className="text-muted-foreground">For each country and fuel, the price in the last Bulletin week before 28 February 2026 (23 Feb 2026).</dd>
                        <dt className="font-semibold">vs baseline</dt>
                        <dd className="text-muted-foreground">Change since the Baseline price, in percent. Shown as the country colour: cold blue at 0%, yellow at +25%, hot red at +50% and above.</dd>
                        <dt className="font-semibold">Weather</dt>
                        <dd className="text-muted-foreground">Change against the previous Bulletin week. Shown as a mood face by default (switch to arrows or weather icons in the legend). Bands:</dd>
                    </dl>
                    <ul className="grid gap-100 text-300 sm:ml-[10rem]">
                        {bands.map((b) => (
                            <li key={b.BandCode} className="flex gap-200">
                                <span aria-hidden>{BAND_ICON[b.BandCode]}</span>
                                <span className="w-28 font-medium">{b.BandName}</span>
                                <span className="tabular-nums text-muted-foreground">{bandRange(b, bands)}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-300">
                    <h2 className="font-heading text-500 font-semibold">Is a winter baseline misleading?</h2>
                    <p className="text-300 text-muted-foreground">
                        If fuel were always cheaper in winter, part of the change vs baseline would just be the season. We checked every year since 2015:
                        the change from the last Bulletin week before 28 February to the summer (June–August average) and to late September.
                        Figures are medians across the EU-27.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-300">
                            <thead className="bg-muted text-left text-200 text-muted-foreground">
                                <tr>
                                    <th className="px-300 py-200 font-medium">Year</th>
                                    <th className="px-300 py-200 text-right font-medium">Euro 95 → summer</th>
                                    <th className="px-300 py-200 text-right font-medium">Euro 95 → Sep</th>
                                    <th className="px-300 py-200 text-right font-medium">Diesel → summer</th>
                                    <th className="px-300 py-200 text-right font-medium">Diesel → Sep</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SEASONALITY.map((r) => (
                                    <tr key={r.year} className={r.highlight ? "border-t border-border bg-accent font-semibold" : "border-t border-border"}>
                                        <td className="px-300 py-100">{r.year}{r.note && <span className="ml-100 text-200 font-normal text-muted-foreground">({r.note})</span>}</td>
                                        <td className="px-300 py-100 text-right tabular-nums">{r.e95Summer}</td>
                                        <td className="px-300 py-100 text-right tabular-nums">{r.e95Sep}</td>
                                        <td className="px-300 py-100 text-right tabular-nums">{r.dieselSummer}</td>
                                        <td className="px-300 py-100 text-right tabular-nums">{r.dieselSep}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="list-disc space-y-100 pl-600 text-300">
                        <li><b>2025 went the other way:</b> summer was cheaper than February in all 27 countries (Euro 95 −4.4%, diesel −5.9% by September).</li>
                        <li><b>No steady season:</b> between 2015 and 2025 the sign flips from year to year. Without the 2020 and 2022 shocks the median is about +4% for Euro 95 and about 0% for diesel. Crude oil and exchange rates drive prices, not the calendar.</li>
                        <li><b>2026 is far outside the usual range:</b> +28% (Euro 95) and +40% (diesel) by September, against at most about +12% in normal years.</li>
                        <li><b>Malta</b> stays at 0% every year because its prices are regulated.</li>
                    </ul>
                    <p className="text-300 text-muted-foreground">
                        So the Baseline stays in winter and the change vs baseline is not seasonally adjusted: with a sign that changes every year, an adjustment would add noise.
                        The <i>PY Weather strip trend</i> in the country panel lays the previous year over this year so you can see the difference yourself.
                    </p>
                </section>

                <section className="space-y-200 text-300 text-muted-foreground">
                    <h2 className="font-heading text-500 font-semibold text-foreground">Sources</h2>
                    <p>
                        Fuel prices: European Commission, Weekly Oil Bulletin. © European Union, 2005–2026, licensed under{" "}
                        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
                        Weekly, baseline and seasonal changes computed by Fuel Mood. Country shapes: Made with Natural Earth. Mood faces: Fluent Emoji, © Microsoft Corporation, MIT licence.
                    </p>
                </section>
            </div>
        </div>
    );
}
