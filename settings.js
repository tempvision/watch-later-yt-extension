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

  chrome.storage.sync.get(WLH_DEFAULTS, (items) => {
    window.WLH_SETTINGS = items;
    applyBorderColor(items.borderColor);
    notifySettingsChanged();
  });

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
