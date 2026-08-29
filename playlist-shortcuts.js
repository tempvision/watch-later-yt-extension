(function () {
  const PLAYLISTS_FEED_URL = "https://www.youtube.com/feed/playlists";
  const CONTAINER_ID = "wlh-playlist-shortcuts";
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  let cachedPlaylists = null;
  let lastFetchTime = 0;
  let inFlight = null;

  function fetchPlaylistsFromFeed() {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const response = await fetch(PLAYLISTS_FEED_URL, {
          credentials: "include",
        });
        const text = await response.text();

        const match = text.match(/var ytInitialData = ({[\s\S]*?});/);
        if (!match) {
          console.warn("[Watch Later Highlighter] ytInitialData not found.");
          return [];
        }

        const data = JSON.parse(match[1]);

        const items =
          data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
            ?.tabRenderer?.content?.richGridRenderer?.contents || [];

        const playlists = items
          .map((i) => i.richItemRenderer?.content?.lockupViewModel)
          .filter(Boolean)
          .map((v) => ({
            title:
              v.metadata?.lockupMetadataViewModel?.title?.content ||
              "Untitled",
            id: v.contentId,
            url: `/playlist?list=${v.contentId}`,
          }))
          .filter((pl) => pl.id && pl.id !== "WL" && pl.id !== "LL");

        cachedPlaylists = playlists;
        lastFetchTime = Date.now();
        return playlists;
      } catch (e) {
        console.error("[Watch Later Highlighter] Failed fetching playlists:", e);
        return [];
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  function findPlaylistsEntry() {
    const anchors = document.querySelectorAll('a#endpoint[href^="/feed/playlists"]');
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") || "";
      if (href === "/feed/playlists" || href.startsWith("/feed/playlists?")) {
        return anchor.closest("ytd-guide-entry-renderer");
      }
    }
    return null;
  }

  function buildShortcutRow(playlist) {
    const row = document.createElement("a");
    row.href = playlist.url;
    row.title = playlist.title;
    row.className = "wlh-shortcut-row";

    const icon = document.createElement("span");
    icon.className = "wlh-shortcut-icon";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z");
    svg.appendChild(path);
    icon.appendChild(svg);

    const label = document.createElement("span");
    label.className = "wlh-shortcut-label";
    label.textContent = playlist.title;

    row.appendChild(icon);
    row.appendChild(label);
    return row;
  }

  function renderShortcuts(playlists) {
    const entry = findPlaylistsEntry();
    if (!entry) return;

    const existing = document.getElementById(CONTAINER_ID);
    if (existing) existing.remove();

    const maxPlaylists =
      (window.WLH_SETTINGS && window.WLH_SETTINGS.maxPlaylists) ??
      WLH_DEFAULTS.maxPlaylists;

    if (!playlists || playlists.length === 0 || maxPlaylists <= 0) return;

    const shortcuts = playlists.slice(0, maxPlaylists);

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.className = "wlh-shortcuts-container";
    shortcuts.forEach((pl) => container.appendChild(buildShortcutRow(pl)));

    entry.insertAdjacentElement("afterend", container);
  }

  async function refreshAndRender({ force = false } = {}) {
    const stale = Date.now() - lastFetchTime > REFRESH_INTERVAL_MS;
    if (cachedPlaylists && !force && !stale) {
      renderShortcuts(cachedPlaylists);
      return;
    }
    const playlists = await fetchPlaylistsFromFeed();
    renderShortcuts(playlists);
  }

  refreshAndRender();

  window.addEventListener("yt-navigate-finish", () => refreshAndRender());

  document.addEventListener("wlh-settings-changed", () => {
    renderShortcuts(cachedPlaylists);
  });

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (!document.getElementById(CONTAINER_ID) && findPlaylistsEntry()) {
        renderShortcuts(cachedPlaylists);
      }
    }, 300);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
