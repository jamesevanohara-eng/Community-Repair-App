document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.error("FixFishers: #map was not found.");
    return;
  }

  if (typeof L === "undefined") {
    console.error("FixFishers: Leaflet failed to load.");
    return;
  }

  // Fishers, Indiana
  const fishersCenter = [39.9568, -85.9948];

  // Approximate Fishers city boundary
  const fishersBounds = L.latLngBounds(
    [39.900, -86.080], // Southwest
    [40.010, -85.930]  // Northeast
  );

  const map = L.map("map", {
    center: fishersCenter,
    zoom: 13,
    minZoom: 12,
    maxZoom: 17,

    // Prevent dragging outside Fishers
    maxBounds: fishersBounds,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }
  ).addTo(map);

  // Demo community reports
  const reports = [
    {
      location: [39.9568, -85.9948],
      title: "Road damage",
      category: "Pothole / road damage",
      description: "Demo community report.",
      status: "New"
    },
    {
      location: [39.9675, -85.9942],
      title: "Drainage concern",
      category: "Flooding / drainage",
      description: "Demo community report.",
      status: "Under review"
    },
    {
      location: [39.9492, -86.0235],
      title: "Sidewalk issue",
      category: "Tree / sidewalk",
      description: "Demo community report.",
      status: "Resolved"
    }
  ];

  reports.forEach((report) => {
    const icon = L.divIcon({
      className: "",
      html: `
        <div class="custom-marker">
          <span>!</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -35]
    });

    const marker = L.marker(report.location, {
      icon: icon
    }).addTo(map);

    marker.bindPopup(`
      <div class="map-popup">
        <strong>${report.category}</strong>
        <h3>${report.title}</h3>
        <p>${report.description}</p>
        <span class="map-popup-status">
          ${report.status}
        </span>
      </div>
    `);
  });

  setTimeout(() => {
    map.invalidateSize();
  }, 500);
});