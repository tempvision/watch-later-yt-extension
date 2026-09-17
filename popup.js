const borderColorInput = document.getElementById("borderColor");
const borderColorValue = document.getElementById("borderColorValue");
const maxPlaylistsInput = document.getElementById("maxPlaylists");
const showCardButtonInput = document.getElementById("showCardButton");
const resetBtn = document.getElementById("resetBtn");
const savedNote = document.getElementById("savedNote");

let savedNoteTimer = null;
function flashSaved() {
  savedNote.textContent = "Saved";
  savedNote.classList.add("wlh-visible");
  clearTimeout(savedNoteTimer);
  savedNoteTimer = setTimeout(() => savedNote.classList.remove("wlh-visible"), 1200);
}

function saveSettings(settings, callback) {
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) return;
    if (callback) callback();
  });
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeColor(value) {
  if (typeof value === "string" && HEX_COLOR_RE.test(value)) {
    return value.toLowerCase();
  }
  return WLH_DEFAULTS.borderColor;
}

function normalizePlaylistCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.min(20, Math.max(0, parsed));
}

function renderColorValue(hex) {
  borderColorValue.textContent = hex;
  document.documentElement.style.setProperty("--wlh-accent", hex);
}

function loadSettings() {
  chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
    const color = normalizeColor(items.borderColor);
    borderColorInput.value = color;
    renderColorValue(color);
    maxPlaylistsInput.value =
      normalizePlaylistCount(items.maxPlaylists) ?? WLH_DEFAULTS.maxPlaylists;
    showCardButtonInput.checked =
      typeof items.showCardButton === "boolean"
        ? items.showCardButton
        : WLH_DEFAULTS.showCardButton;
  });
}

let borderColorTimer = null;

borderColorInput.addEventListener("input", (e) => {
  const value = normalizeColor(e.target.value);
  borderColorInput.value = value;
  renderColorValue(value);
  clearTimeout(borderColorTimer);
  borderColorTimer = setTimeout(() => saveSettings({ borderColor: value }, flashSaved), 200);
});

borderColorInput.addEventListener("change", (e) => {
  clearTimeout(borderColorTimer);
  const value = normalizeColor(e.target.value);
  borderColorInput.value = value;
  renderColorValue(value);
  saveSettings({ borderColor: value }, flashSaved);
});

let maxPlaylistsTimer = null;

maxPlaylistsInput.addEventListener("input", (e) => {
  clearTimeout(maxPlaylistsTimer);
  const raw = e.target.value;
  if (raw === "") return;

  const value = normalizePlaylistCount(raw);
  if (value === null) return;

  maxPlaylistsTimer = setTimeout(() => {
    saveSettings({ maxPlaylists: value }, flashSaved);
  }, 200);
});

maxPlaylistsInput.addEventListener("blur", (e) => {
  const value = normalizePlaylistCount(e.target.value);
  if (value === null) {
    chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
      e.target.value =
        normalizePlaylistCount(items.maxPlaylists) ?? WLH_DEFAULTS.maxPlaylists;
    });
    return;
  }
  e.target.value = value;
});

showCardButtonInput.addEventListener("change", (e) => {
  saveSettings({ showCardButton: e.target.checked }, flashSaved);
});

resetBtn.addEventListener("click", () => {
  clearTimeout(borderColorTimer);
  clearTimeout(maxPlaylistsTimer);
  saveSettings(WLH_DEFAULTS, () => {
    loadSettings();
    flashSaved();
  });
});

loadSettings();
