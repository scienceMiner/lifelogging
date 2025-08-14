
document.addEventListener("DOMContentLoaded", () => {
  const editBtn = document.getElementById("editBtn");
  const viewBtn = document.getElementById("viewBtn");
  const editScreen = document.getElementById("editScreen");
  const viewScreen = document.getElementById("viewScreen");
  const entryDate = document.getElementById("entryDate");
  const entryText = document.getElementById("entryText");
  const saveEntry = document.getElementById("saveEntry");
  const searchBox = document.getElementById("searchBox");
  const entriesList = document.getElementById("entriesList");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.getElementById("closeSettings");
  const importXML = document.getElementById("importXML");
  const xmlFileInput = document.getElementById("xmlFileInput");
  const exportXML = document.getElementById("exportXML");

  // Switch screens
  editBtn.addEventListener("click", () => {
    editScreen.style.display = "block";
    viewScreen.style.display = "none";
  });

  viewBtn.addEventListener("click", () => {
    editScreen.style.display = "none";
    viewScreen.style.display = "block";
    renderEntries();
  });

  // Settings modal logic
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
  });

  closeSettings.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });

  // Save entry logic
  saveEntry.addEventListener("click", () => {
    const date = entryDate.value;
    const text = entryText.value.trim();
    if (!date) return alert("Please select a date.");
    let diary = getDiary();
    diary[date] = text;
    saveDiary(diary);
    alert("Entry saved.");
  });

  // Load entry if exists when date changes
  entryDate.addEventListener("change", () => {
    const date = entryDate.value;
    let diary = getDiary();
    entryText.value = diary[date] || "";
  });

  // Search functionality
  searchBox.addEventListener("input", renderEntries);

  function renderEntries() {
    const query = searchBox.value.toLowerCase();
    const diary = getDiary();
    entriesList.innerHTML = "";
    Object.keys(diary).forEach(date => {
      if (diary[date].toLowerCase().includes(query) || date.includes(query)) {
        const div = document.createElement("div");
        div.textContent = `${date}: ${diary[date]}`;
        entriesList.appendChild(div);
      }
    });
  }

  function getDiary() {
    let xml = localStorage.getItem("diaryXML");
    if (!xml) return {};
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    const entries = xmlDoc.getElementsByTagName("entry");
    let diary = {};
    for (let entry of entries) {
      const day = entry.getAttribute("day").padStart(2, "0");
      const month = entry.getAttribute("month");
      const year = entry.getAttribute("year");
      diary[`${year}-${month}-${day}`] = entry.textContent;
    }
    return diary;
  }

  function saveDiary(diary) {
    let xmlDoc = document.implementation.createDocument("", "", null);
    let root = xmlDoc.createElement("diary");
    for (let date in diary) {
      let [year, month, day] = date.split("-");
      let entry = xmlDoc.createElement("entry");
      entry.setAttribute("day", day);
      entry.setAttribute("month", month);
      entry.setAttribute("year", year);
      entry.textContent = diary[date];
      root.appendChild(entry);
    }
    xmlDoc.appendChild(root);
    const serializer = new XMLSerializer();
    const xmlStr = serializer.serializeToString(xmlDoc);
    localStorage.setItem("diaryXML", xmlStr);
  }

  // Export XML
  exportXML.addEventListener("click", () => {
    const xml = localStorage.getItem("diaryXML") || "<diary></diary>";
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diary.xml";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import XML
  importXML.addEventListener("click", () => {
    xmlFileInput.click();
  });

  xmlFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const importedXML = e.target.result;
      const parser = new DOMParser();
      const importedDoc = parser.parseFromString(importedXML, "application/xml");
      const importedEntries = importedDoc.getElementsByTagName("entry");
      let diary = getDiary();
      for (let entry of importedEntries) {
        const day = entry.getAttribute("day").padStart(2, "0");
        const month = entry.getAttribute("month");
        const year = entry.getAttribute("year");
        diary[`${year}-${month}-${day}`] = entry.textContent;
      }
      saveDiary(diary);
      alert("Diary imported.");
    };
    reader.readAsText(file);
  });

  // Service worker registration
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("Service Worker registered."))
      .catch(err => console.error("SW registration failed:", err));
  }
});
