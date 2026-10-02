document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") return console.error("FixFishers: Leaflet failed to load.");
  const $ = (id) => document.getElementById(id);

  // ---------- MAP (can zoom out far; borders stay visible) ----------
  const fishersBounds = L.latLngBounds([39.900, -86.080], [40.010, -85.930]);
  const map = L.map("map", {
    center: [39.9568, -85.9948], zoom: 12, minZoom: 9, maxZoom: 18,
    maxBounds: L.latLngBounds([39.60, -86.40], [40.30, -85.60]), maxBoundsViscosity: 0.6
  });
  const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" });
  const earth = L.layerGroup([
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri" }),
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }),
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 })
  ]);
  street.addTo(map);
  function setMode(mode) {
    map.removeLayer(mode === "earth" ? street : earth);
    (mode === "earth" ? earth : street).addTo(map);
    $("modeStreet").classList.toggle("active", mode !== "earth");
    $("modeEarth").classList.toggle("active", mode === "earth");
  }
  $("modeStreet").onclick = () => setMode("street");
  $("modeEarth").onclick = () => setMode("earth");

  const markerLayer = L.layerGroup().addTo(map);
  let markers = {};

  // ---------- FISHERS BOUNDARY (Fishers, Indiana only) ----------
  let boundary = null; // array of polygons: each = array of rings of [lng,lat]
  const FB = "https://nominatim.openstreetmap.org/";
  async function fetchJSON(url, ms = 6000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  async function loadBoundary() {
    try {
      const res = await fetchJSON(FB + "search?format=jsonv2&polygon_geojson=1&limit=5&q=Fishers,+Hamilton+County,+Indiana");
      const hit = res.find((r) => r.geojson && /Polygon/.test(r.geojson.type) && /Fishers/i.test(r.display_name) && /Indiana/i.test(r.display_name));
      if (!hit) return;
      boundary = hit.geojson.type === "Polygon" ? [hit.geojson.coordinates] : hit.geojson.coordinates;
      L.geoJSON(hit.geojson, { style: { color: "#ff6b2c", weight: 3, fillOpacity: 0.04, dashArray: "6 6" }, interactive: false }).addTo(map);
      map.fitBounds(L.geoJSON(hit.geojson).getBounds(), { padding: [20, 20] });
    } catch (e) { console.warn("FixFishers: boundary unavailable, using address check.", e); }
  }
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const inBoundary = (ll) => boundary.some((poly) => inRing(ll.lng, ll.lat, poly[0]) && !poly.slice(1).some((h) => inRing(ll.lng, ll.lat, h)));

  // ---------- ADDRESSES ----------
  function formatAddress(a, ll) {
    const road = a.road || a.pedestrian || a.footway || a.path || a.cycleway;
    const place = a.amenity || a.shop || a.leisure || a.tourism || a.school || a.building;
    const street = a.house_number && road ? `${a.house_number} ${road}` : road;
    const area = a.neighbourhood || a.suburb || a.residential || a.quarter;
    const zip = a.postcode ? " " + a.postcode : "";
    const tail = `Fishers, IN${zip}`;
    if (street || place) return [place, street, tail].filter(Boolean).join(", ");
    if (area) return `${area}, ${tail}`;
    return `Near ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}, ${tail}`;
  }
  const isFishers = (a) => (a.city || a.town || a.village || a.municipality) === "Fishers" && a.state === "Indiana";
  async function resolveLocation(ll) {
    let a = {};
    try { a = (await fetchJSON(`${FB}reverse?format=jsonv2&lat=${ll.lat}&lon=${ll.lng}&zoom=18&addressdetails=1`)).address || {}; } catch (e) {}
    const ok = boundary ? inBoundary(ll) : isFishers(a);
    return { ok, address: formatAddress(a, ll) };
  }

  // ---------- DATA ----------
  const KEY = "fixfishers_reports_v2", USER_KEY = "fixfishers_user";
  const defaults = [
    { id: 1, location: [39.9568, -85.9948], title: "Large pothole", category: "Pothole / road damage", description: "Large pothole causing vehicles to swerve into the opposite lane.", severity: "High", image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=900&q=80", status: "New", address: "Downtown Fishers, Fishers, IN", postedAt: "September 28, 2026", comments: [{ user: "Maria", text: "Hit this yesterday, definitely getting worse.", at: "Sep 29" }] },
    { id: 2, location: [39.9675, -85.9942], title: "Drainage concern", category: "Flooding / drainage", description: "Water collects along the side of the road after heavy rain.", severity: "Medium", image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=80", status: "Under review", address: "116th Street area, Fishers, IN", postedAt: "September 27, 2026", comments: [] },
    { id: 3, location: [39.9492, -86.0235], title: "Damaged sidewalk", category: "Damaged sidewalk", description: "Raised section of sidewalk creating a tripping hazard.", severity: "Medium", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80", status: "Resolved", address: "Southeast Fishers, Fishers, IN", postedAt: "September 25, 2026", comments: [] }
  ];
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch (e) {} return defaults.slice(); };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(reports)); return true; } catch (e) { alert("Storage full. Try a smaller photo or delete old reports."); return false; } }
  let reports = load(), activeId = null, user = localStorage.getItem(USER_KEY) || "";

  const colors = { "Pothole / road damage": "#2563eb", "Broken streetlight": "#7c3aed", "Flooding / drainage": "#0891b2", "Fallen tree": "#15803d", "Damaged sidewalk": "#a16207", "Broken sign": "#be185d", "Park issue": "#c2410c", "Other": "#475569" };
  const sevColors = { Low: "#15803d", Medium: "#b88a00", High: "#ea580c", Critical: "#c81e1e" };
  const statusClass = { New: "status-new", "Under review": "status-review", Resolved: "status-resolved" };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- ACCOUNTS (browser-local; see note in reply) ----------
  function renderAccount() { $("accountButton").textContent = user ? `👤 ${user}` : "Sign in"; }
  function signIn() {
    const n = (prompt("Choose a display name to comment:", user) || "").trim().slice(0, 24);
    if (n) { user = n; localStorage.setItem(USER_KEY, n); renderAccount(); }
    return !!user;
  }
  $("accountButton").onclick = () => {
    if (user && confirm(`Signed in as ${user}.\nOK = switch account, Cancel = stay.`)) { user = ""; localStorage.removeItem(USER_KEY); signIn(); }
    else if (!user) signIn();
    renderAccount();
  };

  // ---------- RENDER ----------
  const els = { type: $("typeFilter"), sev: $("severityFilter"), q: $("searchInput") };
  function filtered() {
    const q = els.q.value.trim().toLowerCase();
    return reports.filter((r) => (els.type.value === "all" || r.category === els.type.value) && (els.sev.value === "all" || r.severity === els.sev.value) &&
      (!q || [r.title, r.address, r.description, r.category].some((f) => (f || "").toLowerCase().includes(q))));
  }
  function addMarker(r) {
    const tc = colors[r.category] || colors.Other, sc = sevColors[r.severity];
    const icon = L.divIcon({ className: "fixfishers-marker-wrapper", html: `<div class="custom-marker" style="--marker-color:${tc};--severity-color:${sc}"><span>!</span></div>`, iconSize: [42, 42], iconAnchor: [21, 42], popupAnchor: [0, -40] });
    const img = r.image ? `<img class="popup-image" src="${esc(r.image)}" alt="">` : `<div class="popup-no-image">No photo</div>`;
    const popup = `${img}<div class="popup-content"><div class="popup-topline"><span class="popup-category" style="color:${tc}">${esc(r.category)}</span><span class="popup-severity" style="background:${sc}">${esc(r.severity)}</span></div>
      <h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><div class="popup-address">📍 ${esc(r.address)}</div>
      <span class="status-badge ${statusClass[r.status] || ""}">${esc(r.status)}</span> <button class="mini-btn" data-open="${r.id}">💬 ${(r.comments || []).length} · View</button></div>`;
    const m = L.marker(r.location, { icon }).bindPopup(popup);
    m.on("click", () => setActive(r.id, true));
    m.addTo(markerLayer); markers[r.id] = m;
  }
  function renderApp() {
    const list = filtered();
    $("issueCount").textContent = list.length;
    $("statTotal").textContent = reports.length;
    $("statOpen").textContent = reports.filter((r) => r.status !== "Resolved").length;
    $("statDone").textContent = reports.filter((r) => r.status === "Resolved").length;
    markerLayer.clearLayers(); markers = {}; list.forEach(addMarker);
    $("issueList").innerHTML = list.length ? list.map((r) => `
      <div class="issue-card ${r.id === activeId ? "active" : ""}" data-id="${r.id}">
        ${r.image ? `<img class="issue-card-image" src="${esc(r.image)}" alt="">` : ""}
        <div class="issue-card-content">
          <div class="issue-card-top"><div><h4 class="issue-card-title">${esc(r.title)}</h4><div class="issue-type" style="color:${colors[r.category] || colors.Other}">${esc(r.category)}</div></div>
          <span class="severity-badge severity-${r.severity.toLowerCase()}">${esc(r.severity)}</span></div>
          <p class="issue-description">${esc(r.description)}</p>
          <div class="issue-meta-row">📍 ${esc(r.address)}</div><div class="issue-meta-row">🕒 ${esc(r.postedAt)}</div>
          <div class="issue-card-footer"><span class="status-badge ${statusClass[r.status] || ""}">${esc(r.status)}</span>
          <span><button class="mini-btn" data-open="${r.id}">💬 ${(r.comments || []).length}</button> <button class="mini-btn danger" data-delete="${r.id}">Delete</button></span></div>
        </div></div>`).join("") : `<div class="no-issues">No reports match these filters.</div>`;
  }
  function setActive(id, scroll) {
    activeId = id;
    document.querySelectorAll(".issue-card").forEach((c) => { const a = +c.dataset.id === id; c.classList.toggle("active", a); if (a && scroll) c.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  }
  [els.type, els.sev].forEach((e) => e.addEventListener("change", renderApp));
  els.q.addEventListener("input", renderApp);

  // ---------- CLICKS: open details, delete, focus ----------
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]"), del = e.target.closest("[data-delete]");
    if (open) { e.stopPropagation(); return openDetail(+open.dataset.open); }
    if (del) {
      e.stopPropagation(); const id = +del.dataset.delete;
      if (confirm("Delete this report?")) { reports = reports.filter((r) => r.id !== id); save(); renderApp(); }
      return;
    }
    const card = e.target.closest(".issue-card");
    if (card) { const id = +card.dataset.id, r = reports.find((x) => x.id === id); if (!r) return; map.setView(r.location, 16); markers[id] && markers[id].openPopup(); setActive(id, false); }
  });

  // ---------- COMMENTS ----------
  let detailId = null;
  function openDetail(id) {
    detailId = id;
    const r = reports.find((x) => x.id === id); if (!r) return;
    const cs = r.comments || [];
    $("detailPanel").innerHTML = `<button class="close-btn" id="closeDetail">×</button>
      <p class="eyebrow">${esc(r.category)}</p><h2>${esc(r.title)}</h2>
      <span class="status-badge ${statusClass[r.status] || ""}">${esc(r.status)}</span> <span class="severity-badge severity-${r.severity.toLowerCase()}">${esc(r.severity)}</span>
      ${r.image ? `<img class="detail-img" src="${esc(r.image)}" alt="">` : ""}
      <p>${esc(r.description)}</p><p class="location-status">📍 ${esc(r.address)} · 🕒 ${esc(r.postedAt)}</p>
      <div class="comments"><h4>Comments (${cs.length})</h4>
      ${cs.map((c) => `<div class="comment"><b>${esc(c.user)}</b><small>${esc(c.at)}</small><p>${esc(c.text)}</p></div>`).join("") || `<p class="location-status">No comments yet. Start the conversation.</p>`}
      <div class="comment-form"><input type="text" id="commentText" maxlength="300" placeholder="${user ? `Comment as ${esc(user)}...` : "Sign in to comment..."}"><button type="button" id="postComment">Post</button></div></div>`;
    $("detailOverlay").classList.add("active");
    $("closeDetail").onclick = () => $("detailOverlay").classList.remove("active");
    const post = () => {
      const t = $("commentText").value.trim(); if (!t) return;
      if (!user && !signIn()) return;
      r.comments = cs.concat({ user, text: t, at: new Date().toLocaleDateString() });
      save(); renderApp(); openDetail(id);
    };
    $("postComment").onclick = post;
    $("commentText").onkeydown = (e) => e.key === "Enter" && post();
  }
  $("detailOverlay").addEventListener("click", (e) => e.target.id === "detailOverlay" && e.target.classList.remove("active"));

  // ---------- REPORT PANEL ----------
  const open = () => $("reportOverlay").classList.add("active"), close = () => $("reportOverlay").classList.remove("active");
  $("reportButton").onclick = open; $("closeReport").onclick = close;
  $("reportOverlay").addEventListener("click", (e) => e.target.id === "reportOverlay" && close());

  let selected = null, selectedAddress = "", selectedImage = null, selMarker = null, picking = false;
  const status = (txt, cls) => { $("locationStatus").textContent = txt; $("locationStatus").className = "location-status " + (cls || ""); };

  async function setLocation(ll, label) {
    status("Checking location...", "waiting");
    const res = await resolveLocation(ll);
    if (!res.ok) { selected = null; status("⚠️ That spot is outside Fishers, Indiana. Choose a location inside Fishers.", "error"); return false; }
    selected = L.latLng(ll.lat, ll.lng); selectedAddress = label || res.address;
    if (selMarker) map.removeLayer(selMarker);
    selMarker = L.marker(selected).addTo(map).bindPopup(`<div class="popup-content"><b>Report location</b><br>${esc(selectedAddress)}</div>`);
    status("📍 " + selectedAddress); return true;
  }

  // location search (bounded to Fishers area, then verified)
  let searchTimer;
  $("placeSearch").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim(), box = $("placeResults");
    if (q.length < 3) { box.innerHTML = ""; return; }
    searchTimer = setTimeout(async () => {
      box.innerHTML = `<div class="none">Searching...</div>`;
      try {
        const vb = "-86.080,40.010,-85.930,39.900";
        const res = await fetchJSON(`${FB}search?format=jsonv2&addressdetails=1&limit=8&bounded=1&viewbox=${vb}&q=${encodeURIComponent(q + " Fishers Indiana")}`);
        const good = res.filter((r) => { const ll = { lat: +r.lat, lng: +r.lon }; return boundary ? inBoundary(ll) : isFishers(r.address || {}); }).slice(0, 5);
        box.innerHTML = good.length ? "" : `<div class="none">No matches inside Fishers, IN.</div>`;
        good.forEach((r) => {
          const b = document.createElement("button"); b.type = "button";
          b.textContent = formatAddress(r.address || {}, { lat: +r.lat, lng: +r.lon });
          b.onclick = async () => {
            const ll = { lat: +r.lat, lng: +r.lon };
            if (await setLocation(ll, b.textContent)) { box.innerHTML = ""; $("placeSearch").value = ""; map.setView(ll, 16); }
          };
          box.appendChild(b);
        });
      } catch (err) { box.innerHTML = `<div class="none">Search unavailable. Use "pick on the map" instead.</div>`; }
    }, 450);
  });

  // pick on map
  $("chooseLocation").onclick = () => {
    close(); picking = true; map.getContainer().classList.add("selecting-location");
    status("Click anywhere inside Fishers on the map.", "waiting");
    $("map").scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (picking) { picking = false; map.getContainer().classList.remove("selecting-location"); status(selected ? "📍 " + selectedAddress : "Location not selected"); open(); }
    else { close(); $("detailOverlay").classList.remove("active"); }
  });
  map.on("click", async (e) => {
    if (!picking) return;
    picking = false; map.getContainer().classList.remove("selecting-location");
    open(); await setLocation(e.latlng);
  });

  // image
  function clearImage() { selectedImage = null; $("issueImage").value = ""; $("imagePreview").innerHTML = ""; }
  $("issueImage").addEventListener("change", () => {
    const f = $("issueImage").files[0]; if (!f) return clearImage();
    const rd = new FileReader();
    rd.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        selectedImage = c.toDataURL("image/jpeg", 0.72);
        $("imagePreview").innerHTML = `<div class="preview-wrapper"><img src="${selectedImage}" alt=""><button type="button" id="rmImg" class="mini-btn danger">Remove photo</button></div>`;
        $("rmImg").onclick = clearImage;
      };
      img.src = ev.target.result;
    };
    rd.readAsDataURL(f);
  });

  // submit
  $("reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!selected) return alert("Please choose a location inside Fishers, Indiana.");
    const description = $("issueDescription").value.trim();
    if (!description) return alert("Please add a description.");
    const category = $("issueType").value;
    const r = { id: Date.now(), location: [selected.lat, selected.lng], title: $("issueTitle").value.trim() || category, category, description, severity: $("issueSeverity").value, image: selectedImage, status: "New", address: selectedAddress, postedAt: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), comments: [] };
    reports.unshift(r);
    if (!save()) { reports.shift(); return; }
    els.type.value = els.sev.value = "all"; els.q.value = "";
    if (selMarker) { map.removeLayer(selMarker); selMarker = null; }
    $("reportForm").reset(); clearImage(); selected = null; selectedAddress = ""; status("Location not selected");
    close(); activeId = r.id; renderApp(); map.setView(r.location, 16); markers[r.id] && markers[r.id].openPopup();
  });

  renderAccount(); renderApp(); loadBoundary();
  setTimeout(() => map.invalidateSize(), 500);
});
