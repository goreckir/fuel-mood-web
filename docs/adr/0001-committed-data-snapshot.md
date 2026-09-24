# The data is a committed snapshot, refreshed weekly by a scheduled workflow

The site has no backend and reads no data at runtime from third parties. `public/weather.json` (prices, Weather, Heat and bands derived from the EC Weekly Oil Bulletin) and `public/europe.geojson` (Natural Earth borders) are committed to the repo. Anyone who clones it and runs `npm install && npm run dev` sees a working map offline, with no Python, API keys or accounts. A scheduled GitHub Actions workflow runs `npm run data:refresh` every Tuesday, after the Bulletin's Monday publication. It commits `weather.json` only when the data changed, and that push redeploys GitHub Pages.

Alternatives we rejected:

- **Fetching the XLSX from the EC at dev start or in the browser.** It's slow (a 4–5 MB file), depends on the EC server being up, and a browser fetch would also depend on the EC allowing cross-origin requests.
- **A backend or database.** It's overkill for 54 weekly series, and it would break "clone and run".

## Consequences

- A fresh clone always shows the latest Bulletin week as of its last refresh commit. That's fine for a weekly bulletin.
- The refresh logic lives in `scripts/refresh-data.mjs`, a Node port of the original Python pipeline. The Baseline dates (`BASELINE_BEFORE`, `PY_BASELINE_BEFORE`) are constants there; moving the Baseline means editing them.
- If the EC changes the XLSX layout or URL, the scheduled run fails loudly: GitHub emails the owner and the site keeps the previous Snapshot.
- Borders are not rebuilt; `europe.geojson` changes only by hand.
