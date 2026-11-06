# Building Footprint Mapper

A small, self-contained browser app for tracing building footprints, recording building details, and exporting a GeoJSON FeatureCollection.

## Run it

Open `index.html` in a modern browser. The mapper uses a local schematic map preview, so it does not need an API key, account, install step, or network connection.

## Use it

1. Choose **Draw building**.
2. Click each corner of the footprint. Double-click, press Enter, or choose **Finish outline** to complete it. Press Escape to cancel.
3. Edit the building name, plot number, floor count, type, and notes in its card.
4. Drag a selected footprint's white corner handles to adjust the outline.
5. Choose **Download GeoJSON** to save all buildings as a GeoJSON FeatureCollection.

The map preview is a visual reference rather than live imagery. Coordinates are estimated around the Ludhiana reference point in `config/config.js`; use a georeferenced map and a suitable projection for survey-grade measurements.

## Files

- `index.html` — page structure and controls.
- `css/style.css` — responsive dark interface.
- `js/app.js` — map preview, polygon drawing/editing, building details, and GeoJSON export.
- `config/config.js` — reference point and approximate drawing scale.
- `exports/` — suggested place to save exported GeoJSON files.
