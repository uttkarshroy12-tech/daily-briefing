const CATEGORIES = [
  "India Business",
  "Startups & VC",
  "Government & Policy",
  "Global Markets",
  "US & Global Economy",
  "Macro & Research",
];

const SOURCES = [
  { name: "Economic Times", url: "https://economictimes.indiatimes.com" },
  { name: "Business Standard", url: "https://www.business-standard.com" },
  { name: "Mint", url: "https://www.livemint.com" },
  { name: "Financial Express", url: "https://www.financialexpress.com" },
  { name: "The Hindu BusinessLine", url: "https://www.thehindubusinessline.com" },
  { name: "NDTV Profit", url: "https://www.ndtvprofit.com" },
  { name: "MoneyControl", url: "https://www.moneycontrol.com" },
  { name: "Inc42", url: "https://inc42.com" },
  { name: "Entrackr", url: "https://entrackr.com" },
  { name: "Outlook Business", url: "https://www.outlookbusiness.com" },
  { name: "PIB", url: "https://pib.gov.in" },
  { name: "RBI", url: "https://www.rbi.org.in" },
  { name: "Reuters Business", url: "https://www.reuters.com/business" },
  { name: "BBC Business", url: "https://www.bbc.com/business" },
  { name: "MarketWatch", url: "https://www.marketwatch.com" },
  { name: "CNBC", url: "https://www.cnbc.com" },
  { name: "AP Business", url: "https://apnews.com/business" },
  { name: "Fortune", url: "https://fortune.com" },
  { name: "Quartz", url: "https://qz.com" },
  { name: "The Guardian Business", url: "https://www.theguardian.com/business" },
  { name: "Axios Business", url: "https://www.axios.com" },
  { name: "Business Insider", url: "https://www.businessinsider.com" },
  { name: "IMF Blog", url: "https://www.imf.org/en/Blogs" },
  { name: "World Bank Blogs", url: "https://blogs.worldbank.org" },
  { name: "Federal Reserve", url: "https://www.federalreserve.gov" },
  { name: "ECB", url: "https://www.ecb.europa.eu" },
];

let currentData = null;
let activeCategory = "All";

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

function updateHeader(data) {
  document.getElementById("header-date").textContent = formatDisplayDate(data.date).toUpperCase();
  document.getElementById("header-count").textContent = `${data.total_articles} stories`;
}

function buildSourceList() {
  const ul = document.getElementById("source-list");
  ul.innerHTML = SOURCES.map(s =>
    `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name} ↗</a></li>`
  ).join("");
}

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

function buildCategoryNav(data) {
  const ul = document.getElementById("category-nav");
  const items = [{ name: "All", count: data.total_articles }, ...CATEGORIES.map(cat => ({
    name: cat, count: (data.categories[cat] || []).length,
  }))];
  ul.innerHTML = items.map(item =>
    `<li><button onclick="setCategory('${item.name}')" data-cat="${item.name}" class="${activeCategory === item.name ? 'active' : ''}">
      ${item.name}
      <span style="float:right;font-size:10px;opacity:0.5">${item.count}</span>
    </button></li>`
  ).join("");
}

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll("#category-nav button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderArticles();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderArticles() {
  if (!currentData) return;
  const container = document.getElementById("articles-container");
  const title = document.getElementById("active-category-title");
  const meta = document.getElementById("content-meta");
  let articles = [];
  if (activeCategory === "All") {
    title.textContent = "All Stories";
    CATEGORIES.forEach(cat => articles.push({ cat, items: currentData.categories[cat] || [] }));
  } else {
    title.textContent = activeCategory;
    articles = [{ cat: activeCategory, items: currentData.categories[activeCategory] || [] }];
  }
  const totalShown = articles.reduce((sum, a) => sum + a.items.length, 0);
  meta.textContent = `${totalShown} developments · Updated ${formatDisplayDate(currentData.date)} · ${currentData.date}`;
  if (totalShown === 0) {
    container.innerHTML = `<div class="empty-state">No stories found for this category today.</div>`;
    return;
  }
  let html = "";
  articles.forEach(({ cat, items }) => {
    if (items.length === 0) return;
    if (activeCategory === "All") html += `<div class="category-section-header">${cat}</div>`;
    items.forEach(article => {
      const time = formatTime(article.published);
      html += `
        <div class="article-card">
          <div class="article-top">
            <a class="article-title" href="${escapeHtml(article.link)}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a>
          </div>
          <p class="article-summary">${escapeHtml(article.summary)}</p>
          <div class="article-footer">
            <div class="article-sources">
              <a class="source-tag" href="${escapeHtml(article.link)}" target="_blank" rel="noopener">
                ${escapeHtml(article.source)} <span class="source-tag-arrow">↗</span>
              </a>
            </div>
            ${time ? `<span class="article-time">${time}</span>` : ""}
          </div>
        </div>`;
    });
  });
  container.innerHTML = html;
}

async function loadDate(date) {
  setActiveArchiveDate(date);
  document.getElementById("articles-container").innerHTML = `<div class="loading-state"></div>`;
  try {
    const res = await fetch(`data/${date}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("Not found");
    currentData = await res.json();
    updateHeader(currentData);
    buildCategoryNav(currentData);
    renderArticles();
  } catch {
    document.getElementById("articles-container").innerHTML = `<div class="error-state">
      No briefing available for ${formatDisplayDate(date)}.<br>
      <span style="font-size:12px;margin-top:8px;display:block">The scraper runs at 7 AM IST. Check back later.</span>
    </div>`;
  }
}

async function loadToday() {
  const btn = document.getElementById("refresh-btn");
  btn.classList.add("spinning");
  btn.disabled = true;
  await loadDate(today());
  setTimeout(() => { btn.classList.remove("spinning"); btn.disabled = false; }, 600);
}

async function init() {
  buildSourceList();
  await buildArchive();
  await loadToday();
}

document.addEventListener("DOMContentLoaded", init);
