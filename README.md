# Building Footprint Mapper

A browser app for tracing building footprints on Google satellite imagery, recording building details, and exporting a GeoJSON FeatureCollection.

## Run it

Serve the folder over HTTP or HTTPS and open `index.html` in a modern browser. The page loads Google Maps JavaScript API directly; no build or install step is needed. The Maps JavaScript API must be enabled for the Google Cloud project, with billing configured.

The key is read from `config/config.js`. This is a plain HTML/JavaScript app, so Next.js environment variable names such as `NEXT_PUBLIC_GOOGLE_API_KEY` are not read automatically. The browser key is visible to site visitors; restrict it to your deployed site's HTTP referrers and to the Maps JavaScript API in Google Cloud Console.

## Use it

1. Choose **Draw building**.
2. Click each corner of the footprint. Double-click, press Enter, or choose **Finish outline** to complete it. Press Escape to cancel.
3. Edit the building name, plot number, floor count, type, and notes in its card.
4. Drag a selected footprint's white corner handles to adjust the outline.
5. Choose **Download GeoJSON** to save all buildings as a GeoJSON FeatureCollection.

The initial view is centered on Ludhiana, Punjab. Drawing areas and exported coordinates use the map's geographic positions.

## Files

- `index.html` — page structure and controls.
- `css/style.css` — responsive dark interface.
- `js/app.js` — Google Maps loading, polygon drawing/editing, building details, and GeoJSON export.
- `config/config.js` — Maps API key and default map position/zoom.
- `exports/` — suggested place to save exported GeoJSON files.
