(() => {
  const MAP_WIDTH = 940;
  const MAP_HEIGHT = 728;
  const cfg = window.APP_CONFIG;
  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");
  const shapeList = document.getElementById("shape-list");
  const drawButton = document.getElementById("draw-btn");
  const hint = document.getElementById("hint");

  let shapes = [
    {
      id: 1,
      points: [[470, 110], [630, 120], [625, 220], [475, 215]],
      props: { name: "Sunrise Apartments", buildingNo: "12-A", floors: "4", type: "residential", notes: "corner plot" },
    },
    {
      id: 2,
      points: [[430, 340], [550, 340], [550, 430], [430, 430]],
      props: { name: "", buildingNo: "", floors: "", type: "residential", notes: "" },
    },
  ];
  let nextId = 3;
  let selectedId = 1;
  let drawing = false;
  let drawingPoints = [];
  let pointerPosition = null;
  let dragTarget = null;
  let transform = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };

  const roofs = [
    [[87, 95], [226, 85], [233, 185], [95, 195]],
    [[120, 230], [215, 230], [215, 325], [120, 325]],
    [[430, 340], [550, 340], [550, 430], [430, 430]],
    [[620, 380], [710, 380], [710, 510], [620, 510]],
  ];

  function mapPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - transform.offsetX) / transform.scale,
      y: (event.clientY - rect.top - transform.offsetY) / transform.scale,
    };
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.max(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
    transform = {
      scale,
      offsetX: (rect.width - MAP_WIDTH * scale) / 2,
      offsetY: (rect.height - MAP_HEIGHT * scale) / 2,
      dpr,
    };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    drawMap();
  }

  function tracePolygon(points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }

  function drawMap() {
    const { scale, offsetX, offsetY, dpr } = transform;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#303a2d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);

    // A quiet block grid keeps the drawing surface legible while echoing the reference.
    ctx.strokeStyle = "rgba(191, 204, 172, .075)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= MAP_WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, MAP_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(MAP_WIDTH, y + .5); ctx.stroke();
    }

    // Broad streets split the neighborhood blocks.
    ctx.fillStyle = "#51534e";
    ctx.fillRect(357, 0, 14, MAP_HEIGHT);
    ctx.fillRect(0, 417, MAP_WIDTH, 13);
    ctx.fillStyle = "rgba(217, 217, 195, .12)";
    ctx.fillRect(357, 0, 2, MAP_HEIGHT);
    ctx.fillRect(0, 417, MAP_WIDTH, 2);

    roofs.forEach((roof, i) => {
      tracePolygon(roof);
      ctx.save();
      ctx.shadowColor = "rgba(8, 12, 9, .34)";
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = i === 2 ? "#8f806a" : "#91836d";
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(221, 207, 177, .76)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    shapes.forEach((shape) => {
      if (shape.points.length < 3) return;
      const selected = shape.id === selectedId;
      tracePolygon(shape.points);
      ctx.fillStyle = selected ? "rgba(144, 177, 125, .88)" : "rgba(110, 216, 144, .17)";
      ctx.fill();
      ctx.strokeStyle = selected ? "#72dc91" : "rgba(145, 218, 162, .72)";
      ctx.lineWidth = selected ? 2.6 : 1.8;
      ctx.stroke();

      if (selected) {
        shape.points.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = "#f3fff6";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#42bc69";
          ctx.stroke();
        });
      }
    });

    if (drawing && drawingPoints.length) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0][0], drawingPoints[0][1]);
      drawingPoints.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      if (pointerPosition) ctx.lineTo(pointerPosition.x, pointerPosition.y);
      ctx.strokeStyle = "#74e494";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      drawingPoints.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "#f4fff6"; ctx.fill();
      });
    }
  }

  function signedArea(points) {
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      total += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(total) / 2;
  }

  function areaSquareMeters(points) {
    return signedArea(points) * cfg.METERS_PER_MAP_UNIT ** 2;
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
        const area = Math.round(areaSquareMeters(shape.points));
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
          selectShape(id);
        });
        card.querySelector(".del").addEventListener("click", (event) => {
          event.stopPropagation();
          removeShape(id);
        });
        card.querySelectorAll("input, select").forEach((field) => {
          field.addEventListener("input", () => {
            shape.props[field.dataset.field] = field.value;
          });
          field.addEventListener("change", () => {
            shape.props[field.dataset.field] = field.value;
          });
        });
      });
    }

    const count = shapes.length;
    document.getElementById("count-line").textContent = `${count} building${count === 1 ? "" : "s"} traced`;
    document.getElementById("export-btn").disabled = count === 0;
    drawMap();
  }

  function selectShape(id) {
    selectedId = id;
    renderList();
  }

  function removeShape(id) {
    shapes = shapes.filter((shape) => shape.id !== id);
    if (selectedId === id) selectedId = shapes.length ? shapes[shapes.length - 1].id : null;
    renderList();
  }

  function setDrawingMode(enabled) {
    drawing = enabled;
    drawingPoints = [];
    pointerPosition = null;
    drawButton.classList.toggle("active", enabled);
    drawButton.innerHTML = enabled ? '<span class="button-icon">⌁</span>Finish outline' : '<span class="button-icon">＋</span>Draw building';
    canvas.classList.toggle("drawing", enabled);
    hint.classList.toggle("visible", enabled);
    if (enabled) hint.textContent = "Click each corner of the building. Double-click to finish.";
    drawMap();
  }

  function finishDrawing() {
    if (!drawing) return;
    if (drawingPoints.length > 1) {
      const first = drawingPoints[0];
      const last = drawingPoints[drawingPoints.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 5) drawingPoints.pop();
    }
    if (drawingPoints.length >= 3 && signedArea(drawingPoints) > 20) {
      const shape = {
        id: nextId++,
        points: drawingPoints.map((point) => [...point]),
        props: { name: "", buildingNo: String(shapes.length + 1), floors: "", type: "residential", notes: "" },
      };
      shapes.push(shape);
      selectedId = shape.id;
      setDrawingMode(false);
      renderList();
      document.getElementById(`name-${shape.id}`)?.focus({ preventScroll: true });
      shapeList.scrollTop = shapeList.scrollHeight;
    } else {
      setDrawingMode(false);
    }
  }

  function hitVertex(point) {
    const shape = shapes.find((entry) => entry.id === selectedId);
    if (!shape) return null;
    let closest = null;
    shape.points.forEach(([x, y], index) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < 11 && (!closest || distance < closest.distance)) closest = { shape, index, distance };
    });
    return closest;
  }

  function pointInPolygon(point, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      const crosses = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1e-9) + xi);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function shapeAt(point) {
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (pointInPolygon(point, shapes[i].points)) return shapes[i];
    }
    return null;
  }

  function latLng(point) {
    const meters = cfg.METERS_PER_MAP_UNIT;
    const east = (point[0] - MAP_WIDTH / 2) * meters;
    const north = (MAP_HEIGHT / 2 - point[1]) * meters;
    const lat = cfg.DEFAULT_CENTER.lat + north / 111132;
    const lng = cfg.DEFAULT_CENTER.lng + east / (111320 * Math.cos(cfg.DEFAULT_CENTER.lat * Math.PI / 180));
    return [Number(lng.toFixed(7)), Number(lat.toFixed(7))];
  }

  function exportGeoJSON() {
    const features = shapes.map((shape) => {
      const coordinates = shape.points.map(latLng);
      coordinates.push([...coordinates[0]]);
      const area = areaSquareMeters(shape.points);
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
    const file = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/geo+json" });
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

  canvas.addEventListener("pointerdown", (event) => {
    if (drawing) {
      const point = mapPoint(event);
      if (drawingPoints.length >= 3 && Math.hypot(point.x - drawingPoints[0][0], point.y - drawingPoints[0][1]) < 13) {
        finishDrawing();
        return;
      }
      drawingPoints.push([point.x, point.y]);
      pointerPosition = point;
      drawMap();
      event.preventDefault();
      return;
    }
    const vertex = hitVertex(mapPoint(event));
    if (vertex) {
      dragTarget = vertex;
      canvas.classList.add("dragging");
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = mapPoint(event);
    if (drawing) {
      pointerPosition = point;
      drawMap();
    } else if (dragTarget) {
      dragTarget.shape.points[dragTarget.index] = [point.x, point.y];
      drawMap();
    } else {
      canvas.style.cursor = hitVertex(point) ? "grab" : shapeAt(point) ? "pointer" : "crosshair";
    }
  });

  function endVertexDrag() {
    if (!dragTarget) return;
    dragTarget = null;
    canvas.classList.remove("dragging");
    renderList();
  }
  canvas.addEventListener("pointerup", endVertexDrag);
  canvas.addEventListener("pointercancel", endVertexDrag);

  canvas.addEventListener("click", (event) => {
    if (drawing || dragTarget) return;
    const shape = shapeAt(mapPoint(event));
    if (shape && shape.id !== selectedId) selectShape(shape.id);
  });

  canvas.addEventListener("dblclick", (event) => {
    event.preventDefault();
    if (drawing) finishDrawing();
  });

  canvas.addEventListener("pointerleave", () => {
    if (drawing) { pointerPosition = null; drawMap(); }
  });

  drawButton.addEventListener("click", () => {
    if (drawing) finishDrawing();
    else setDrawingMode(true);
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    if (!shapes.length || !window.confirm("Remove all traced buildings?")) return;
    shapes = [];
    selectedId = null;
    renderList();
  });

  document.getElementById("export-btn").addEventListener("click", exportGeoJSON);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawing) setDrawingMode(false);
    if (event.key === "Enter" && drawing) finishDrawing();
  });

  if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(canvas);
  else window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  renderList();
})();
