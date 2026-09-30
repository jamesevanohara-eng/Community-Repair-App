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


  // =====================================================
  // FISHERS MAP
  // =====================================================

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


  // =====================================================
  // REPAIR TYPE COLORS
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


  // =====================================================
  // SEVERITY COLORS
  // =====================================================

  const severityColors = {

    "Low": "#5c8c61",

    "Medium": "#d0a52b",

    "High": "#d47732",

    "Critical": "#b9433d"

  };


  // =====================================================
  // DEMO REPORTS
  // =====================================================

  const reports = [

    {
      location: [39.9568, -85.9948],

      title: "Large pothole",

      category: "Pothole / road damage",

      description:
        "Large pothole causing vehicles to swerve into the opposite lane.",

      severity: "High",

      image:
        "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=900&q=80",

      status: "New",

      address: "Downtown Fishers",

      postedAt: "September 28, 2026"
    },


    {
      location: [39.9675, -85.9942],

      title: "Drainage concern",

      category: "Flooding / drainage",

      description:
        "Water collects along the side of the road after heavy rain.",

      severity: "Medium",

      image:
        "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=80",

      status: "Under review",

      address: "116th Street area",

      postedAt: "September 27, 2026"
    },


    {
      location: [39.9492, -86.0235],

      title: "Damaged sidewalk",

      category: "Damaged sidewalk",

      description:
        "Raised section of sidewalk creating a tripping hazard.",

      severity: "Medium",

      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",

      status: "Resolved",

      address: "Southeast Fishers",

      postedAt: "September 25, 2026"
    },


    {
      location: [39.9720, -86.0020],

      title: "Fallen tree",

      category: "Fallen tree",

      description:
        "Tree has fallen across part of a neighborhood path.",

      severity: "Critical",

      image:
        "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",

      status: "New",

      address: "North Fishers",

      postedAt: "September 29, 2026"
    }

  ];


  // =====================================================
  // SIDEBAR REFERENCES
  // =====================================================

  const issueList =
    document.getElementById("issueList");

  const issueCount =
    document.getElementById("issueCount");

  const typeFilter =
    document.getElementById("typeFilter");

  const severityFilter =
    document.getElementById("severityFilter");


  const markers = [];


  // =====================================================
  // RENDER ISSUES
  // =====================================================

  function renderIssues() {

    if (!issueList) {
      return;
    }

    const selectedType =
      typeFilter ? typeFilter.value : "all";

    const selectedSeverity =
      severityFilter ? severityFilter.value : "all";


    const filteredReports = reports.filter((report) => {

      const typeMatches =
        selectedType === "all" ||
        report.category === selectedType;

      const severityMatches =
        selectedSeverity === "all" ||
        report.severity === selectedSeverity;

      return typeMatches && severityMatches;

    });


    if (issueCount) {
      issueCount.textContent =
        filteredReports.length;
    }


    if (filteredReports.length === 0) {

      issueList.innerHTML = `
        <div class="no-issues">
          No reports match these filters.
        </div>
      `;

      return;
    }


    issueList.innerHTML = filteredReports.map((report) => {

      const severityClass =
        report.severity.toLowerCase();


      const imageHTML = report.image

        ? `
          <img
            class="issue-card-image"
            src="${report.image}"
            alt="Photo of ${report.title}"
          >
        `

        : "";


      return `

        <div
          class="issue-card"
          data-report-index="${reports.indexOf(report)}"
        >

          ${imageHTML}

          <div class="issue-card-content">

            <div class="issue-card-top">

              <div>

                <h4 class="issue-card-title">
                  ${report.title}
                </h4>

                <div
                  class="issue-type"
                  style="color: ${repairColors[report.category] || repairColors["Other"]}"
                >
                  ${report.category}
                </div>

              </div>

              <span
                class="severity-badge severity-${severityClass}"
              >
                ${report.severity}
              </span>

            </div>


            <p class="issue-description">
              ${report.description}
            </p>


            <div class="issue-meta">

              <div class="issue-meta-row">
                <span>📍</span>
                <span>
                  ${report.address || "Address unavailable"}
                </span>
              </div>

              <div class="issue-meta-row">
                <span>🕒</span>
                <span>
                  ${report.postedAt || "Recently reported"}
                </span>
              </div>

            </div>

          </div>

        </div>

      `;

    }).join("");


    // =================================================
    // SIDEBAR CARD CLICK
    // =================================================

    document
      .querySelectorAll(".issue-card")
      .forEach((card) => {

        card.addEventListener("click", () => {

          const index =
            Number(card.dataset.reportIndex);

          const report =
            reports[index];

          if (!report) {
            return;
          }


          map.setView(
            report.location,
            15
          );


          if (markers[index]) {
            markers[index].openPopup();
          }


          document
            .querySelectorAll(".issue-card")
            .forEach((otherCard) => {

              otherCard.classList.remove("active");

            });

          card.classList.add("active");

        });

      });

  }


  // =====================================================
  // CREATE MARKER
  // =====================================================

  function addReportMarker(report) {

    const typeColor =
      repairColors[report.category] || repairColors["Other"];

    const severityColor =
      severityColors[report.severity] ||
      severityColors["Medium"];


    const icon = L.divIcon({

      className: "fixfishers-marker-wrapper",

      html: `
        <div
          class="custom-marker"
          style="
            --marker-color: ${typeColor};
            --severity-color: ${severityColor};
          "
        >

          <div class="marker-severity"></div>

          <span>!</span>

        </div>
      `,

      iconSize: [42, 42],

      iconAnchor: [21, 42],

      popupAnchor: [0, -39]

    });


    const marker = L.marker(
      report.location,
      {
        icon: icon
      }
    ).addTo(map);


    const markerIndex =
      reports.indexOf(report);

    markers[markerIndex] = marker;


    // =================================================
    // POPUP IMAGE
    // =================================================

    const imageHTML = report.image

      ? `
        <img
          class="popup-image"
          src="${report.image}"
          alt="Photo of reported ${report.category}"
        >
      `

      : `
        <div class="popup-no-image">
          No photo uploaded
        </div>
      `;


    // =================================================
    // POPUP
    // =================================================

    marker.bindPopup(`

      <div class="map-popup">

        ${imageHTML}

        <div class="popup-content">

          <div class="popup-topline">

            <span
              class="popup-category"
              style="color: ${typeColor}"
            >
              ${report.category}
            </span>

            <span
              class="popup-severity"
              style="background: ${severityColor};"
            >
              ${report.severity}
            </span>

          </div>

          <h3>
            ${report.title}
          </h3>

          <p>
            ${report.description}
          </p>

          <div class="popup-address">
            📍 ${report.address || "Address unavailable"}
          </div>

          <div class="popup-date">
            🕒 ${report.postedAt || "Recently reported"}
          </div>

          <div class="popup-footer">

            <span class="map-popup-status">
              ${report.status}
            </span>

          </div>

        </div>

      </div>

    `);


    // =================================================
    // MARKER CLICK
    // =================================================

    marker.on("click", () => {

      if (!issueList) {
        return;
      }


      document
        .querySelectorAll(".issue-card")
        .forEach((card) => {

          card.classList.remove("active");

        });


      const card =
        document.querySelector(
          `.issue-card[data-report-index="${markerIndex}"]`
        );


      if (card) {

        card.classList.add("active");

        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });

      }

    });

  }


  // =====================================================
  // ADD DEMO REPORTS
  // =====================================================

  reports.forEach(addReportMarker);

  renderIssues();


  // =====================================================
  // FILTERS
  // =====================================================

  if (typeFilter) {

    typeFilter.addEventListener("change", () => {
      renderIssues();
    });

  }


  if (severityFilter) {

    severityFilter.addEventListener("change", () => {
      renderIssues();
    });

  }


  // =====================================================
  // REPORT UI
  // =====================================================

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

  const issueSeverity =
    document.getElementById("issueSeverity");

  const issueDescription =
    document.getElementById("issueDescription");

  const issueImage =
    document.getElementById("issueImage");

  const imagePreview =
    document.getElementById("imagePreview");

  const locationStatus =
    document.getElementById("locationStatus");


  let selectedLocation = null;

  let selectedImage = null;

  let selectedAddress = null;


  // =====================================================
  // OPEN REPORT
  // =====================================================

  reportButton.addEventListener("click", () => {

    reportOverlay.classList.add("active");

  });


  // =====================================================
  // CLOSE REPORT
  // =====================================================

  closeReport.addEventListener("click", () => {

    reportOverlay.classList.remove("active");

  });


  reportOverlay.addEventListener("click", (event) => {

    if (event.target === reportOverlay) {

      reportOverlay.classList.remove("active");

    }

  });


  // =====================================================
  // IMAGE UPLOAD
  // =====================================================

  issueImage.addEventListener("change", () => {

    const file =
      issueImage.files[0];

    if (!file) {

      selectedImage = null;

      imagePreview.innerHTML = "";

      return;

    }


    if (!file.type.startsWith("image/")) {

      alert("Please select an image file.");

      issueImage.value = "";

      return;

    }


    const reader =
      new FileReader();


    reader.onload = (event) => {

      selectedImage =
        event.target.result;


      imagePreview.innerHTML = `

        <div class="preview-wrapper">

          <img
            src="${selectedImage}"
            alt="Selected repair"
          >

          <button
            type="button"
            id="removeImage"
            class="remove-image"
          >
            Remove photo
          </button>

        </div>

      `;


      document
        .getElementById("removeImage")
        .addEventListener("click", () => {

          selectedImage = null;

          issueImage.value = "";

          imagePreview.innerHTML = "";

        });

    };


    reader.readAsDataURL(file);

  });


  // =====================================================
  // CHOOSE LOCATION
  // =====================================================

  chooseLocation.addEventListener("click", () => {

    reportOverlay.classList.remove("active");

    locationStatus.textContent =
      "Click anywhere inside Fishers on the map.";

    locationStatus.classList.add("waiting");

    map.getContainer()
      .classList.add("selecting-location");

  });


  // =====================================================
  // ADDRESS CLEANER
  // =====================================================

  function cleanAddress(address) {

    if (!address) {
      return null;
    }


    let cleaned =
      address.trim();


    // Remove USA
    cleaned =
      cleaned.replace(
        /,\s*USA$/i,
        ""
      );


    // Normalize Indiana
    cleaned =
      cleaned.replace(
        /,\s*Indiana\b/i,
        ", IN"
      );


    return cleaned;

  }


  // =====================================================
  // ARC GIS REVERSE GEOCODING
  // =====================================================

  async function getRealAddress(lat, lng) {

    try {

      const url =
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode` +
        `?location=${lng},${lat}` +
        `&f=json` +
        `&distance=500` +
        `&outSR=4326`;


      const response =
        await fetch(url);


      if (!response.ok) {
        throw new Error(
          "ArcGIS request failed."
        );
      }


      const data =
        await response.json();


      if (
        !data ||
        !data.address
      ) {

        return null;

      }


      const address =
        data.address;


      // =================================================
      // OPTION 1:
      // COMPLETE ARCGIS ADDRESS
      // =================================================

      if (
        address.LongLabel &&
        address.LongLabel.trim()
      ) {

        const cleaned =
          cleanAddress(
            address.LongLabel
          );


        if (cleaned) {
          return cleaned;
        }

      }


      // =================================================
      // OPTION 2:
      // STREET ADDRESS
      // =================================================

      if (
        address.Address &&
        address.City
      ) {

        let result =
          address.Address;


        result +=
          `, ${address.City}`;


        if (address.RegionAbbr) {

          result +=
            `, ${address.RegionAbbr}`;

        }


        if (address.Postal) {

          result +=
            ` ${address.Postal}`;

        }


        return cleanAddress(result);

      }


      // =================================================
      // OPTION 3:
      // PLACE NAME
      // =================================================

      if (
        address.PlaceName &&
        address.City
      ) {

        let result =
          address.PlaceName;


        result +=
          `, ${address.City}`;


        if (address.RegionAbbr) {

          result +=
            `, ${address.RegionAbbr}`;

        }


        if (address.Postal) {

          result +=
            ` ${address.Postal}`;

        }


        return cleanAddress(result);

      }


      // =================================================
      // OPTION 4:
      // NEAREST STREET
      // =================================================

      if (
        address.StAddr &&
        address.City
      ) {

        let result =
          address.StAddr;


        result +=
          `, ${address.City}`;


        if (address.RegionAbbr) {

          result +=
            `, ${address.RegionAbbr}`;

        }


        if (address.Postal) {

          result +=
            ` ${address.Postal}`;

        }


        return cleanAddress(result);

      }


      return null;

    } catch (error) {

      console.error(
        "FixFishers: Reverse geocoding failed:",
        error
      );

      return null;

    }

  }


  // =====================================================
  // MAP CLICK
  // =====================================================

  map.on("click", async (event) => {

    if (
      !map.getContainer()
        .classList.contains("selecting-location")
    ) {

      return;

    }


    selectedLocation =
      event.latlng;

    selectedAddress = null;


    map.getContainer()
      .classList.remove("selecting-location");


    // Loading state
    locationStatus.textContent =
      "Finding nearest real address...";

    locationStatus.classList.add("waiting");


    // Remove old temporary marker
    if (window.selectionMarker) {

      map.removeLayer(
        window.selectionMarker
      );

    }


    // Create temporary marker
    window.selectionMarker =
      L.marker(event.latlng)
        .addTo(map);


    window.selectionMarker
      .bindPopup(
        "Finding address..."
      )
      .openPopup();


    // Open report form
    reportOverlay.classList.add("active");


    // =================================================
    // FIND REAL ADDRESS
    // =================================================

    const address =
      await getRealAddress(
        event.latlng.lat,
        event.latlng.lng
      );


    if (address) {

      selectedAddress =
        address;


      locationStatus.textContent =
        `📍 ${address}`;

    } else {

      // NEVER display coordinates.
      selectedAddress =
        "Address unavailable";


      locationStatus.textContent =
        "📍 Address unavailable";

    }


    locationStatus.classList.remove(
      "waiting"
    );


    // Update temporary popup
    if (window.selectionMarker) {

      window.selectionMarker
        .bindPopup(
          `<strong>Report location</strong><br>${selectedAddress}`
        )
        .openPopup();

    }

  });


  // =====================================================
  // SUBMIT REPORT
  // =====================================================

  submitReport.addEventListener("click", () => {

    const type =
      issueType.value;

    const severity =
      issueSeverity.value;

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

      severity: severity,

      image: selectedImage,

      status: "New",

      address:
        selectedAddress ||
        "Address unavailable",

      postedAt:
        new Date().toLocaleString()

    };


    // Add report
    reports.push(newReport);


    // Add marker
    addReportMarker(newReport);


    // Refresh sidebar
    renderIssues();


    // Remove temporary marker
    if (window.selectionMarker) {

      map.removeLayer(
        window.selectionMarker
      );

      window.selectionMarker =
        null;

    }


    // Reset form
    issueDescription.value = "";

    issueImage.value = "";

    imagePreview.innerHTML = "";

    selectedImage = null;

    selectedLocation = null;

    selectedAddress = null;


    locationStatus.textContent =
      "Location not selected";


    // Close modal
    reportOverlay.classList.remove(
      "active"
    );


    // Zoom to report
    map.setView(
      [
        newReport.location[0],
        newReport.location[1]
      ],
      15
    );


    // Open popup
    const newMarker =
      markers[reports.length - 1];


    if (newMarker) {

      newMarker.openPopup();

    }


    alert(
      "Your report has been added to the FixFishers map!"
    );

  });


  // =====================================================
  // MAP SIZE
  // =====================================================

  setTimeout(() => {

    map.invalidateSize();

  }, 500);

});