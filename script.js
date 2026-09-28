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

  // ==============================
  // FISHERS MAP
  // ==============================

  const fishersCenter = [39.9568, -85.9948];

  const fishersBounds = L.latLngBounds(
    [39.900, -86.080],
    [40.010, -85.930]
  );

  const map = L.map("map", {
    center: fishersCenter,
    zoom: 13,
    minZoom: 12,
    maxZoom: 17,
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


  // ==============================
  // REPORT DATA
  // ==============================

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
      category: "Damaged sidewalk",
      description: "Demo community report.",
      status: "Resolved"
    }

  ];


  // ==============================
  // MARKER FUNCTION
  // ==============================

  function addReportMarker(report) {

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

        <p>
          ${report.description}
        </p>

        <span class="map-popup-status">
          ${report.status}
        </span>

      </div>

    `);

  }


  // Add existing reports
  reports.forEach(addReportMarker);


  // ==============================
  // REPORT UI
  // ==============================

  const reportButton =
    document.getElementById("reportButton");

  const reportOverlay =
    document.getElementById("reportOverlay");

  const closeReport =
    document.getElementById("closeReport");

  const chooseLocation =
    document.getElementById("chooseLocation");

  const submitReport =
    document.getElementById("submitReport");

  const issueType =
    document.getElementById("issueType");

  const issueDescription =
    document.getElementById("issueDescription");

  const locationStatus =
    document.getElementById("locationStatus");


  let selectedLocation = null;


  // ==============================
  // OPEN REPORT PANEL
  // ==============================

  reportButton.addEventListener("click", () => {

    reportOverlay.classList.add("active");

  });


  // ==============================
  // CLOSE REPORT PANEL
  // ==============================

  closeReport.addEventListener("click", () => {

    reportOverlay.classList.remove("active");

  });


  // Clicking outside panel closes it
  reportOverlay.addEventListener("click", (event) => {

    if (event.target === reportOverlay) {

      reportOverlay.classList.remove("active");

    }

  });


  // ==============================
  // CHOOSE MAP LOCATION
  // ==============================

  chooseLocation.addEventListener("click", () => {

    reportOverlay.classList.remove("active");

    locationStatus.textContent =
      "Click anywhere inside Fishers on the map.";

    locationStatus.classList.add("waiting");

    map.getContainer().classList.add("selecting-location");

  });


  // ==============================
  // MAP CLICK
  // ==============================

  map.on("click", (event) => {

    if (
      !map.getContainer()
        .classList.contains("selecting-location")
    ) {
      return;
    }


    selectedLocation = event.latlng;


    map.getContainer()
      .classList.remove("selecting-location");


    locationStatus.textContent =
      `Location selected: ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`;


    locationStatus.classList.remove("waiting");


    reportOverlay.classList.add("active");


    // Temporary selection marker
    if (window.selectionMarker) {

      map.removeLayer(window.selectionMarker);

    }


    window.selectionMarker =
      L.marker(event.latlng).addTo(map);


    window.selectionMarker.bindPopup(
      "Your report location"
    ).openPopup();

  });


  // ==============================
  // SUBMIT REPORT
  // ==============================

  submitReport.addEventListener("click", () => {

    const type = issueType.value;

    const description =
      issueDescription.value.trim();


    if (!selectedLocation) {

      alert(
        "Please choose a location on the map first."
      );

      return;

    }


    if (!description) {

      alert(
        "Please add a description of the issue."
      );

      return;

    }


    const newReport = {

      location: [
        selectedLocation.lat,
        selectedLocation.lng
      ],

      title: type,

      category: type,

      description: description,

      status: "New"

    };


    // Add report to map
    addReportMarker(newReport);


    // Remove temporary marker
    if (window.selectionMarker) {

      map.removeLayer(
        window.selectionMarker
      );

      window.selectionMarker = null;

    }


    // Reset form
    issueDescription.value = "";

    selectedLocation = null;


    locationStatus.textContent =
      "Location not selected";


    // Close panel
    reportOverlay.classList.remove("active");


    // Zoom to new report
    map.setView(
      [
        newReport.location[0],
        newReport.location[1]
      ],
      15
    );


    // Open newest marker
    setTimeout(() => {

      map.eachLayer((layer) => {

        if (
          layer instanceof L.Marker &&
          layer.getLatLng &&
          layer.getLatLng().lat ===
            newReport.location[0] &&
          layer.getLatLng().lng ===
            newReport.location[1]
        ) {

          layer.openPopup();

        }

      });

    }, 300);


    alert(
      "Your report has been added to the FixFishers map!"
    );

  });


  // ==============================
  // MAP FIX
  // ==============================

  setTimeout(() => {

    map.invalidateSize();

  }, 500);

});