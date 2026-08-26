const borderColorInput = document.getElementById("borderColor");
const borderColorValue = document.getElementById("borderColorValue");
const maxPlaylistsInput = document.getElementById("maxPlaylists");
const resetBtn = document.getElementById("resetBtn");
const savedNote = document.getElementById("savedNote");

let savedNoteTimer = null;
function flashSaved() {
  savedNote.textContent = "Saved";
  savedNote.classList.add("wlh-visible");
  clearTimeout(savedNoteTimer);
  savedNoteTimer = setTimeout(() => savedNote.classList.remove("wlh-visible"), 1200);
}

function renderColorValue(hex) {
  borderColorValue.textContent = hex;
}

function loadSettings() {
  chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
    borderColorInput.value = items.borderColor;
    renderColorValue(items.borderColor);
    maxPlaylistsInput.value = items.maxPlaylists;
  });
}

borderColorInput.addEventListener("input", (e) => {
  const value = e.target.value;
  renderColorValue(value);
  chrome.storage.sync.set({ borderColor: value }, flashSaved);
});

maxPlaylistsInput.addEventListener("input", (e) => {
  const raw = e.target.value;
  if (raw === "") return; // let the user clear the field while typing

  let value = parseInt(raw, 10);
  if (Number.isNaN(value)) return;
  value = Math.min(20, Math.max(0, value));

  chrome.storage.sync.set({ maxPlaylists: value }, flashSaved);
});

maxPlaylistsInput.addEventListener("blur", (e) => {
  // Snap back to a valid number if the field was left empty/invalid
  if (e.target.value === "" || Number.isNaN(parseInt(e.target.value, 10))) {
    chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
      e.target.value = items.maxPlaylists;
    });
  }
});

resetBtn.addEventListener("click", () => {
  chrome.storage.sync.set(WLH_DEFAULTS, () => {
    loadSettings();
    flashSaved();
  });
});

loadSettings();
