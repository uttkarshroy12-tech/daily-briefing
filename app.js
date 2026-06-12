// ── Daily Brief · app.js ──

const CATEGORIES = [
  "India Macro & Policy",
  "India Markets & Corporate",
  "India Startups & VC",
  "Global Macro & Central Banks",
  "Global Markets & Business",
  "Strategy & Deep Analysis",
];

const SOURCES_BY_CAT = {
  "India Macro & Policy": [
    { name: "RBI Press Releases",  url: "https://rbi.org.in" },
    { name: "PIB",                 url: "https://pib.gov.in" },
    { name: "Ministry of Finance", url: "https://finmin.nic.in" },
    { name: "MOSPI",               url: "https://mospi.gov.in" },
    { name: "SEBI",                url: "https://sebi.gov.in" },
    { name: "Financial Express",   url: "https://financialexpress.com" },
    { name: "Business Standard",   url: "https://business-standard.com" },
  ],
  "India Markets & Corporate": [
    { name: "Economic Times",      url: "https://economictimes.com" },
    { name: "Mint",                url: "https://livemint.com" },
    { name: "MoneyControl",        url: "https://moneycontrol.com" },
    { name: "NDTV Profit",         url: "https://ndtvprofit.com" },
    { name: "Hindu BusinessLine",  url: "https://thehindubusinessline.com" },
  ],
  "India Startups & VC": [
    { name: "Inc42",               url: "https://inc42.com" },
    { name: "Entrackr",            url: "https://entrackr.com" },
    { name: "VCCircle",            url: "https://vccircle.com" },
    { name: "Outlook Business",    url: "https://outlookbusiness.com" },
  ],
  "Global Macro & Central Banks": [
    { name: "IMF Blog",            url: "https://imf.org/en/Blogs" },
    { name: "World Bank Blogs",    url: "https://blogs.worldbank.org" },
    { name: "Federal Reserve",     url: "https://federalreserve.gov" },
    { name: "ECB",                 url: "https://ecb.europa.eu" },
    { name: "BIS Papers",          url: "https://bis.org" },
    { name: "OECD Observer",       url: "https://oecd.org" },
    { name: "Project Syndicate",   url: "https://project-syndicate.org" },
  ],
  "Global Markets & Business": [
    { name: "Reuters",             url: "https://reuters.com" },
    { name: "BBC Business",        url: "https://bbc.com/business" },
    { name: "CNBC",                url: "https://cnbc.com" },
    { name: "MarketWatch",         url: "https://marketwatch.com" },
    { name: "AP Business",         url: "https://apnews.com/business" },
    { name: "Fortune",             url: "https://fortune.com" },
    { name: "Guardian Business",   url: "https://theguardian.com/business" },
    { name: "Axios",               url: "https://axios.com" },
    { name: "Business Insider",    url: "https://businessinsider.com" },
  ],
  "Strategy & Deep Analysis": [
    { name: "Bloomberg",           url: "https://bloomberg.com" },
    { name: "Financial Times",     url: "https://ft.com" },
    { name: "The Economist",       url: "https://economist.com" },
    { name: "Wall Street Journal", url: "https://wsj.com" },
    { name: "Quartz",              url: "https://qz.com" },
  ],
};

let currentData = null;
let activeCategory = CATEGORIES[0];
let activeDate = null;

// ── Helpers ──
function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return ""; }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Header ──
function updateHeader(data) {
  document.getElementById("header-date").textContent =
    formatDisplayDate(data.date).toUpperCase();
}

// ── Tabs ──
function initTabs() {
  document.getElementById("tabs-nav").addEventListener("click", e => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    renderSidebar();
    renderArticles();
  });
}

// ── Sidebar sources ──
function renderSidebar() {
  const ul = document.getElementById("source-list");
  const sources = SOURCES_BY_CAT[activeCategory] || [];
  ul.innerHTML = sources.map(s =>
    `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name} ↗</a></li>`
  ).join("");
}

// ── Archive ──
async function buildArchive() {
  const ul = document.getElementById("archive-list");
  const td = today();
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const available = [];
  for (const date of dates) {
    try {
      const res = await fetch(`data/${date}.json`, { method: "HEAD" });
      if (res.ok) available.push(date);
    } catch {}
  }
  if (available.length === 0) {
    ul.innerHTML = `<li style="font-size:11px;color:var(--text-muted);padding:4px 8px;">No archive yet</li>`;
    return;
  }
  ul.innerHTML = available.map(date =>
    `<li><button onclick="loadDate('${date}')" data-date="${date}">
      ${date === td ? "Today" : formatShortDate(date)}
      <span style="color:var(--text-muted);font-size:9px;margin-left:4px">${date}</span>
    </button></li>`
  ).join("");
}

function setActiveArchiveDate(date) {
  document.querySelectorAll("#archive-list button").forEach(btn => {
    btn.style.fontWeight = btn.dataset.date === date ? "600" : "";
    btn.style.color = btn.dataset.date === date ? "var(--accent)" : "";
  });
}

// ── Articles ──
function renderArticles() {
  if (!currentData) return;
  const container = document.getElementById("articles-container");
  const title = document.getElementById("active-category-title");

  title.textContent = activeCategory;

  const articles = currentData.categories[activeCategory] || [];

  if (articles.length === 0) {
    container.innerHTML = `<div class="empty-state">No stories in this category today. Check back after 7 AM IST.</div>`;
    return;
  }

  container.innerHTML = articles.map(article => {
    const time = formatTime(article.published);
    return `
      <div class="article-card">
        <a class="article-title" href="${escapeHtml(article.link)}" target="_blank" rel="noopener">
          ${escapeHtml(article.title)}
        </a>
        <p class="article-summary">${escapeHtml(article.summary)}</p>
        <div class="article-footer">
          <a class="source-tag" href="${escapeHtml(article.link)}" target="_blank" rel="noopener">
            ${escapeHtml(article.source)} <span style="font-size:9px;opacity:0.6">↗</span>
          </a>
          ${time ? `<span class="article-time">${time}</span>` : ""}
        </div>
      </div>`;
  }).join("");
}

// ── Load data ──
async function loadDate(date) {
  activeDate = date;
  setActiveArchiveDate(date);
  document.getElementById("articles-container").innerHTML = `<div class="loading-state"></div>`;
  try {
    const res = await fetch(`data/${date}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("Not found");
    currentData = await res.json();
    updateHeader(currentData);
    renderArticles();
  } catch {
    document.getElementById("articles-container").innerHTML = `
      <div class="error-state">
        No briefing available for ${formatDisplayDate(date)}.<br>
        <span style="font-size:12px;margin-top:8px;display:block">
          The scraper runs at 7 AM IST. Check back later.
        </span>
      </div>`;
  }
}

async function loadToday() {
  const btn = document.getElementById("refresh-btn");
  btn.classList.add("spinning");
  btn.disabled = true;
  await loadDate(today());
  setTimeout(() => {
    btn.classList.remove("spinning");
    btn.disabled = false;
  }, 600);
}

// ── Init ──
async function init() {
  initTabs();
  renderSidebar();
  await buildArchive();
  await loadToday();
}

document.addEventListener("DOMContentLoaded", init);
