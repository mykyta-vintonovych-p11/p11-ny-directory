const CATEGORY_LABELS = {
  software: "Software development",
  agency: "Brand & marketing",
  pe: "Private equity",
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const CATEGORY_ORDER = { software: 0, agency: 1, pe: 2 };
const state = { companies: [], category: "all", query: "", location: "all", emailOnly: false, shortlistOnly: false, sort: "rank" };
const loadSaved = () => {
  try {
    const value = JSON.parse(localStorage.getItem("nyc-outreach-shortlist") || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch { return new Set(); }
};
const saved = loadSaved();

const $ = (selector) => document.querySelector(selector);
const grid = $("#companyGrid");
const count = $("#resultCount");
const title = $("#resultsTitle");
const empty = $("#emptyState");
const detailDialog = $("#detailDialog");
const detailContent = $("#detailContent");
const toast = $("#toast");

const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const mapUrl = (company) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.office.address)}`;
const contact = (company) => {
  if (company.contact.email) return { href: `mailto:${company.contact.email}`, label: "Email" };
  if (company.contact.form) return { href: company.contact.form, label: "Contact" };
  if (company.contact.phone) return { href: `tel:${company.contact.phone.replace(/[^+\d]/g, "")}`, label: "Call" };
  return { href: company.website, label: "Website" };
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function filteredCompanies() {
  const query = state.query.trim().toLowerCase();
  const filtered = state.companies.filter((company) => {
    const haystack = [company.name, company.focus, company.office.address, company.office.area, company.summary].join(" ").toLowerCase();
    return (state.category === "all" || company.category === state.category)
      && (!query || haystack.includes(query))
      && (state.location === "all" || company.office.region === state.location)
      && (!state.emailOnly || Boolean(company.contact.email))
      && (!state.shortlistOnly || saved.has(company.id));
  });

  return filtered.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "priority") return PRIORITY_ORDER[a.outreachPriority] - PRIORITY_ORDER[b.outreachPriority] || a.rank - b.rank;
    return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.rank - b.rank;
  });
}

function cardTemplate(company) {
  const primary = contact(company);
  return `
    <article class="company-card" data-id="${escapeHTML(company.id)}">
      <div class="card-top">
        <span class="rank">${CATEGORY_LABELS[company.category]} · ${String(company.rank).padStart(2, "0")}</span>
        <button class="shortlist-button ${saved.has(company.id) ? "saved" : ""}" type="button" data-save="${escapeHTML(company.id)}" aria-pressed="${saved.has(company.id)}" aria-label="${saved.has(company.id) ? "Remove from" : "Add to"} shortlist">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"/></svg>
        </button>
      </div>
      <span class="category-pill ${company.category}">${CATEGORY_LABELS[company.category]}</span>
      <h3>${escapeHTML(company.name)}</h3>
      <p class="focus">${escapeHTML(company.focus)}</p>
      <div class="office">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <span>${escapeHTML(company.office.area)}<br>${escapeHTML(company.office.address)}</span>
      </div>
      <div class="card-status ${company.status}">${company.status === "verified" ? "Official source verified" : "Check before visiting"}</div>
      <div class="card-actions">
        <a class="contact-primary" href="${escapeHTML(primary.href)}" ${primary.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${primary.label}</a>
        <a href="${mapUrl(company)}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(company.name)} in Maps" title="Open in Maps"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></a>
        <button type="button" data-details="${escapeHTML(company.id)}" aria-label="View ${escapeHTML(company.name)} details" title="View details"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></button>
      </div>
    </article>`;
}

function render() {
  const companies = filteredCompanies();
  grid.innerHTML = companies.map(cardTemplate).join("");
  count.textContent = `${companies.length} ${companies.length === 1 ? "firm" : "firms"}`;
  title.textContent = state.shortlistOnly ? "My shortlist" : state.category === "all" ? "All firms" : CATEGORY_LABELS[state.category];
  empty.hidden = companies.length > 0;
}

function saveCompany(id) {
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  try { localStorage.setItem("nyc-outreach-shortlist", JSON.stringify([...saved])); } catch { showToast("Shortlist could not be saved on this device"); }
  render();
  document.querySelector(`[data-save="${CSS.escape(id)}"]`)?.focus();
  showToast(saved.has(id) ? "Added to shortlist" : "Removed from shortlist");
}

function openDetails(id) {
  const company = state.companies.find((item) => item.id === id);
  if (!company) return;
  const primary = contact(company);
  detailContent.innerHTML = `
    <div class="detail-inner">
      <p class="detail-kicker">${CATEGORY_LABELS[company.category]} · Scale rank ${company.rank} · ${company.outreachPriority} outreach fit</p>
      <h2>${escapeHTML(company.name)}</h2>
      <p class="detail-summary">${escapeHTML(company.summary)}</p>
      <div class="detail-grid">
        <div class="detail-block full"><small>Local office</small><p>${escapeHTML(company.office.address)}<br>${escapeHTML(company.office.type)} · ${escapeHTML(company.office.area)}</p></div>
        <div class="detail-block"><small>Public contact</small><p>${company.contact.email ? `<a href="mailto:${escapeHTML(company.contact.email)}">${escapeHTML(company.contact.email)}</a>` : "No suitable public email listed"}${company.contact.phone ? `<br><a href="tel:${company.contact.phone.replace(/[^+\d]/g, "")}">${escapeHTML(company.contact.phone)}</a>` : ""}</p></div>
        <div class="detail-block"><small>Meeting angle</small><p>${escapeHTML(company.meetingContext)}</p></div>
        <div class="detail-block full"><small>Scale signal</small><p>${escapeHTML(company.scaleSignal)}</p></div>
      </div>
      <div class="detail-links">
        <a class="primary" href="${escapeHTML(primary.href)}" ${primary.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${primary.label} →</a>
        <a href="${escapeHTML(company.website)}" target="_blank" rel="noopener">Website</a>
        <a href="${mapUrl(company)}" target="_blank" rel="noopener">Maps</a>
        <button type="button" data-copy="${escapeHTML(company.id)}">Copy details</button>
      </div>
      <div class="detail-block full">
        <small>Sources · accessed ${escapeHTML(company.verifiedAt)}</small>
        <ul class="source-list">${company.sources.map((source) => `<li><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.label)} ↗</a></li>`).join("")}</ul>
      </div>
    </div>`;
  detailDialog.showModal();
}

async function copyDetails(id) {
  const company = state.companies.find((item) => item.id === id);
  const lines = [company.name, CATEGORY_LABELS[company.category], company.office.address, company.contact.email || company.contact.form || company.contact.phone, company.website, company.meetingContext];
  try {
    await navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
    showToast("Company details copied");
  } catch { showToast("Could not copy company details"); }
}

function exportCsv() {
  const header = ["category", "rank", "company", "area", "address", "email", "phone", "contact_url", "website", "outreach_priority", "verified_at"];
  const rows = filteredCompanies().map((company) => [company.category, company.rank, company.name, company.office.area, company.office.address, company.contact.email, company.contact.phone, company.contact.form, company.website, company.outreachPriority, company.verifiedAt]);
  const safeCell = (value) => {
    const text = String(value || "");
    const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${guarded.replaceAll('"', '""')}"`;
  };
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(safeCell).join(",")).join("\r\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "nyc-outreach-directory.csv";
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}

function resetFilters() {
  state.category = "all"; state.query = ""; state.location = "all"; state.emailOnly = false; state.shortlistOnly = false; state.sort = "rank";
  $("#searchInput").value = ""; $("#locationFilter").value = "all"; $("#sortFilter").value = "rank"; $("#emailOnly").checked = false; $("#shortlistOnly").checked = false;
  document.querySelectorAll(".tab").forEach((tab) => { const active = tab.dataset.category === "all"; tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", String(active)); });
  render();
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) {
    state.category = tab.dataset.category;
    document.querySelectorAll(".tab").forEach((item) => { const active = item === tab; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
    render();
  }
  const save = event.target.closest("[data-save]");
  if (save) saveCompany(save.dataset.save);
  const details = event.target.closest("[data-details]");
  if (details) openDetails(details.dataset.details);
  const copy = event.target.closest("[data-copy]");
  if (copy) copyDetails(copy.dataset.copy);
  if (event.target.closest("[data-close-dialog]")) event.target.closest("dialog").close();
});

$("#searchInput").addEventListener("input", (event) => { state.query = event.target.value; render(); });
$("#locationFilter").addEventListener("change", (event) => { state.location = event.target.value; render(); });
$("#sortFilter").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
$("#emailOnly").addEventListener("change", (event) => { state.emailOnly = event.target.checked; render(); });
$("#shortlistOnly").addEventListener("change", (event) => { state.shortlistOnly = event.target.checked; render(); });
$("#exportButton").addEventListener("click", exportCsv);
$("#clearFilters").addEventListener("click", resetFilters);
$("#installButton").addEventListener("click", () => $("#installDialog").showModal());
$("#shareButton").addEventListener("click", async () => {
  try {
    if (navigator.share) await navigator.share({ title: document.title, text: "45 major firms with offices in the New York metro.", url: location.href });
    else { await navigator.clipboard.writeText(location.href); showToast("Link copied"); }
  } catch (error) {
    if (error.name !== "AbortError") showToast("Could not share this link");
  }
});
document.addEventListener("keydown", (event) => { if (event.key === "/" && document.activeElement.tagName !== "INPUT") { event.preventDefault(); $("#searchInput").focus(); } });
[detailDialog, $("#installDialog")].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));

if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) $("#installButton").hidden = true;

fetch("./data/companies.json")
  .then((response) => { if (!response.ok) throw new Error("Could not load directory data"); return response.json(); })
  .then((data) => { state.companies = data.companies; render(); })
  .catch(() => { count.textContent = "Directory unavailable"; empty.hidden = false; empty.querySelector("p").textContent = "The company data could not be loaded. Please refresh the page."; });

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));

