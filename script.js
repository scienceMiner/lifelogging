// ===== Constants & utilities =====
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const STORAGE_KEY = "diaryXML";

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

// ===== UI navigation =====
function showScreen(id, btn) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active-screen"));
  document.getElementById(id).classList.add("active-screen");
  document.querySelectorAll(".app-header .tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (id === "viewScreen") renderEntries();
}

function goLeftRight(direction) {
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
  alert("Entry saved.");
  renderEntries();
}

// ===== Render list + search =====
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

// ===== Edit auto-fill on date change =====
function onDateChangePrefill() {
  const iso = document.getElementById("entryDate").value;
  const parts = partsFromISO(iso);
  const textarea = document.getElementById("entryText");
  if (!parts) { textarea.value = ""; return; }
  const doc = loadXML();
  const node = findEntry(doc, parts.day, parts.monthIndex, parts.year);
  textarea.value = node ? (node.textContent || "") : "";
}

// ===== Settings modal + import/export =====
function openSettings(){
  document.getElementById('backdrop').classList.remove('hidden');
  document.getElementById('settingsModal').classList.remove('hidden');
}
function closeSettings(){
  document.getElementById('backdrop').classList.add('hidden');
  document.getElementById('settingsModal').classList.add('hidden');
}
function triggerUpload(){
  const input = document.getElementById('fileInput');
  input.value = '';
  input.click();
}
document.addEventListener('change', function(e){
  if (e.target && e.target.id === 'fileInput' && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = importXMLString(String(reader.result || ""));
        document.getElementById('importResult').textContent = `Imported: ${res.added} added, ${res.updated} updated, ${res.skipped} skipped.`;
        renderEntries();
        onDateChangePrefill();
      } catch (err) {
        document.getElementById('importResult').textContent = 'Import failed: ' + (err && err.message ? err.message : 'Unknown error');
      }
    };
    reader.onerror = () => {
      document.getElementById('importResult').textContent = 'Failed to read file.';
    };
    reader.readAsText(file);
  }
});

function importXMLString(xmlStr){
  const incoming = clampDiaryXML(xmlStr);
  const inEntries = Array.from(incoming.querySelectorAll('entry'));
  const doc = loadXML();
  const diary = doc.querySelector('diary');
  let added=0, updated=0, skipped=0;
  for (const e of inEntries) {
    const day = parseInt(e.getAttribute('day'), 10);
    const month = e.getAttribute('month');
    const year = parseInt(e.getAttribute('year'), 10);
    const monthIndex = MONTHS.indexOf(month);
    if (!Number.isFinite(day) || monthIndex < 0 || !Number.isFinite(year)) { skipped++; continue; }
    const text = e.textContent || "";
    const existing = findEntry(doc, day, monthIndex, year);
    if (existing) {
      existing.textContent = text;
      updated++;
    } else {
      const node = doc.createElement('entry');
      node.setAttribute('day', String(day));
      node.setAttribute('month', MONTHS[monthIndex]);
      node.setAttribute('year', String(year));
      node.textContent = text;
      diary.appendChild(node);
      added++;
    }
  }
  saveXMLDoc(doc);
  return {added, updated, skipped};
}

function downloadXML(){
  const doc = loadXML();
  const xml = new XMLSerializer().serializeToString(doc);
  const blob = new Blob([xml], {type: 'application/xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'diary.xml';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  // Guard: ensure modal/backdrop are hidden on load
  document.getElementById('backdrop').classList.add('hidden');
  document.getElementById('settingsModal').classList.add('hidden');

  const dateEl = document.getElementById("entryDate");
  dateEl.value = isoToday();
  dateEl.addEventListener("change", onDateChangePrefill);
  onDateChangePrefill();

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
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      goLeftRight(dx < 0 ? -1 : 1);
    }
    startX = startY = null;
  });

  renderEntries();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
});
