const borderColorInput = document.getElementById("borderColor");
const borderColorValue = document.getElementById("borderColorValue");
const refreshPlaylistsBtn = document.getElementById("refreshPlaylistsBtn");
const selectAllPlaylistsBtn = document.getElementById("selectAllPlaylistsBtn");
const clearPlaylistsBtn = document.getElementById("clearPlaylistsBtn");
const playlistSelectionCount = document.getElementById("playlistSelectionCount");
const playlistList = document.getElementById("playlistList");
const showCardButtonInput = document.getElementById("showCardButton");
const resetBtn = document.getElementById("resetBtn");
const savedNote = document.getElementById("savedNote");

let savedNoteTimer = null;
let playlistCatalog = [];
let selectedPlaylistIds = [];
let selectedPlaylistTimer = null;
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

function renderColorValue(hex) {
  borderColorValue.textContent = hex;
  document.documentElement.style.setProperty("--wlh-accent", hex);
}

function loadSettings() {
  chrome.storage.sync.get(WLH_DEFAULTS, async (items) => {
    const color = normalizeColor(items.borderColor);
    borderColorInput.value = color;
    renderColorValue(color);
    selectedPlaylistIds = Array.isArray(items.selectedPlaylistIds)
      ? items.selectedPlaylistIds
      : [];
    showCardButtonInput.checked =
      typeof items.showCardButton === "boolean"
        ? items.showCardButton
        : WLH_DEFAULTS.showCardButton;
    const catalog = await chrome.storage.local.get("playlistCatalog");
    playlistCatalog = catalog.playlistCatalog?.items || [];
    renderPlaylistList();
  });
}

function updatePlaylistCount() {
  playlistSelectionCount.textContent = `${selectedPlaylistIds.length} selected`;
}

function setPlaylistStatus(message) {
  playlistList.replaceChildren();
  const status = document.createElement("span");
  status.className = "wlh-playlist-status";
  status.textContent = message;
  playlistList.appendChild(status);
}

function renderPlaylistList() {
  updatePlaylistCount();
  const visiblePlaylists = playlistCatalog;

  if (playlistCatalog.length === 0) {
    setPlaylistStatus("Open YouTube and refresh to load playlists.");
    return;
  }

  if (visiblePlaylists.length === 0) {
    setPlaylistStatus("No playlists match your search.");
    return;
  }

  playlistList.replaceChildren();
  for (const playlist of visiblePlaylists) {
    const label = document.createElement("label");
    label.className = "wlh-playlist-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = playlist.id;
    checkbox.checked = selectedPlaylistIds.includes(playlist.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked && !selectedPlaylistIds.includes(playlist.id)) {
        selectedPlaylistIds = [...selectedPlaylistIds, playlist.id];
      } else if (!checkbox.checked) {
        selectedPlaylistIds = selectedPlaylistIds.filter((id) => id !== playlist.id);
      }
      scheduleSelectedPlaylistSave();
    });

    const title = document.createElement("span");
    title.textContent = playlist.title;
    title.title = playlist.title;
    label.append(checkbox, title);
    playlistList.appendChild(label);
  }
}

function scheduleSelectedPlaylistSave() {
  updatePlaylistCount();
  clearTimeout(selectedPlaylistTimer);
  selectedPlaylistTimer = setTimeout(() => {
    saveSettings({ selectedPlaylistIds }, flashSaved);
  }, 200);
}

function selectAllPlaylists() {
  selectedPlaylistIds = playlistCatalog.map((playlist) => playlist.id);
  renderPlaylistList();
  scheduleSelectedPlaylistSave();
}

function clearAllPlaylists() {
  selectedPlaylistIds = [];
  renderPlaylistList();
  scheduleSelectedPlaylistSave();
}

async function refreshPlaylists() {
  setPlaylistStatus("Refreshing playlists...");
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    setPlaylistStatus("Open YouTube and refresh to load playlists.");
    return;
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, { type: "wlh-refresh-playlists" });
    const catalog = await chrome.storage.local.get("playlistCatalog");
    playlistCatalog = catalog.playlistCatalog?.items || [];
    renderPlaylistList();
    flashSaved();
  } catch {
    setPlaylistStatus("Open YouTube and refresh to load playlists.");
  }
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

showCardButtonInput.addEventListener("change", (e) => {
  saveSettings({ showCardButton: e.target.checked }, flashSaved);
});

refreshPlaylistsBtn.addEventListener("click", refreshPlaylists);
selectAllPlaylistsBtn.addEventListener("click", selectAllPlaylists);
clearPlaylistsBtn.addEventListener("click", clearAllPlaylists);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.playlistCatalog) {
    playlistCatalog = changes.playlistCatalog.newValue?.items || [];
    renderPlaylistList();
  }

  if (area === "sync" && changes.selectedPlaylistIds) {
    selectedPlaylistIds = changes.selectedPlaylistIds.newValue || [];
    renderPlaylistList();
  }
});

resetBtn.addEventListener("click", () => {
  clearTimeout(borderColorTimer);
  clearTimeout(selectedPlaylistTimer);
  const resetSelection = playlistCatalog
    .slice(0, WLH_DEFAULTS.maxPlaylists)
    .map((playlist) => playlist.id);
  selectedPlaylistIds = resetSelection;
  saveSettings({
    borderColor: WLH_DEFAULTS.borderColor,
    selectedPlaylistIds: resetSelection,
    showCardButton: WLH_DEFAULTS.showCardButton,
  }, () => {
    loadSettings();
    flashSaved();
  });
});

loadSettings();
