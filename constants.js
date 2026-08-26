// Shared defaults for the extension's configurable settings.
// Loaded before settings.js/playlist-shortcuts.js (content script) and
// before popup.js (extension popup), so both share the same source of
// truth without duplicating values.
const WLH_DEFAULTS = {
  borderColor: "#ff9800",
  maxPlaylists: 5,
};
