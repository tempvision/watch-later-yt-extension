(function () {
  const ITEM_CLASS = "wlh-watch-later-item";
  const TITLE_SELECTOR =
    "yt-list-view-model yt-list-item-view-model .ytListItemViewModelTitle";
  const WATCH_LATER_LABELS = ["save to watch later", "remove from watch later"];

  function isWatchLaterLabel(text) {
    const label = text.replace(/\s+/g, " ").trim().toLowerCase();
    return WATCH_LATER_LABELS.includes(label);
  }

  function highlightWatchLaterItems() {
    const titles = document.querySelectorAll(TITLE_SELECTOR);
    for (const title of titles) {
      const item = title.closest("yt-list-item-view-model");
      if (item) {
        item.classList.toggle(ITEM_CLASS, isWatchLaterLabel(title.textContent));
      }
    }
  }

  let timer = null;
  function scheduleHighlight() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      highlightWatchLaterItems();
    }, 100);
  }

  new MutationObserver(scheduleHighlight).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  highlightWatchLaterItems();
})();
