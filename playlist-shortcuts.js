/*
 * Adds shortcut rows for your most recent playlists directly below the
 * "Playlists" entry in YouTube's left sidebar.
 *
 * Data source: https://www.youtube.com/feed/playlists
 * We fetch that page's HTML and pull the `ytInitialData` blob out of it —
 * the same JSON YouTube's own front-end uses to render that page — rather
 * than calling a private API endpoint. No extra permissions are needed
 * because the request is same-origin (youtube.com -> youtube.com), so it's
 * sent with your normal session cookies, same as if the page itself had
 * fetched it.
 */

(function () {
  const PLAYLISTS_FEED_URL = "https://www.youtube.com/feed/playlists";
  const CONTAINER_ID = "wlh-playlist-shortcuts";
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // don't hammer the feed on every nav

  let cachedPlaylists = null;
  let lastFetchTime = 0;
  let inFlight = null;

  // -------- Fetch + parse playlists from /feed/playlists --------
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
          // Watch later / Liked videos already have their own sidebar rows
          .filter((pl) => pl.id !== "WL" && pl.id !== "LL");

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

  // -------- DOM helpers --------
  function findPlaylistsEntry() {
    // Match "/feed/playlists" even if YouTube later appends query params
    // (the path is language-neutral, so this holds across locales).
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

    // Build the SVG via DOM APIs instead of innerHTML so we never rely on
    // innerHTML (avoids any Trusted Types friction on YouTube's page).
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
    if (!entry) return; // sidebar not ready / not on a page that shows it yet

    const existing = document.getElementById(CONTAINER_ID);
    if (existing) existing.remove();

    const maxPlaylists =
      (window.WLH_SETTINGS && window.WLH_SETTINGS.maxPlaylists) ??
      WLH_DEFAULTS.maxPlaylists;

    if (!playlists || playlists.length === 0 || maxPlaylists <= 0) return;

    // The feed page orders playlists most-recently-updated first, so the
    // first N are the most recent — show those.
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

  // -------- Lifecycle --------
  // Note: settings.js loads the user's saved settings asynchronously, so on
  // the very first paint we may render with WLH_DEFAULTS. That's fine —
  // settings.js dispatches "wlh-settings-changed" once storage resolves, and
  // the listener below re-renders with the real values.
  refreshAndRender();

  // YouTube is a single-page app; re-render (and occasionally refetch) on
  // client-side navigation instead of waiting for a full page reload.
  window.addEventListener("yt-navigate-finish", () => refreshAndRender());

  // React instantly if the user changes the shortcut count in the popup
  // while YouTube is already open — no refetch needed, just re-slice.
  document.addEventListener("wlh-settings-changed", () => {
    renderShortcuts(cachedPlaylists);
  });

  // The sidebar can (re)build itself asynchronously, e.g. right after
  // login or on the very first paint. Watch for the "Playlists" row
  // showing up and make sure our shortcuts are attached underneath it.
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
