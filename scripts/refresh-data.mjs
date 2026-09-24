// Rebuilds public/weather.json from the European Commission Weekly Oil Bulletin price history.
//
// Source: European Commission, Weekly Oil Bulletin, "Price developments 2005 onwards"
// https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en
// Licence: CC BY 4.0, (c) European Union. Changes (Weather, Heat, bands) are computed here.
//
// Usage:
//   npm run data:refresh                 # download the latest XLSX and rewrite public/weather.json
//   npm run data:refresh -- --xlsx <f>   # use a local copy of the XLSX instead of downloading
//
// public/europe.geojson (Natural Earth borders) is committed and not rebuilt here.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ExcelJS from "exceljs";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "public", "weather.json");
const XLSX_NAME = "Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";
const XLSX_URL = `https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=${XLSX_NAME}`;
const SHEET = "Prices with taxes";

/** Baseline price: the last Bulletin week before this date (and one year earlier for the Price trend). */
const BASELINE_BEFORE = "2026-02-28";
const PY_BASELINE_BEFORE = "2025-02-28";

/** EU-27 only; the history also holds UK and EU/EUR aggregates. */
const COUNTRIES = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU",
    "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];

/** WOB column suffix -> Fuel code. */
const FUELS = { euro95: "e95", diesel: "diesel" };

/** Weather bands: upper limit of the week-over-week change in percent ("" = no upper limit). Strings match the model's dim table. */
const BANDS = [
    { BandCode: "falling", BandName: "Falling", UpperLimitPct: "-1.0", SortOrder: "1" },
    { BandCode: "sun", BandName: "Sun", UpperLimitPct: "0.5", SortOrder: "2" },
    { BandCode: "sunny_spells", BandName: "Sunny spells", UpperLimitPct: "1.0", SortOrder: "3" },
    { BandCode: "cloudy", BandName: "Cloudy", UpperLimitPct: "3.0", SortOrder: "4" },
    { BandCode: "rain", BandName: "Rain", UpperLimitPct: "4.0", SortOrder: "5" },
    { BandCode: "storm", BandName: "Storm", UpperLimitPct: "", SortOrder: "6" },
];

const HEADER = /^([A-Z]{2})_price_with_tax_(euro95|diesel)$/;

const round = (value, digits) => Number(value.toFixed(digits));

async function loadWorkbook(localPath) {
    const workbook = new ExcelJS.Workbook();
    if (localPath) {
        await workbook.xlsx.readFile(resolve(localPath));
        return workbook;
    }
    const response = await fetch(XLSX_URL, { headers: { "User-Agent": "fuel-mood-web" }, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`download failed: HTTP ${response.status} ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`downloaded ${XLSX_NAME} (${buffer.length.toLocaleString("en")} bytes)`);
    await workbook.xlsx.load(buffer);
    return workbook;
}

/** Map of "country|fuel" -> { week (YYYY-MM-DD): price in €/L }. */
function readPrices(workbook) {
    const sheet = workbook.getWorksheet(SHEET);
    if (!sheet) throw new Error(`sheet '${SHEET}' not found`);

    const columns = new Map();
    sheet.getRow(1).eachCell((cell, col) => {
        const m = HEADER.exec(String(cell.value ?? ""));
        if (m && COUNTRIES.includes(m[1])) columns.set(col, `${m[1]}|${FUELS[m[2]]}`);
    });
    const missing = COUNTRIES.flatMap((c) => Object.values(FUELS).map((f) => `${c}|${f}`))
        .filter((key) => ![...columns.values()].includes(key));
    if (missing.length) throw new Error(`columns missing in '${SHEET}': ${missing.join(", ")}`);

    const prices = new Map();
    sheet.eachRow((row) => {
        const week = row.getCell(1).value;
        if (!(week instanceof Date)) return; // sub-headers, blank rows, footnotes
        const iso = week.toISOString().slice(0, 10);
        for (const [col, key] of columns) {
            const value = row.getCell(col).value;
            if (typeof value === "number" && value > 0) {
                if (!prices.has(key)) prices.set(key, {});
                prices.get(key)[iso] = round(value / 1000, 3); // €/1000 L -> €/L
            }
        }
    });
    return prices;
}

function bandFor(change) {
    return (BANDS.find((b) => b.UpperLimitPct === "" || change <= Number(b.UpperLimitPct)) ?? BANDS.at(-1)).BandCode;
}

/** Same shape as the app's `Weather` type in src/weather/data.ts. */
function buildWeather(prices) {
    const out = { baselineBefore: BASELINE_BEFORE, bands: BANDS, fuels: {}, previousYear: { baselineBefore: PY_BASELINE_BEFORE, fuels: {} } };
    for (const key of [...prices.keys()].sort()) {
        const [country, fuel] = key.split("|");
        const series = prices.get(key);
        const weeks = Object.keys(series).sort();
        const baseWeek = weeks.filter((w) => w < BASELINE_BEFORE).at(-1);
        const base = series[baseWeek];

        const fuelOut = (out.fuels[fuel] ??= {});
        weeks.forEach((w, i) => {
            if (w < baseWeek) return;
            const weather = round((series[w] / series[weeks[i - 1]] - 1) * 100, 2);
            (fuelOut[w] ??= {})[country] = {
                price: series[w], baseline: base, baselineWeek: baseWeek,
                heat: round((series[w] / base - 1) * 100, 1),
                weather, band: bandFor(weather),
            };
        });

        // Previous year: the same number of Bulletin weeks, starting at that year's own Baseline week,
        // so week k after 23 Feb 2026 lines up with week k after 24 Feb 2025.
        const pyBaseWeek = weeks.filter((w) => w < PY_BASELINE_BEFORE).at(-1);
        const window = weeks.filter((w) => w >= baseWeek).length;
        const pyFuel = (out.previousYear.fuels[fuel] ??= {});
        for (const w of weeks.filter((w) => w >= pyBaseWeek).slice(0, window)) {
            (pyFuel[w] ??= {})[country] = {
                price: series[w], baseline: series[pyBaseWeek], baselineWeek: pyBaseWeek,
                heat: round((series[w] / series[pyBaseWeek] - 1) * 100, 1),
            };
        }
    }
    return out;
}

const args = process.argv.slice(2);
const xlsxIndex = args.indexOf("--xlsx");
const weather = buildWeather(readPrices(await loadWorkbook(xlsxIndex >= 0 ? args[xlsxIndex + 1] : undefined)));

const json = JSON.stringify(weather);
const previous = await readFile(OUT, "utf8").catch(() => "");
const count = (w) => Object.fromEntries(Object.entries(w.fuels).map(([f, weeks]) => [f, Object.keys(weeks).length]));
if (previous === json) {
    console.log("weather.json: unchanged");
} else {
    await writeFile(OUT, json, "utf8");
    const latest = Object.keys(weather.fuels.e95).sort().at(-1);
    console.log(`weather.json: written, latest Bulletin week ${latest}, weeks per fuel ${JSON.stringify(count(weather))}`);
}
