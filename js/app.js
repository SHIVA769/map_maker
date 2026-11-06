(() => {
  const cfg = window.APP_CONFIG;
  const mapElement = document.getElementById("map");
  const shapeList = document.getElementById("shape-list");
  const drawButton = document.getElementById("draw-btn");
  const hint = document.getElementById("hint");
  const mapError = document.getElementById("map-error");

  const shapes = [];
  let nextId = 1;
  let selectedId = null;
  let map = null;
  let drawing = false;
  let pendingPoints = [];
  let previewLine = null;

  function showMapError(message) {
    mapError.textContent = message;
    mapError.hidden = false;
  }

  function setDrawingMode(enabled) {
    drawing = enabled;
    pendingPoints = [];
    if (previewLine) {
      previewLine.setMap(null);
      previewLine = null;
    }
    drawButton.classList.toggle("active", enabled);
    drawButton.innerHTML = enabled ? '<span class="button-icon">⌁</span>Finish outline' : '<span class="button-icon">＋</span>Draw building';
    mapElement.classList.toggle("drawing", enabled);
    hint.classList.toggle("visible", enabled);
    hint.textContent = enabled
      ? "Click each corner of the building. Double-click or choose Finish outline to complete it."
      : "";
  }

  function offsetPoint(eastMeters, northMeters) {
    const lat = cfg.DEFAULT_CENTER.lat + northMeters / 111132;
    const lng = cfg.DEFAULT_CENTER.lng + eastMeters /
      (111320 * Math.cos(cfg.DEFAULT_CENTER.lat * Math.PI / 180));
    return new google.maps.LatLng(lat, lng);
  }

  function seedPoint([x, y]) {
    const east = (x - 470) * cfg.METERS_PER_MAP_UNIT;
    const north = (364 - y) * cfg.METERS_PER_MAP_UNIT;
    return offsetPoint(east, north);
  }

  function addShape(points, props) {
    const id = nextId++;
    const polygon = new google.maps.Polygon({
      map,
      paths: points,
      strokeColor: "#72dc91",
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: "#90b17d",
      fillOpacity: 0.2,
      clickable: true,
      editable: false,
      zIndex: id,
    });
    const shape = { id, polygon, props };
    shapes.push(shape);
    polygon.addListener("click", () => selectShape(id));
    const path = polygon.getPath();
    ["set_at", "insert_at", "remove_at"].forEach((eventName) => {
      path.addListener(eventName, renderList);
    });
    selectShape(id);
    return shape;
  }

  function selectShape(id) {
    selectedId = id;
    shapes.forEach((shape) => {
      const selected = shape.id === id;
      shape.polygon.setOptions({
        editable: selected,
        strokeWeight: selected ? 2.8 : 1.8,
        fillOpacity: selected ? 0.4 : 0.22,
        strokeColor: selected ? "#72dc91" : "#94c9a1",
      });
    });
    renderList();
  }

  function removeShape(id) {
    const index = shapes.findIndex((shape) => shape.id === id);
    if (index < 0) return;
    shapes[index].polygon.setMap(null);
    shapes.splice(index, 1);
    if (selectedId === id) selectedId = shapes.length ? shapes[shapes.length - 1].id : null;
    if (selectedId !== null) selectShape(selectedId);
    else renderList();
  }

  function areaSquareMeters(polygon) {
    return google.maps.geometry.spherical.computeArea(polygon.getPath());
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function renderList() {
    if (!shapes.length) {
      shapeList.innerHTML = `<div class="empty-state" id="empty-state"><div class="empty-icon">⌖</div><strong>No buildings traced yet</strong><span>Choose “Draw building”, then click around a rooftop.</span></div>`;
    } else {
      shapeList.innerHTML = shapes.map((shape, index) => {
        const area = Math.round(areaSquareMeters(shape.polygon));
        const types = ["residential", "commercial", "industrial", "mixed-use", "institutional", "other"];
        return `<article class="shape-card${shape.id === selectedId ? " selected" : ""}" data-shape="${shape.id}">
          <div class="shape-card-top"><span class="idx">BUILDING ${index + 1}</span><button class="del" type="button" aria-label="Delete building ${index + 1}" title="Delete building">×</button></div>
          <div class="field"><label for="name-${shape.id}">Building name</label><input id="name-${shape.id}" type="text" data-field="name" value="${escapeHtml(shape.props.name)}" placeholder="e.g. Sunrise Apartments"></div>
          <div class="field"><label for="number-${shape.id}">Building no. / plot no.</label><input id="number-${shape.id}" type="text" data-field="buildingNo" value="${escapeHtml(shape.props.buildingNo)}" placeholder="e.g. 12-A"></div>
          <div class="field"><label for="floors-${shape.id}">Floors</label><input id="floors-${shape.id}" type="number" min="0" step="1" data-field="floors" value="${escapeHtml(shape.props.floors)}" placeholder="e.g. 4"></div>
          <div class="field"><label for="type-${shape.id}">Type</label><select id="type-${shape.id}" data-field="type">${types.map((type) => `<option value="${type}"${shape.props.type === type ? " selected" : ""}>${type}</option>`).join("")}</select></div>
          <div class="field"><label for="notes-${shape.id}">Notes</label><input id="notes-${shape.id}" type="text" data-field="notes" value="${escapeHtml(shape.props.notes)}" placeholder="Optional"></div>
          <div class="area-tag">${area.toLocaleString()} m² traced</div>
        </article>`;
      }).join("");

      shapeList.querySelectorAll(".shape-card").forEach((card) => {
        const id = Number(card.dataset.shape);
        const shape = shapes.find((entry) => entry.id === id);
        card.addEventListener("click", (event) => {
          if (event.target.closest("button, input, select, label")) return;
          if (shape.id !== selectedId) selectShape(id);
        });
        card.querySelector(".del").addEventListener("click", (event) => {
          event.stopPropagation();
          removeShape(id);
        });
        card.querySelectorAll("input, select").forEach((field) => {
          field.addEventListener("input", () => { shape.props[field.dataset.field] = field.value; });
          field.addEventListener("change", () => { shape.props[field.dataset.field] = field.value; });
        });
      });
    }

    const count = shapes.length;
    document.getElementById("count-line").textContent = `${count} building${count === 1 ? "" : "s"} traced`;
    document.getElementById("export-btn").disabled = count === 0;
  }

  function finishDrawing() {
    if (!drawing) return;
    if (pendingPoints.length >= 3) {
      addShape(pendingPoints.slice(), {
        name: "",
        buildingNo: String(shapes.length + 1),
        floors: "",
        type: "residential",
        notes: "",
      });
    }
    setDrawingMode(false);
    renderList();
    if (selectedId !== null) {
      const nameInput = document.getElementById(`name-${selectedId}`);
      nameInput?.focus({ preventScroll: true });
      shapeList.scrollTop = shapeList.scrollHeight;
    }
  }

  function handleMapClick(event) {
    if (!drawing || !event.latLng) return;
    if (pendingPoints.length >= 3) {
      const gap = google.maps.geometry.spherical.computeDistanceBetween(pendingPoints[0], event.latLng);
      if (gap < 3) {
        finishDrawing();
        return;
      }
    }
    const last = pendingPoints[pendingPoints.length - 1];
    if (last && google.maps.geometry.spherical.computeDistanceBetween(last, event.latLng) < 0.75) return;
    pendingPoints.push(event.latLng);
    previewLine?.setPath(pendingPoints);
  }

  function exportGeoJSON() {
    const features = shapes.map((shape) => {
      const path = shape.polygon.getPath();
      const coordinates = [];
      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        coordinates.push([Number(point.lng().toFixed(7)), Number(point.lat().toFixed(7))]);
      }
      if (coordinates.length) coordinates.push([...coordinates[0]]);
      const area = areaSquareMeters(shape.polygon);
      return {
        type: "Feature",
        properties: {
          building_no: shape.props.buildingNo,
          name: shape.props.name,
          floors: shape.props.floors === "" ? null : Number(shape.props.floors),
          type: shape.props.type,
          notes: shape.props.notes,
          area_sqm: Number(area.toFixed(2)),
        },
        geometry: { type: "Polygon", coordinates: [coordinates] },
      };
    });
    const file = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.download = `buildings-${stamp}.geojson`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function initMap() {
    try {
      await Promise.all([
        google.maps.importLibrary("maps"),
        google.maps.importLibrary("geometry"),
      ]);
      map = new google.maps.Map(mapElement, {
        center: cfg.DEFAULT_CENTER,
        zoom: cfg.DEFAULT_ZOOM,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        tilt: 0,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        clickableIcons: false,
        disableDoubleClickZoom: true,
        gestureHandling: "greedy",
      });
      drawButton.disabled = false;

      map.addListener("click", handleMapClick);
      map.addListener("dblclick", () => { if (drawing) finishDrawing(); });
      map.addListener("mousemove", (event) => {
        if (drawing && pendingPoints.length && event.latLng) {
          previewLine?.setPath([...pendingPoints, event.latLng]);
        }
      });

      const first = [[470, 110], [630, 120], [625, 220], [475, 215]].map(seedPoint);
      addShape(first, {
        name: "Sunrise Apartments", buildingNo: "12-A", floors: "4", type: "residential", notes: "corner plot",
      });
      const second = [[430, 340], [550, 340], [550, 430], [430, 430]].map(seedPoint);
      addShape(second, {
        name: "", buildingNo: "", floors: "", type: "residential", notes: "",
      });
      selectShape(1);
    } catch (error) {
      showMapError("Google Maps failed to start. Check that the Maps JavaScript API is enabled for this key and try reloading.");
      console.error("Google Maps initialization failed", error);
    }
  }

  window.initMap = initMap;
  window.gm_authFailure = () => showMapError("Google Maps could not authorize this key. Check its API and website restrictions.");

  drawButton.addEventListener("click", () => {
    if (!map) return;
    if (drawing) {
      finishDrawing();
    } else {
      setDrawingMode(true);
      previewLine = new google.maps.Polyline({
        map,
        path: [],
        strokeColor: "#72dc91",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        clickable: false,
        zIndex: 1000,
      });
    }
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    if (!shapes.length || !window.confirm("Remove all traced buildings?")) return;
    shapes.splice(0).forEach((shape) => shape.polygon.setMap(null));
    selectedId = null;
    renderList();
  });

  document.getElementById("export-btn").addEventListener("click", exportGeoJSON);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawing) setDrawingMode(false);
    if (event.key === "Enter" && drawing) finishDrawing();
  });

  if (!cfg.GOOGLE_MAPS_API_KEY) {
    showMapError("Add a Google Maps JavaScript API key in config/config.js to load satellite imagery.");
    return;
  }

  const script = document.createElement("script");
  const params = new URLSearchParams({
    key: cfg.GOOGLE_MAPS_API_KEY,
    loading: "async",
    libraries: "geometry",
    callback: "initMap",
    v: "weekly",
    auth_referrer_policy: "origin",
  });
  script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
  script.async = true;
  script.onerror = () => showMapError("Google Maps could not load. Check your network connection and API key settings.");
  document.head.appendChild(script);
})();
