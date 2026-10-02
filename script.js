document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") return console.error("FixFishers: Leaflet failed to load.");

  const $ = (id) => document.getElementById(id);

  // ---------- CONFIG ----------
  const CATEGORIES = {
    "Pothole / road damage": "#3b6f94", "Broken streetlight": "#76609e", "Flooding / drainage": "#3a8792",
    "Fallen tree": "#4b7a51", "Damaged sidewalk": "#8a6a4a", "Broken sign": "#8b6a8f",
    "Park issue": "#a9822f", "Other": "#66706a"
  };
  const STATUSES = ["Received", "Under review", "In progress", "Resolved"];
  const STATUS_COLOR = { "Received": "#8a6a4a", "Under review": "#b7791f", "In progress": "#3b6f94", "Resolved": "#3f6a4c" };
  const SEV_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  const DUPE_METERS = 75;
  const KEY = "fixfishers_v2", VOTES_KEY = "fixfishers_v2_votes";
  const ADMIN = new URLSearchParams(location.search).has("admin"); // demo: add ?admin to the URL

  const center = [39.9568, -85.9948];
  const bounds = L.latLngBounds([39.900, -86.080], [40.010, -85.930]);
  const map = L.map("map", { center, zoom: 13, minZoom: 12, maxZoom: 18, maxBounds: bounds, maxBoundsViscosity: 1 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let markers = {};

  // ---------- DATA ----------
  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const seed = [
    { id: 1, location: [39.9568, -85.9948], title: "Large pothole", category: "Pothole / road damage", description: "Large pothole causing vehicles to swerve into the opposite lane.", severity: "High", status: "Received", address: "Downtown Fishers", createdAt: daysAgo(4), votes: 6 },
    { id: 2, location: [39.9675, -85.9942], title: "Drainage concern", category: "Flooding / drainage", description: "Water collects along the side of the road after heavy rain.", severity: "Medium", status: "Under review", address: "116th Street area", createdAt: daysAgo(5), votes: 3 },
    { id: 3, location: [39.9492, -86.0235], title: "Damaged sidewalk", category: "Damaged sidewalk", description: "Raised section of sidewalk creating a tripping hazard.", severity: "Medium", status: "Resolved", address: "Southeast Fishers", createdAt: daysAgo(7), votes: 2 },
    { id: 4, location: [39.9720, -86.0020], title: "Fallen tree", category: "Fallen tree", description: "Tree has fallen across part of a neighborhood path.", severity: "Critical", status: "In progress", address: "North Fishers", createdAt: daysAgo(3), votes: 9 }
  ];

  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
  let reports = read(KEY, null);
  if (!Array.isArray(reports)) {
    // migrate v1 reports if present
    const old = read("fixfishers_reports", null);
    reports = Array.isArray(old) ? old.map((r) => ({
      ...r, votes: 0, mine: true, createdAt: r.createdAt || new Date().toISOString(),
      status: r.status === "New" ? "Received" : r.status
    })) : seed.slice();
  }
  let voted = new Set(read(VOTES_KEY, []));
  let activeId = null;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(reports));
      localStorage.setItem(VOTES_KEY, JSON.stringify([...voted]));
      return true;
    } catch { toast("Storage is full. Try a smaller photo or delete old reports."); return false; }
  }

  // ---------- HELPERS ----------
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }
  function compressImage(file, max, q, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", q));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  async function getJSON(url, ms = 4000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  const tidy = (s) => s.trim().replace(/,\s*(United States|USA)$/i, "").replace(/,\s*Indiana\b/i, ", IN");

  async function getAddress(lat, lng) {
    try {
      const d = await getJSON(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json&distance=500&outSR=4326`);
      const a = d && d.address;
      if (a) {
        const street = a.Address || a.StAddr, place = a.PlaceName || a.Name;
        const city = a.City || "Fishers", tail = `${city}, ${a.RegionAbbr || "IN"}${a.Postal ? " " + a.Postal : ""}`;
        if (place && street) return tidy(`${place}, ${street}, ${tail}`);
        if (street) return tidy(`${street}, ${tail}`);
        if (a.LongLabel) return tidy(a.LongLabel);
      }
    } catch (e) { console.warn("ArcGIS lookup failed", e); }
    try {
      const d = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const a = d && d.address;
      if (a && a.road) return tidy(`${a.house_number ? a.house_number + " " : ""}${a.road}, ${a.city || a.town || "Fishers"}, IN`);
      if (d && d.display_name) return tidy(d.display_name.split(",").slice(0, 3).join(","));
    } catch (e) { console.warn("Nominatim lookup failed", e); }
    return "Address unavailable";
  }

  // ---------- FILTER OPTIONS ----------
  Object.keys(CATEGORIES).forEach((c) => {
    $("typeFilter").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`);
    $("issueType").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`);
  });

  // ---------- RENDER ----------
  function visible() {
    const type = $("typeFilter").value, status = $("statusFilter").value;
    const q = $("searchInput").value.trim().toLowerCase(), hide = $("hideResolved").checked;
    const list = reports.filter((r) =>
      (type === "all" || r.category === type) &&
      (status === "all" || r.status === status) &&
      !(hide && r.status === "Resolved") &&
      (!q || [r.title, r.address, r.description, r.category].some((f) => (f || "").toLowerCase().includes(q))));
    const sort = $("sortSelect").value;
    list.sort((a, b) =>
      sort === "votes" ? b.votes - a.votes :
      sort === "severity" ? SEV_RANK[b.severity] - SEV_RANK[a.severity] :
      new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }

  function addMarker(r) {
    const done = r.status === "Resolved";
    const icon = L.divIcon({
      className: "fixfishers-marker-wrapper",
      html: `<div class="custom-marker ${done ? "done" : ""}" style="--marker-color:${CATEGORIES[r.category] || CATEGORIES.Other};--status-color:${STATUS_COLOR[r.status]}"><span>${done ? "✓" : "!"}</span></div>`,
      iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -38]
    });
    const popup = `<div class="map-popup">
      ${r.image ? `<img class="popup-image" src="${esc(r.image)}" alt="Photo of ${esc(r.title)}">` : ""}
      <h3>${esc(r.title)}</h3><p>${esc(r.description)}</p>
      <div class="popup-meta">${esc(r.category)} · ${esc(r.severity)} · ${esc(r.status)}<br>${esc(r.address)}<br>${r.votes} neighbor${r.votes === 1 ? "" : "s"} reported this</div></div>`;
    const m = L.marker(r.location, { icon, title: r.title }).bindPopup(popup);
    m.on("click", () => setActive(r.id, true));
    m.addTo(layer); markers[r.id] = m;
  }

  function track(status) {
    const i = STATUSES.indexOf(status);
    return `<div class="track" aria-hidden="true">${STATUSES.map((_, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("")}</div>
      <div class="track-label">${esc(status)}</div>`;
  }

  function render() {
    const list = visible();
    $("issueCount").textContent = list.length;
    $("statOpen").textContent = reports.filter((r) => r.status === "Received" || r.status === "Under review").length;
    $("statProgress").textContent = reports.filter((r) => r.status === "In progress").length;
    $("statFixed").textContent = reports.filter((r) => r.status === "Resolved").length;

    layer.clearLayers(); markers = {};
    list.forEach(addMarker);

    if (!list.length) {
      $("issueList").innerHTML = `<div class="no-issues">No reports match. Clear a filter, or report something new.</div>`;
      return;
    }
    $("issueList").innerHTML = list.map((r) => `
      <div class="issue-card ${r.id === activeId ? "active" : ""}" data-id="${r.id}">
        ${r.image ? `<img class="issue-card-image" src="${esc(r.image)}" alt="Photo of ${esc(r.title)}">` : ""}
        <div class="issue-card-content">
          <div class="issue-card-top">
            <div><h4 class="issue-card-title">${esc(r.title)}</h4>
            <div class="issue-type" style="color:${CATEGORIES[r.category] || CATEGORIES.Other}">${esc(r.category)}</div></div>
            <span class="severity-badge severity-${esc(r.severity.toLowerCase())}">${esc(r.severity)}</span>
          </div>
          <p class="issue-description">${esc(r.description)}</p>
          <div class="issue-meta">${esc(r.address)}<br>Reported ${fmtDate(r.createdAt)}</div>
          ${track(r.status)}
          <div class="issue-card-footer">
            <button type="button" class="mini ${voted.has(r.id) ? "voted" : ""}" data-vote="${r.id}" aria-pressed="${voted.has(r.id)}">
              ${voted.has(r.id) ? "Supported" : "I see this too"} · ${r.votes}</button>
            ${ADMIN ? `<button type="button" class="mini" data-advance="${r.id}">Advance status</button>` : ""}
            ${r.mine ? `<button type="button" class="mini danger" data-delete="${r.id}">Delete</button>` : ""}
          </div>
        </div>
      </div>`).join("");
  }

  function setActive(id, scroll) {
    activeId = id;
    document.querySelectorAll(".issue-card").forEach((c) => {
      const on = Number(c.dataset.id) === id;
      c.classList.toggle("active", on);
      if (on && scroll) c.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  $("issueList").addEventListener("click", (e) => {
    const vote = e.target.closest("[data-vote]"), del = e.target.closest("[data-delete]"), adv = e.target.closest("[data-advance]");
    if (vote) {
      const r = reports.find((x) => x.id === Number(vote.dataset.vote));
      if (voted.has(r.id)) { voted.delete(r.id); r.votes = Math.max(0, r.votes - 1); }
      else { voted.add(r.id); r.votes++; }
      save(); render(); return;
    }
    if (adv) {
      const r = reports.find((x) => x.id === Number(adv.dataset.advance));
      r.status = STATUSES[(STATUSES.indexOf(r.status) + 1) % STATUSES.length];
      save(); render(); return;
    }
    if (del) {
      const id = Number(del.dataset.delete);
      if (confirm("Delete this report?")) { reports = reports.filter((r) => r.id !== id); save(); render(); }
      return;
    }
    const card = e.target.closest(".issue-card");
    if (!card) return;
    const id = Number(card.dataset.id), r = reports.find((x) => x.id === id);
    map.setView(r.location, 16);
    if (markers[id]) markers[id].openPopup();
    setActive(id, false);
  });

  ["typeFilter", "statusFilter", "sortSelect", "hideResolved"].forEach((id) => $(id).addEventListener("change", render));
  $("searchInput").addEventListener("input", render);

  // ---------- REPORT PANEL ----------
  const overlay = $("reportOverlay");
  const openPanel = () => { overlay.classList.add("active"); overlay.setAttribute("aria-hidden", "false"); };
  const closePanel = () => { overlay.classList.remove("active"); overlay.setAttribute("aria-hidden", "true"); };
  $("reportButton").addEventListener("click", openPanel);
  $("closeReport").addEventListener("click", closePanel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePanel(); });

  let picked = null, pickedAddress = "", pickMarker = null, selecting = false, token = 0, image = null;

  function clearImage() { image = null; $("issueImage").value = ""; $("imagePreview").innerHTML = ""; }
  $("issueImage").addEventListener("change", () => {
    const f = $("issueImage").files[0];
    if (!f) return clearImage();
    if (!f.type.startsWith("image/")) { toast("Please choose an image file."); return clearImage(); }
    compressImage(f, 800, 0.72, (url) => {
      image = url;
      $("imagePreview").innerHTML = `<div class="preview-wrapper"><img src="${url}" alt="Selected photo"><button type="button" id="removeImage" class="mini danger">Remove photo</button></div>`;
      $("removeImage").addEventListener("click", clearImage);
    });
  });

  function checkDupes() {
    const box = $("dupeWarning");
    if (!picked) { box.hidden = true; return; }
    const near = reports.filter((r) => r.status !== "Resolved" && r.category === $("issueType").value &&
      map.distance(r.location, [picked.lat, picked.lng]) <= DUPE_METERS);
    if (!near.length) { box.hidden = true; return; }
    const r = near[0];
    box.hidden = false;
    box.innerHTML = `Someone already reported "<strong>${esc(r.title)}</strong>" nearby (${esc(r.status)}). If it's the same problem, support it instead of filing a new report.
      <br><button type="button" class="mini" id="dupeSupport">${voted.has(r.id) ? "Already supported" : "Support existing report"}</button>`;
    $("dupeSupport").addEventListener("click", () => {
      if (!voted.has(r.id)) { voted.add(r.id); r.votes++; save(); }
      resetForm(); closePanel(); activeId = r.id; render();
      map.setView(r.location, 16); if (markers[r.id]) markers[r.id].openPopup();
      toast("Thanks. Your support was added.");
    });
  }
  $("issueType").addEventListener("change", checkDupes);

  async function setLocation(latlng) {
    picked = latlng; pickedAddress = "";
    const mine = ++token;
    $("locationStatus").textContent = "Finding address…";
    $("locationStatus").classList.add("waiting");
    if (pickMarker) map.removeLayer(pickMarker);
    pickMarker = L.marker(latlng).addTo(map);
    checkDupes();
    openPanel();
    const addr = await getAddress(latlng.lat, latlng.lng);
    if (mine !== token || !picked) return;
    pickedAddress = addr;
    $("locationStatus").textContent = addr;
    $("locationStatus").classList.remove("waiting");
  }

  function stopSelecting() { selecting = false; map.getContainer().classList.remove("selecting-location"); }

  $("chooseLocation").addEventListener("click", () => {
    closePanel(); selecting = true;
    map.getContainer().classList.add("selecting-location");
    $("map").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  map.on("click", (e) => { if (selecting) { stopSelecting(); setLocation(e.latlng); } });

  $("useMyLocation").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Your browser can't share its location.");
    $("locationStatus").textContent = "Getting your location…";
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (!bounds.contains(ll)) { $("locationStatus").textContent = "That's outside Fishers. Pick a spot on the map instead."; return; }
      map.setView(ll, 16); setLocation(ll);
    }, () => { $("locationStatus").textContent = "Couldn't get your location. Pick a spot on the map instead."; }, { timeout: 8000 });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (selecting) { stopSelecting(); openPanel(); } else closePanel();
  });

  function resetForm() {
    $("reportForm").reset(); clearImage(); token++;
    if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
    picked = null; pickedAddress = "";
    $("locationStatus").textContent = "Location not selected";
    $("locationStatus").classList.remove("waiting");
    $("dupeWarning").hidden = true; $("formError").hidden = true;
  }

  $("reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("formError");
    const desc = $("issueDescription").value.trim();
    if (!picked) { err.textContent = "Choose a location first: pick on the map or use your location."; err.hidden = false; return; }
    if (!desc) { err.textContent = "Add a short description so crews know what to look for."; err.hidden = false; return; }
    err.hidden = true;

    const category = $("issueType").value;
    const r = {
      id: Date.now(), location: [picked.lat, picked.lng], title: $("issueTitle").value.trim() || category,
      category, description: desc, severity: $("issueSeverity").value, image, status: "Received",
      address: pickedAddress || "Address unavailable", createdAt: new Date().toISOString(), votes: 1, mine: true
    };
    reports.unshift(r); voted.add(r.id);
    if (!save()) { reports.shift(); voted.delete(r.id); return; }

    ["typeFilter", "statusFilter"].forEach((id) => ($(id).value = "all"));
    $("searchInput").value = ""; $("hideResolved").checked = false;
    resetForm(); closePanel(); activeId = r.id; render();
    map.setView(r.location, 16); if (markers[r.id]) markers[r.id].openPopup();
    toast("Report submitted. Thank you!");
  });

  render();
  setTimeout(() => map.invalidateSize(), 400);
});
