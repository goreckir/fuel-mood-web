# Fuel Mood

A price-mood map of EU fuel prices: a driver glances at it on Monday to decide whether to fill up today or wait a week.

## People

**Driver**:
Anyone who fills up a car in an EU-27 country and opens the public site to check their own country.
_Avoid_: user, customer, visitor

## Data

**Bulletin**:
The European Commission Weekly Oil Bulletin: one national average price per country, fuel and week, in €/L, published both with and without taxes.
_Avoid_: live price, station price

**Bulletin week**:
The date (a Monday) that a Bulletin price applies to.
_Avoid_: day, date, period

**Snapshot**:
The copy of Bulletin-derived figures that the site ships with; it ends at the latest Bulletin week available when it was last refreshed.
_Avoid_: cache, database, live data

**Fuel**:
One of the two Bulletin fuels: Euro 95 or Diesel.
_Avoid_: product, petrol type

**Country**:
One of the EU-27 member states that has Bulletin prices.
_Avoid_: market, region

## Price components

**Pump price**:
The Bulletin price including all taxes: what the Driver pays at the pump (as a national average).
_Avoid_: gross price, retail price, price with tax

**Net price**:
The Bulletin price without taxes; it moves with the market (crude oil, refining, distribution margins).
_Avoid_: base price, pre-tax price, wholesale price

**Taxes**:
Pump price minus Net price, in €/L: all taxes on a litre summed together (VAT, excise and other indirect taxes), never split by type. Because VAT is a percentage, Taxes move with the price even when no tax rule changes. Tax share (Taxes ÷ Pump price) is only a supporting label.
_Avoid_: tax burden, duties, excise (one tax type only)

**Price component**:
Which of Pump price, Net price or Taxes the Driver has chosen to look at; every Measure (Weather, Heat, Week-by-week strip, Price trend) is computed from it. It helps the Driver explain a price change (market vs taxes), not predict one.
_Avoid_: price type, price basis, layer

## Measures

**Baseline price**:
For each Country, Fuel and Price component, the value from the last Bulletin week before 28 February 2026.
_Avoid_: base price, reference price, pre-war price

**Selected week**:
The Bulletin week the map shows; the latest one in the Snapshot unless the Driver moves the week slider.
_Avoid_: current week, today

**Weather**:
How much the selected Price component changed between the Selected week and the previous available Bulletin week, shown by default as a mood face (alternatively an arrow or a weather icon). A Country without a price in the Selected week shows its last available price, labelled with that price's Bulletin week.
_Avoid_: forecast, prediction, trend

**Weather band**:
One of six named ranges of Weather (Falling, Sun, Sunny spells, Cloudy, Rain, Storm), each with an upper limit in percent. Falling is a clear fall (≤ −1%); Sun means "stable, no need to hurry" (above −1% up to +0.5%). The limits are the same for every Price component, so a mood means the same thing whether the Driver looks at Pump price, Net price or Taxes.
_Avoid_: category, bucket, level

**Heat**:
How much the selected Price component has changed since its Baseline price, in percent; it can be negative (e.g. Taxes after a VAT cut); shown as the Country's thermometer colour. In the UI it is labelled "vs baseline" ("Price · % change vs baseline"), not "Heat".
_Avoid_: climate, weather, change vs base

**Week-by-week strip**:
The row of weekly Weather band glyphs (mood faces by default) for one Country and Fuel, from the Baseline price's Bulletin week up to the latest.
_Avoid_: weather strip, sparkline, forecast bar, history

**Price trend**:
The chart of one Country's Heat curve for this year with the previous year's curve overlaid, each year against its own February baseline and aligned week by week.
_Avoid_: weather strip trend, PY trend, sparkline

**Price level**:
The value of the selected Price component in €/L for one Country, Fuel and the Selected week: "how much", as opposed to the changes Weather and Heat ("by how much").
_Avoid_: price ranking, cheapness, level change

**EU average**:
The European Commission's own weighted EU-27 average from the Bulletin, used as the reference for Price levels; its Taxes are EU average Pump price minus EU average Net price. Not computed by Fuel Mood.
_Avoid_: mean, euro-area average, EU price

**Gap to EU average**:
How far a Country's Price level is from the EU average in the same Selected week, in percent (negative = cheaper than the EU average); shown as the Country's colour on the Country comparison map. It compares Countries, never weeks.
_Avoid_: deviation, spread, premium, Heat

**Rank**:
A Country's position 1–27 by Price level of the selected Price component in the Selected week (1 = lowest). Changes of Rank are not shown.
_Avoid_: place, position change, ranking

**Mood map**:
The main page: the map of Weather and Heat per Country, i.e. how much prices changed. Labelled "Changes" in the header.
_Avoid_: map page, home, Map (as a label: it says nothing about the analysis)

**Country comparison**:
The page that sets Countries side by side by Price level, with the EU average as the reference. Labelled "Levels" in the header. It answers "where in the EU is fuel cheapest or dearest, is that because of Taxes, and how does my Country compare with the EU average?". It shares Fuel, Price component, Selected week and the selected Country with the Mood map. Cross-country comparisons carry the Bulletin's caveat of limited validity.
_Avoid_: ranking (that is the panel tab sorted by Weather), league table, Compare (as a label: unclear what is compared)

**Price breakdown**:
For one Country, Fuel and the Selected week: the Pump price split into Net price and Taxes in €/L (with the tax share), plus the change since the Baseline price split the same way (Δ Pump price = Δ Net price + Δ Taxes, in €/L). Shown whatever the Price component.
_Avoid_: tax split, price decomposition, waterfall
