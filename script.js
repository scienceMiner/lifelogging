document.addEventListener("DOMContentLoaded", () => {
  const editTab = document.getElementById("editTab");
  const viewTab = document.getElementById("viewTab");
  const editScreen = document.getElementById("editScreen");
  const viewScreen = document.getElementById("viewScreen");
  const entryDate = document.getElementById("entryDate");
  const entryText = document.getElementById("entryText");
  const saveEntry = document.getElementById("saveEntry");
  const searchBox = document.getElementById("searchBox");
  const entriesList = document.getElementById("entriesList");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const closeSettings = document.getElementById("closeSettings");
  const importXmlBtn = document.getElementById("importXmlBtn");
  const importXmlInput = document.getElementById("importXmlInput");
  const exportXmlBtn = document.getElementById("exportXmlBtn");

  let diaryEntries = loadEntries();

  // Tab switching
  editTab.addEventListener("click", () => {
    editScreen.classList.remove("hidden");
    viewScreen.classList.add("hidden");
  });

  viewTab.addEventListener("click", () => {
    viewScreen.classList.remove("hidden");
    editScreen.classList.add("hidden");
    renderEntries();
  });

  // Auto-fill entry text when date changes
  entryDate.addEventListener("change", () => {
    const dateKey = entryDate.value;
    entryText.value = diaryEntries[dateKey] || "";
  });

  // Save entry
  saveEntry.addEventListener("click", () => {
    if (!entryDate.value) return alert("Please select a date.");
    diaryEntries[entryDate.value] = entryText.value;
    saveEntries(diaryEntries);
    alert("Entry saved.");
  });

  // Search entries
  searchBox.addEventListener("input", () => renderEntries(searchBox.value));

  function renderEntries(filter = "") {
    entriesList.innerHTML = "";
    Object.keys(diaryEntries).forEach(dateKey => {
      if (filter && !diaryEntries[dateKey].toLowerCase().includes(filter.toLowerCase()) &&
          !dateKey.includes(filter)) return;
      const div = document.createElement("div");
      div.innerHTML = `<strong>${dateKey}</strong><p>${diaryEntries[dateKey]}</p>`;
      entriesList.appendChild(div);
    });
  }

  // Modal toggle
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
    modalBackdrop.classList.remove("hidden");
  });
  closeSettings.addEventListener("click", hideModal);
  modalBackdrop.addEventListener("click", hideModal);

  function hideModal() {
    settingsModal.classList.add("hidden");
    modalBackdrop.classList.add("hidden");
  }

  // Import XML
  importXmlBtn.addEventListener("click", () => importXmlInput.click());
  importXmlInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(reader.result, "text/xml");
      const entries = xmlDoc.getElementsByTagName("entry");
      for (let entry of entries) {
        const day = entry.getAttribute("day").padStart(2, "0");
        const month = entry.getAttribute("month");
        const year = entry.getAttribute("year");
        const dateStr = `${year}-${monthNumber(month)}-${day}`;
        diaryEntries[dateStr] = entry.textContent;
      }
      saveEntries(diaryEntries);
      alert("Entries imported.");
    };
    reader.readAsText(file);
  });

  // Export XML
  exportXmlBtn.addEventListener("click", () => {
    let xml = "<diary>\n";
    Object.keys(diaryEntries).forEach(dateKey => {
      const [year, monthNum, day] = dateKey.split("-");
      xml += `  <entry day="${parseInt(day)}" month="${monthName(monthNum)}" year="${year}">${diaryEntries[dateKey]}</entry>\n`;
    });
    xml += "</diary>";
    const blob = new Blob([xml], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "diary.xml";
    link.click();
  });

  function saveEntries(entries) {
    localStorage.setItem("diaryEntries", JSON.stringify(entries));
  }
  function loadEntries() {
    return JSON.parse(localStorage.getItem("diaryEntries") || "{}");
  }
  function monthNumber(mon) {
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return String(months.indexOf(mon) + 1).padStart(2,"0");
  }
  function monthName(num) {
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return months[parseInt(num)-1];
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
  }
});
