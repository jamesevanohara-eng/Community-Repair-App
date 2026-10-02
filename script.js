document.addEventListener("DOMContentLoaded", () => {

  const mapElement = document.getElementById("map");
  if (!mapElement) return console.error("FixFishers: #map was not found.");
  if (typeof L === "undefined") return console.error("FixFishers: Leaflet failed to load.");

  // =====================================================
  // MAP
  // =====================================================

  const fishersCenter = [39.9568, -85.9948];
  const fishersBounds = L.latLngBounds([39.900, -86.080], [40.010, -85.930]);

  const map = L.map("map", {
    center: fishersCenter,
    zoom: 13,
    minZoom: 12,
    maxZoom: 17,
    maxBounds: fishersBounds,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  let markers = {};

  // =====================================================
  // COLORS
  // =====================================================

  const repairColors = {
    "Pothole / road damage": "#3f78a8",
    "Broken streetlight": "#8067a8",
    "Flooding / drainage": "#3d8f9b",
    "Fallen tree": "#4f8055",
    "Damaged sidewalk": "#916b4b",
    "Broken sign": "#8b718f",
    "Park issue": "#b68b35",
    "Other": "#69736b"
  };

  const severityColors = {
    "Low": "#5c8c61",
    "Medium": "#d0a52b",
    "High": "#d47732",
    "Critical": "#b9433d"
  };

  const statusClasses = {
    "New": "status-new",
    "Under review": "status-review",
    "Resolved": "status-resolved"
  };

  // =====================================================
  // DATA + STORAGE
  // =====================================================

  const STORAGE_KEY = "fixfishers_reports";

  const defaultReports = [
    {
      id: 1,
      location: [39.9568, -85.9948],
      title: "Large pothole",
      category: "Pothole / road damage",
      description: "Large pothole causing vehicles to swerve into the opposite lane.",
      severity: "High",
      image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=900&q=80",
      status: "New",
      address: "Downtown Fishers",
      postedAt: "September 28, 2026"
    },
    {
      id: 2,
      location: [39.9675, -85.9942],
      title: "Drainage concern",
      category: "Flooding / drainage",
      description: "Water collects along the side of the road after heavy rain.",
      severity: "Medium",
      image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=80",
      status: "Under review",
      address: "116th Street area",
      postedAt: "September 27, 2026"
    },
    {
      id: 3,
      location: [39.9492, -86.0235],
      title: "Damaged sidewalk",
      category: "Damaged sidewalk",
      description: "Raised section of sidewalk creating a tripping hazard.",
      severity: "Medium",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",
      status: "Resolved",
      address: "Southeast Fishers",
      postedAt: "September 25, 2026"
    },
    {
      id: 4,
      location: [39.9720, -86.0020],
      title: "Fallen tree",
      category: "Fallen tree",
      description: "Tree has fallen across part of a neighborhood path.",
      severity: "Critical",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
      status: "New",
      address: "North Fishers",
      postedAt: "September 29, 2026"
    }
  ];

  function loadReports() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) return saved;
    } catch (err) {
      console.warn("FixFishers: could not read saved reports.", err);
    }
    return defaultReports.slice();
  }

  function saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (err) {
      console.error("FixFishers: storage full.", err);
      alert("Storage limit reached. Try a smaller photo or delete old reports.");
      return false;
    }
  }

  let reports = loadReports();
  let activeId = null;

  // =====================================================
  // HELPERS
  // =====================================================

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function compressImage(file, maxSize, quality, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function fetchJSON(url, ms = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Request failed: " + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // =====================================================
  // ADDRESS LOOKUP (ArcGIS -> Nominatim -> "unavailable")
  // =====================================================

  function cleanAddress(text) {
    return text.trim()
      .replace(/,\s*United States$/i, "")
      .replace(/,\s*USA$/i, "")
      .replace(/,\s*Indiana\b/i, ", IN");
  }

  async function getArcGISAddress(lat, lng) {
    try {
      const data = await fetchJSON(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode" +
        `?location=${lng},${lat}&f=json&distance=500&outSR=4326`
      );
      const a = data && data.address;
      if (!a) return null;

      const city = a.City || a.Subregion || a.Municipality || "Fishers";
      const state = a.RegionAbbr || "IN";
      const postal = a.Postal ? " " + a.Postal : "";
      const place = a.PlaceName || a.Place_name || a.TargetName || a.Name;
      const street = a.Address || a.StAddr;

      if (place && street) return cleanAddress(`${place}, ${street}, ${city}, ${state}${postal}`);
      if (place) return cleanAddress(`${place}, ${city}, ${state}${postal}`);
      if (street) return cleanAddress(`${street}, ${city}, ${state}${postal}`);
      if (a.LongLabel && a.LongLabel.trim()) return cleanAddress(a.LongLabel);
      return null;
    } catch (err) {
      console.warn("FixFishers: ArcGIS lookup failed.", err);
      return null;
    }
  }

  async function getNominatimAddress(lat, lng) {
    try {
      const data = await fetchJSON(
        "https://nominatim.openstreetmap.org/reverse" +
        `?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const a = data && data.address;
      if (!a) return null;

      const place = a.amenity || a.shop || a.tourism || a.leisure || a.school || a.building || a.name;
      const city = a.city || a.town || a.village || a.municipality || "Fishers";
      const zip = a.postcode ? " " + a.postcode : "";

      if (place && a.house_number && a.road)
        return cleanAddress(`${place}, ${a.house_number} ${a.road}, ${city}, IN${zip}`);
      if (place) return cleanAddress(`${place}, ${city}, IN${zip}`);
      if (a.house_number && a.road)
        return cleanAddress(`${a.house_number} ${a.road}, ${city}, IN${zip}`);
      if (a.road) return cleanAddress(`${a.road}, ${city}, IN${zip}`);

      if (data.display_name) {
        const parts = data.display_name.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) return cleanAddress(parts.slice(0, 4).join(", "));
      }
      return null;
    } catch (err) {
      console.warn("FixFishers: Nominatim lookup failed.", err);
      return null;
    }
  }

  async function getRealAddress(lat, lng) {
    return (await getArcGISAddress(lat, lng)) ||
           (await getNominatimAddress(lat, lng)) ||
           "Address unavailable";
  }

  // =====================================================
  // ELEMENTS
  // =====================================================

  const issueList = document.getElementById("issueList");
  const issueCount = document.getElementById("issueCount");
  const typeFilter = document.getElementById("typeFilter");
  const severityFilter = document.getElementById("severityFilter");
  const searchInput = document.getElementById("searchInput");

  const reportButton = document.getElementById("reportButton");
  const reportOverlay = document.getElementById("reportOverlay");
  const closeReport = document.getElementById("closeReport");
  const reportForm = document.getElementById("reportForm");
  const issueTitle = document.getElementById("issueTitle");
  const issueType = document.getElementById("issueType");
  const issueSeverity = document.getElementById("issueSeverity");
  const issueDescription = document.getElementById("issueDescription");
  const issueImage = document.getElementById("issueImage");
  const imagePreview = document.getElementById("imagePreview");
  const chooseLocation = document.getElementById("chooseLocation");
  const locationStatus = document.getElementById("locationStatus");

  let selectedLocation = null;
  let selectedAddress = "";
  let selectedImage = null;
  let selectionMarker = null;
  let selectingLocation = false;
  let lookupToken = 0;

  // =====================================================
  // MARKERS
  // =====================================================

  function addReportMarker(report) {
    const typeColor = repairColors[report.category] || repairColors["Other"];
    const severityColor = severityColors[report.severity] || severityColors["Medium"];

    const icon = L.divIcon({
      className: "fixfishers-marker-wrapper",
      html: `
        <div class="custom-marker" style="--marker-color:${typeColor}; --severity-color:${severityColor};">
          <div class="marker-severity"></div>
          <span>!</span>
        </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -39]
    });

    const imageHTML = report.image
      ? `<img class="popup-image" src="${esc(report.image)}" alt="Photo of ${esc(report.title)}">`
      : `<div class="popup-no-image">No photo uploaded</div>`;

    const popup = `
      <div class="map-popup">
        ${imageHTML}
        <div class="popup-content">
          <div class="popup-topline">
            <span class="popup-category" style="color:${typeColor}">${esc(report.category)}</span>
            <span class="popup-severity" style="background:${severityColor}">${esc(report.severity)}</span>
          </div>
          <h3>${esc(report.title)}</h3>
          <p>${esc(report.description)}</p>
          <div class="popup-address">📍 ${esc(report.address || "Address unavailable")}</div>
          <div class="popup-date">🕒 ${esc(report.postedAt || "Recently reported")}</div>
          <div class="popup-footer">
            <span class="status-badge ${statusClasses[report.status] || ""}">${esc(report.status)}</span>
          </div>
        </div>
      </div>`;

    const marker = L.marker(report.location, { icon }).bindPopup(popup);
    marker.on("click", () => setActive(report.id, true));
    marker.addTo(markerLayer);
    markers[report.id] = marker;
  }

  // =====================================================
  // RENDER (sidebar + markers, always in sync)
  // =====================================================

  function getFilteredReports() {
    const type = typeFilter.value;
    const severity = severityFilter.value;
    const query = searchInput.value.trim().toLowerCase();

    return reports.filter((r) => {
      const typeOk = type === "all" || r.category === type;
      const severityOk = severity === "all" || r.severity === severity;
      const searchOk = !query ||
        [r.title, r.address, r.description, r.category]
          .some((field) => (field || "").toLowerCase().includes(query));
      return typeOk && severityOk && searchOk;
    });
  }

  function renderApp() {
    const filtered = getFilteredReports();

    issueCount.textContent = filtered.length;

    markerLayer.clearLayers();
    markers = {};
    filtered.forEach(addReportMarker);

    if (filtered.length === 0) {
      issueList.innerHTML = `<div class="no-issues">No reports match these filters.</div>`;
      return;
    }

    issueList.innerHTML = filtered.map((r) => {
      const typeColor = repairColors[r.category] || repairColors["Other"];
      const image = r.image
        ? `<img class="issue-card-image" src="${esc(r.image)}" alt="Photo of ${esc(r.title)}">`
        : "";

      return `
        <div class="issue-card ${r.id === activeId ? "active" : ""}" data-id="${r.id}">
          ${image}
          <div class="issue-card-content">
            <div class="issue-card-top">
              <div>
                <h4 class="issue-card-title">${esc(r.title)}</h4>
                <div class="issue-type" style="color:${typeColor}">${esc(r.category)}</div>
              </div>
              <span class="severity-badge severity-${esc(r.severity.toLowerCase())}">${esc(r.severity)}</span>
            </div>

            <p class="issue-description">${esc(r.description)}</p>

            <div class="issue-meta">
              <div class="issue-meta-row"><span>📍</span><span>${esc(r.address || "Address unavailable")}</span></div>
              <div class="issue-meta-row"><span>🕒</span><span>${esc(r.postedAt || "Recently reported")}</span></div>
            </div>

            <div class="issue-card-footer">
              <span class="status-badge ${statusClasses[r.status] || ""}">${esc(r.status)}</span>
              <button type="button" class="delete-btn" data-delete="${r.id}">Delete</button>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  function setActive(id, scrollCard) {
    activeId = id;
    document.querySelectorAll(".issue-card").forEach((card) => {
      const isActive = Number(card.dataset.id) === id;
      card.classList.toggle("active", isActive);
      if (isActive && scrollCard) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // Sidebar clicks (event delegation)
  issueList.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest("[data-delete]");

    if (deleteBtn) {
      event.stopPropagation();
      const id = Number(deleteBtn.dataset.delete);
      if (confirm("Delete this report?")) {
        reports = reports.filter((r) => r.id !== id);
        if (activeId === id) activeId = null;
        saveReports();
        renderApp();
      }
      return;
    }

    const card = event.target.closest(".issue-card");
    if (!card) return;

    const id = Number(card.dataset.id);
    const report = reports.find((r) => r.id === id);
    if (!report) return;

    map.setView(report.location, 15);
    if (markers[id]) markers[id].openPopup();
    setActive(id, false);
  });

  // Filters + search
  typeFilter.addEventListener("change", renderApp);
  severityFilter.addEventListener("change", renderApp);
  searchInput.addEventListener("input", renderApp);

  // =====================================================
  // REPORT PANEL
  // =====================================================

  const openPanel = () => reportOverlay.classList.add("active");
  const closePanel = () => reportOverlay.classList.remove("active");

  reportButton.addEventListener("click", openPanel);
  closeReport.addEventListener("click", closePanel);
  reportOverlay.addEventListener("click", (e) => {
    if (e.target === reportOverlay) closePanel();
  });

  // =====================================================
  // IMAGE UPLOAD (compressed so storage doesn't overflow)
  // =====================================================

  function clearImage() {
    selectedImage = null;
    issueImage.value = "";
    imagePreview.innerHTML = "";
  }

  issueImage.addEventListener("change", () => {
    const file = issueImage.files[0];

    if (!file) return clearImage();

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return clearImage();
    }

    compressImage(file, 800, 0.72, (dataUrl) => {
      selectedImage = dataUrl;
      imagePreview.innerHTML = `
        <div class="preview-wrapper">
          <img src="${dataUrl}" alt="Selected repair">
          <button type="button" id="removeImage" class="remove-image">Remove photo</button>
        </div>`;
      document.getElementById("removeImage").addEventListener("click", clearImage);
    });
  });

  // =====================================================
  // LOCATION PICKING
  // =====================================================

  function stopSelecting() {
    selectingLocation = false;
    map.getContainer().classList.remove("selecting-location");
  }

  chooseLocation.addEventListener("click", () => {
    closePanel();
    selectingLocation = true;
    locationStatus.textContent = "Click anywhere inside Fishers on the map.";
    locationStatus.classList.add("waiting");
    map.getContainer().classList.add("selecting-location");
    mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Esc cancels picking or closes the panel
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (selectingLocation) {
      stopSelecting();
      locationStatus.textContent = selectedLocation ? `📍 ${selectedAddress}` : "Location not selected";
      locationStatus.classList.remove("waiting");
      openPanel();
    } else {
      closePanel();
    }
  });

  map.on("click", async (event) => {
    if (!selectingLocation) return;

    stopSelecting();
    selectedLocation = event.latlng;
    selectedAddress = "";

    const myLookup = ++lookupToken;

    locationStatus.textContent = "Finding address or nearby place...";
    locationStatus.classList.add("waiting");

    if (selectionMarker) map.removeLayer(selectionMarker);
    selectionMarker = L.marker(event.latlng).addTo(map);
    selectionMarker.bindPopup("Finding location...").openPopup();

    openPanel();

    const address = await getRealAddress(event.latlng.lat, event.latlng.lng);

    // Ignore stale lookups if the user picked again or submitted
    if (myLookup !== lookupToken || !selectedLocation) return;

    selectedAddress = address;
    locationStatus.textContent = `📍 ${selectedAddress}`;
    locationStatus.classList.remove("waiting");

    if (selectionMarker) {
      selectionMarker
        .bindPopup(`<strong>Report location</strong><br>${esc(selectedAddress)}`)
        .openPopup();
    }
  });

  // =====================================================
  // SUBMIT
  // =====================================================

  reportForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedLocation) {
      alert("Please choose a location on the map first.");
      return;
    }

    const description = issueDescription.value.trim();
    if (!description) {
      alert("Please add a description of the issue.");
      return;
    }

    const category = issueType.value;

    const newReport = {
      id: Date.now(),
      location: [selectedLocation.lat, selectedLocation.lng],
      title: issueTitle.value.trim() || category,
      category,
      description,
      severity: issueSeverity.value,
      image: selectedImage,
      status: "New",
      address: selectedAddress || "Address unavailable",
      postedAt: new Date().toLocaleString()
    };

    reports.unshift(newReport);

    if (!saveReports()) {
      reports.shift(); // storage failed, undo
      return;
    }

    // Clear any filters that would hide the new report
    typeFilter.value = "all";
    severityFilter.value = "all";
    searchInput.value = "";

    lookupToken++;
    if (selectionMarker) {
      map.removeLayer(selectionMarker);
      selectionMarker = null;
    }

    // Reset form
    reportForm.reset();
    clearImage();
    selectedLocation = null;
    selectedAddress = "";
    locationStatus.textContent = "Location not selected";
    locationStatus.classList.remove("waiting");

    closePanel();

    activeId = newReport.id;
    renderApp();

    map.setView(newReport.location, 15);
    if (markers[newReport.id]) markers[newReport.id].openPopup();
  });

  // =====================================================
  // START
  // =====================================================

  renderApp();
  setTimeout(() => map.invalidateSize(), 500);

});
