// ===== Constants & utilities =====
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const STORAGE_KEY = "diaryXML";
const THEME_KEY = "diaryTheme"; // 'light' | 'dark' | ''

function isoToday() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function partsFromISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = +m[1];
  const monthIndex = +m[2] - 1;
  const day = +m[3];
  return { year, monthIndex, day };
}

function clampDiaryXML(xmlString) {
  try {
    const doc = new DOMParser().parseFromString(xmlString, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("Bad XML");
    if (!doc.querySelector("diary")) {
      const nd = document.implementation.createDocument("", "", null);
      nd.appendChild(nd.createElement("diary"));
      return nd;
    }
    return doc;
  } catch {
    const nd = document.implementation.createDocument("", "", null);
    nd.appendChild(nd.createElement("diary"));
    return nd;
  }
}

function loadXML() {
  const stored = localStorage.getItem(STORAGE_KEY) || "<diary></diary>";
  return clampDiaryXML(stored);
}

function saveXMLDoc(doc) {
  const xml = new XMLSerializer().serializeToString(doc);
  localStorage.setItem(STORAGE_KEY, xml);
}

function findEntry(doc, day, monthIndex, year) {
  const month = MONTHS[monthIndex];
  return Array.from(doc.querySelectorAll("entry")).find(e =>
    +e.getAttribute("day") === day &&
    e.getAttribute("month") === month &&
    +e.getAttribute("year") === year
  ) || null;
}

function readAllEntries(doc) {
  return Array.from(doc.querySelectorAll("entry")).map(e => {
    const day = +e.getAttribute("day");
    const month = e.getAttribute("month");
    const year = +e.getAttribute("year");
    const monthIndex = Math.max(0, MONTHS.indexOf(month));
    return {
      day, monthIndex, year,
      text: e.textContent || ""
    };
  });
}

function fmtDate(day, monthIndex, year) {
  return `${String(day).padStart(2,"0")} ${MONTHS[monthIndex]} ${year}`;
}

// ===== Theme =====
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark','force-light','force-dark');
  if (theme === 'dark') {
    root.classList.add('dark','force-dark');
  } else if (theme === 'light') {
    root.classList.add('force-light');
  }
}

function toggleTheme() {
  const curr = localStorage.getItem(THEME_KEY) || '';
  const next = curr === 'dark' ? 'light' : (curr === 'light' ? '' : 'dark');
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// ===== UI navigation =====
function showScreen(id, btn) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active-screen"));
  document.getElementById(id).classList.add("active-screen");
  document.querySelectorAll(".app-header .tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (id === "viewScreen") renderEntries();
}

function goLeftRight(direction) {
  // direction: -1 for left swipe (go to View), +1 for right swipe (go to Edit)
  const editBtn = document.getElementById('editTab');
  const viewBtn = document.getElementById('viewTab');
  const editVisible = document.getElementById('editScreen').classList.contains('active-screen');
  if (direction < 0 && editVisible) {
    showScreen('viewScreen', viewBtn);
  } else if (direction > 0 && !editVisible) {
    showScreen('editScreen', editBtn);
  }
}

// ===== CRUD =====
function saveEntry() {
  const iso = document.getElementById("entryDate").value;
  const parts = partsFromISO(iso);
  const text = (document.getElementById("entryText").value || "").trim();

  if (!parts) return alert("Please pick a valid date.");
  if (!text)  return alert("Please write something.");

  const { day, monthIndex, year } = parts;

  const doc = loadXML();
  const diary = doc.querySelector("diary");
  let node = findEntry(doc, day, monthIndex, year);

  if (!node) {
    node = doc.createElement("entry");
    node.setAttribute("day", String(day));
    node.setAttribute("month", MONTHS[monthIndex]);
    node.setAttribute("year", String(year));
    diary.appendChild(node);
  }

  node.textContent = text;

  saveXMLDoc(doc);
  document.getElementById("entryText").value = "";
  alert("Entry saved.");
  renderEntries();
}

function renderEntries() {
  const q = (document.getElementById("searchBox").value || "").toLowerCase().trim();
  const wrap = document.getElementById("viewEntries");
  wrap.innerHTML = "";

  const doc = loadXML();
  const items = readAllEntries(doc);

  items.sort((a,b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.monthIndex !== b.monthIndex) return b.monthIndex - a.monthIndex;
    return b.day - a.day;
  });

  const matches = items.filter(it => {
    const dateStr = fmtDate(it.day, it.monthIndex, it.year).toLowerCase();
    return !q || it.text.toLowerCase().includes(q) || dateStr.includes(q);
  });

  for (const it of matches) {
    const card = document.createElement("div");
    card.className = "entry";
    const date = document.createElement("span");
    date.className = "date";
    date.textContent = fmtDate(it.day, it.monthIndex, it.year);
    const txt = document.createElement("div");
    txt.textContent = it.text;
    card.appendChild(date);
    card.appendChild(txt);
    wrap.appendChild(card);
  }
}

function onDateChangePrefill() {
  const iso = document.getElementById("entryDate").value;
  const parts = partsFromISO(iso);
  if (!parts) return;
  const doc = loadXML();
  const node = findEntry(doc, parts.day, parts.monthIndex, parts.year);
  document.getElementById("entryText").value = node ? (node.textContent || "") : "";
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  applyTheme(localStorage.getItem(THEME_KEY) || '');

  // Date default + prefill
  const dateEl = document.getElementById("entryDate");
  dateEl.value = isoToday();
  dateEl.addEventListener("change", onDateChangePrefill);
  onDateChangePrefill();

  // Swipe gestures
  const main = document.getElementById('appMain');
  let startX = null;
  let startY = null;
  main.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive:true});
  main.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = (e.changedTouches && e.changedTouches[0].clientX) - startX;
    const dy = (e.changedTouches && e.changedTouches[0].clientY) - startY;
    // Guard: ignore mostly vertical scrolls
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      goLeftRight(dx < 0 ? -1 : 1);
    }
    startX = startY = null;
  });

  // Initial render
  renderEntries();
});
