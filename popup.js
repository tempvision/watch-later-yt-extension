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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Guarantees a valid, lowercase #rrggbb value; falls back to the default if
// storage ever contains something malformed (so the color input never renders blank).
function normalizeColor(value) {
  if (typeof value === "string" && HEX_COLOR_RE.test(value)) {
    return value.toLowerCase();
  }
  return WLH_DEFAULTS.borderColor;
}

function renderColorValue(hex) {
  borderColorValue.textContent = hex;
  // Chromatic touch: theme the whole popup with the picked accent color
  // (hex text, focus rings, saved note all pick this up).
  document.documentElement.style.setProperty("--wlh-accent", hex);
}

function loadSettings() {
  chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
    const color = normalizeColor(items.borderColor);
    borderColorInput.value = color;
    renderColorValue(color);
    maxPlaylistsInput.value = items.maxPlaylists;
  });
}

borderColorInput.addEventListener("input", (e) => {
  const value = normalizeColor(e.target.value);
  borderColorInput.value = value;
  renderColorValue(value);
  chrome.storage.sync.set({ borderColor: value }, flashSaved);
});

let maxPlaylistsTimer = null;

maxPlaylistsInput.addEventListener("input", (e) => {
  const raw = e.target.value;
  if (raw === "") return; // let the user clear the field while typing

  let value = parseInt(raw, 10);
  if (Number.isNaN(value)) return;
  value = Math.min(20, Math.max(0, value));

  // Debounce so we don't hammer chrome.storage.sync on every keystroke.
  clearTimeout(maxPlaylistsTimer);
  maxPlaylistsTimer = setTimeout(() => {
    chrome.storage.sync.set({ maxPlaylists: value }, flashSaved);
  }, 200);
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
