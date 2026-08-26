/*
 * Loads the user's saved settings (or falls back to WLH_DEFAULTS), applies
 * the border color as a CSS custom property so content.css can use it, and
 * keeps everything in sync if the user changes settings in the popup while
 * YouTube is already open.
 */
(function () {
  window.WLH_SETTINGS = Object.assign({}, WLH_DEFAULTS);

  function applyBorderColor(color) {
    document.documentElement.style.setProperty("--wlh-border-color", color);
  }

  function notifySettingsChanged() {
    document.dispatchEvent(
      new CustomEvent("wlh-settings-changed", { detail: window.WLH_SETTINGS })
    );
  }

  // Initial load. NOTE: this resolves asynchronously, so playlist-shortcuts.js
  // may have already rendered with WLH_DEFAULTS at document_start. The
  // "wlh-settings-changed" event dispatched below lets it re-render with the
  // real values once storage has resolved.
  chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
    window.WLH_SETTINGS = items;
    applyBorderColor(items.borderColor);
    notifySettingsChanged();
  });

  // Live updates while YouTube stays open (e.g. user tweaks the popup)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;

    let changed = false;

    if (changes.borderColor) {
      window.WLH_SETTINGS.borderColor = changes.borderColor.newValue;
      applyBorderColor(window.WLH_SETTINGS.borderColor);
      changed = true;
    }

    if (changes.maxPlaylists) {
      window.WLH_SETTINGS.maxPlaylists = changes.maxPlaylists.newValue;
      changed = true;
    }

    if (changed) notifySettingsChanged();
  });
})();
