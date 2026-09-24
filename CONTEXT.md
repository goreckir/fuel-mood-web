# Fuel Mood

A price-mood map of EU fuel prices: a driver glances at it on Monday to decide whether to fill up today or wait a week.

## People

**Driver**:
Anyone who fills up a car in an EU-27 country and opens the public site to check their own country.
_Avoid_: user, customer, visitor

## Data

**Bulletin**:
The European Commission Weekly Oil Bulletin: one national average, tax-inclusive price per country, fuel and week, in €/L.
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

## Measures

**Baseline price**:
For each Country and Fuel, the price from the last Bulletin week before 28 February 2026.
_Avoid_: base price, reference price, pre-war price

**Selected week**:
The Bulletin week the map shows; the latest one in the Snapshot unless the Driver moves the week slider.
_Avoid_: current week, today

**Weather**:
How much the price changed between the Selected week and the previous available Bulletin week, shown by default as a mood face (alternatively an arrow or a weather icon). A Country without a price in the Selected week shows its last available price, labelled with that price's Bulletin week.
_Avoid_: forecast, prediction, trend

**Weather band**:
One of six named ranges of Weather (Falling, Sun, Sunny spells, Cloudy, Rain, Storm), each with an upper limit in percent. Falling is a clear fall (≤ −1%); Sun means "stable, no need to hurry" (above −1% up to +0.5%).
_Avoid_: category, bucket, level

**Heat**:
How much the price has changed since the Baseline price, in percent; shown as the Country's thermometer colour. In the UI it is labelled "vs baseline" ("Price · % change vs baseline"), not "Heat".
_Avoid_: climate, weather, change vs base

**Week-by-week strip**:
The row of weekly Weather band glyphs (mood faces by default) for one Country and Fuel, from the Baseline price's Bulletin week up to the latest.
_Avoid_: weather strip, sparkline, forecast bar, history

**Price trend**:
The chart of one Country's Heat curve for this year with the previous year's curve overlaid, each year against its own February baseline and aligned week by week.
_Avoid_: weather strip trend, PY trend, sparkline
