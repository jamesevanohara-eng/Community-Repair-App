document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.error("FixFishers: #map element was not found.");
    return;
  }

  if (typeof L === "undefined") {
    mapElement.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:30px;
        text-align:center;
        background:#0d1c14;
        color:#a7f36b;
        font-family:monospace;
      ">
        <div>
          <strong>MAP ENGINE FAILED TO LOAD</strong>
          <p style="color:#91a399">
            Leaflet could not be loaded.
            Check your internet connection and the
            Leaflet links in index.html.
          </p>
        </div>
      </div>
    `;

    console.error(
      "FixFishers: Leaflet (L) is undefined."
    );

    return;
  }

  const fishers = [39.9568, -85.9948];

  const map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView(fishers, 13);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }
  ).addTo(map);


  /*
   * Demo reports
   */

  const reports = [
    {
      location: [39.9568, -85.9948],
      title: "Road damage",
      category: "Pothole / road damage",
      description:
        "Demo community report near Fishers.",
      status: "New"
    },

    {
      location: [39.9675, -85.9942],
      title: "Drainage concern",
      category: "Flooding / drainage",
      description:
        "Demo community report.",
      status: "Under review"
    },

    {
      location: [39.9492, -86.0235],
      title: "Sidewalk issue",
      category: "Tree / sidewalk",
      description:
        "Demo community report.",
      status: "Resolved"
    }
  ];


  /*
   * Custom FixFishers marker
   */

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

    const marker = L.marker(
      report.location,
      { icon }
    ).addTo(map);

    marker.bindPopup(`
      <div class="map-popup">

        <strong>${report.category}</strong>

        <h3>${report.title}</h3>

        <p>
          ${report.description}
        </p>

        <span class="map-popup-status">
          ${report.status}
        </span>

      </div>
    `);
  });


  /*
   * Fix Leaflet rendering when
   * the map becomes visible.
   */

  setTimeout(() => {
    map.invalidateSize();
  }, 500);

});