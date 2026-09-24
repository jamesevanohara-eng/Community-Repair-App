const starterReports = [
  {id:1, category:"Pothole / road damage", title:"Road surface needs attention", description:"A rough patch in the roadway may be difficult for cyclists and drivers to navigate.", location:"Sample location · Fishers", status:"New", date:"Demo report"},
  {id:2, category:"Flooding / drainage", title:"Water collecting after rain", description:"Water appears to collect near the curb after rainfall. It may be worth checking the drainage.", location:"Sample intersection · Fishers", status:"Under review", date:"Demo report"},
  {id:3, category:"Tree / sidewalk", title:"Sidewalk area obstructed", description:"A tree branch is extending over part of the sidewalk and may make the path harder to use.", location:"Sample trail area · Fishers", status:"Resolved", date:"Demo report"}
];
const storageKey = "fixfishers-reports-v1";
const grid = document.getElementById("issueGrid");
const categoryFilter = document.getElementById("filterCategory");
const statusFilter = document.getElementById("filterStatus");
const form = document.getElementById("reportForm");
const formMessage = document.getElementById("formMessage");
const totalCount = document.getElementById("totalCount");
const emptyState = document.getElementById("emptyState");

function getReports() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : starterReports;
  } catch {
    return starterReports;
  }
}
function saveReports(reports) {
  try { localStorage.setItem(storageKey, JSON.stringify(reports)); }
  catch { formMessage.textContent = "This browser could not save the report. Please check its storage settings."; }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function shortCategory(category) {
  return category.replace(" / road damage","").replace(" / drainage","").replace(" / sidewalk","");
}
function renderReports() {
  const reports = getReports();
  const category = categoryFilter.value;
  const status = statusFilter.value;
  const filtered = reports.filter(report =>
    (category === "all" || report.category === category) &&
    (status === "all" || report.status === status)
  );
  totalCount.textContent = reports.length;
  grid.innerHTML = filtered.map(report => `
    <article class="issue-card">
      <div class="card-top">
        <span class="category-pill">${escapeHTML(shortCategory(report.category))}</span>
        <span class="status ${report.status === "Under review" ? "under-review" : report.status.toLowerCase()}">${escapeHTML(report.status)}</span>
      </div>
      <h3>${escapeHTML(report.title)}</h3>
      <p>${escapeHTML(report.description)}</p>
      <div class="card-meta"><span class="card-location">⌖ ${escapeHTML(report.location)}</span><span>${escapeHTML(report.date)}</span></div>
    </article>`).join("");
  emptyState.hidden = filtered.length > 0;
}
categoryFilter.addEventListener("change", renderReports);
statusFilter.addEventListener("change", renderReports);
form.addEventListener("submit", event => {
  event.preventDefault();
  const category = document.getElementById("category").value.trim();
  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();
  if (!category || !location || !description) {
    formMessage.textContent = "Please complete all fields before submitting.";
    return;
  }
  const reports = getReports();
  reports.unshift({
    id: Date.now(),
    category,
    title: `${category} reported`,
    description,
    location,
    status: "New",
    date: "Just now · Demo"
  });
  saveReports(reports);
  form.reset();
  categoryFilter.value = "all";
  statusFilter.value = "all";
  renderReports();
  formMessage.textContent = "Your report was added to this browser's demo board. It has not been sent to the city or other users.";
  document.getElementById("issues").scrollIntoView({behavior:"smooth"});
});
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  navLinks.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
renderReports();
