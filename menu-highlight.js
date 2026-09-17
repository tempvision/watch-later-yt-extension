(function () {
  const ITEM_CLASS = "wlh-watch-later-item";
  const BUTTON_CLASS = "wlh-card-watch-later";
  const TITLE_SELECTOR =
    "yt-list-view-model yt-list-item-view-model .ytListItemViewModelTitle";
  const CARD_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-rich-grid-media",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-compact-video-renderer",
    "yt-lockup-view-model",
  ].join(", ");
  const MENU_BUTTON_SELECTOR =
    "button[aria-label='Action menu'], button[aria-label='More actions'], ytd-menu-renderer yt-icon-button.dropdown-trigger > button";
  const CARD_TITLE_SELECTOR =
    "h3, #video-title, #video-title-link, .yt-lockup-metadata-view-model__title, .yt-lockup-metadata-view-model-wiz__title";
  const VIDEO_LINK_SELECTOR =
    'a[href^="/watch?"], a[href*="youtube.com/watch?"]';
  let activeSaveButton = null;

  function getWatchLaterAction(text) {
    const label = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (label === "save to watch later") return "save";
    if (label === "remove from watch later") return "remove";
    return null;
  }

  function highlightWatchLaterItems() {
    const titles = document.querySelectorAll(TITLE_SELECTOR);
    for (const title of titles) {
      const item = title.closest("yt-list-item-view-model");
      if (item) {
        const action = getWatchLaterAction(title.textContent);
        item.classList.toggle(ITEM_CLASS, Boolean(action));
        if (action) item.dataset.wlhWatchLaterAction = action;
        else delete item.dataset.wlhWatchLaterAction;
      }
    }
  }

  function createCardButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.title = "Save to Watch later";
    button.setAttribute("aria-label", "Save to Watch later");

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute(
      "d",
      "M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 2a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 3a1 1 0 0 0-1 1v5.57l.49.29 3.33 2a1 1 0 1 0 1.03-1.72L13 11.44V7a1 1 0 0 0-1-1Z"
    );
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }

  function handleCardButtonEvent(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(`.${BUTTON_CLASS}`);
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type !== "click") return;
    const card = button.closest(CARD_SELECTOR);
    if (card) saveCardToWatchLater(card, button);
  }

  function findCardMenuButton(card) {
    return card.querySelector(MENU_BUTTON_SELECTOR);
  }

  function findCardTitle(card) {
    return card.querySelector(CARD_TITLE_SELECTOR);
  }

  function isSupportedVideoCard(card) {
    return Boolean(card.querySelector(VIDEO_LINK_SELECTOR));
  }

  function isUnsupportedPage() {
    const isWatchLaterPage =
      window.location.pathname === "/playlist" &&
      new URLSearchParams(window.location.search).get("list") === "WL";
    return isWatchLaterPage || window.location.pathname.startsWith("/playables");
  }

  function clearCardButton(card) {
    card.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.remove());
    card
      .querySelectorAll(".wlh-card-actions")
      .forEach((host) => host.classList.remove("wlh-card-actions"));
    card
      .querySelectorAll(".wlh-card-title-reserved")
      .forEach((title) => title.classList.remove("wlh-card-title-reserved"));
  }

  function clearAllCardButtons() {
    document.querySelectorAll(CARD_SELECTOR).forEach(clearCardButton);
  }

  function clearStaleCardState(card, host, title) {
    card.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
      if (button.parentElement !== host) button.remove();
    });
    card.querySelectorAll(".wlh-card-actions").forEach((actions) => {
      if (actions !== host) actions.classList.remove("wlh-card-actions");
    });
    card.querySelectorAll(".wlh-card-title-reserved").forEach((reservedTitle) => {
      if (reservedTitle !== title) {
        reservedTitle.classList.remove("wlh-card-title-reserved");
      }
    });
  }

  function syncCardButtons() {
    const enabled =
      window.WLH_SETTINGS?.showCardButton ?? WLH_DEFAULTS.showCardButton;

    if (!enabled || isUnsupportedPage()) {
      clearAllCardButtons();
      return;
    }

    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      if (!isSupportedVideoCard(card)) {
        clearCardButton(card);
        return;
      }

      const menuButton = findCardMenuButton(card);
      if (!menuButton || menuButton.closest(CARD_SELECTOR) !== card) return;

      const menuControl = menuButton.closest("yt-icon-button") || menuButton;
      const host = menuControl.parentElement;
      if (!host) return;

      const title = findCardTitle(card);
      clearStaleCardState(card, host, title);
      host.classList.add("wlh-card-actions");
      if (title && !title.classList.contains("wlh-card-title-reserved")) {
        const titleRect = title.getBoundingClientRect();
        const actionsRect = host.getBoundingClientRect();
        if (titleRect.right > actionsRect.left) {
          title.classList.add("wlh-card-title-reserved");
        }
      }
      if (!host.querySelector(`:scope > .${BUTTON_CLASS}`)) {
        host.insertBefore(createCardButton(), menuControl);
      }
    });
  }

  function findNativeWatchLaterAction(card) {
    const controls = card.querySelectorAll(
      "ytd-thumbnail-overlay-toggle-button-renderer button, ytd-thumbnail-overlay-toggle-button-renderer [role='button']"
    );
    for (const control of controls) {
      const label = control.getAttribute("aria-label") || control.title || "";
      const action = getWatchLaterAction(label);
      if (action) return { action, control };
    }
    return null;
  }

  function findVisibleMenuAction() {
    highlightWatchLaterItems();
    const items = document.querySelectorAll(`.${ITEM_CLASS}`);
    for (const item of items) {
      if (item.getClientRects().length > 0) {
        const target = item.querySelector("button[role='menuitem'], a[role='menuitem'], [role='menuitem']");
        if (target) return { action: item.dataset.wlhWatchLaterAction, target };
      }
    }
    return null;
  }

  function waitForMenuAction(timeout = 1500) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const result = findVisibleMenuAction();
        if (result || Date.now() - startedAt >= timeout) resolve(result);
        else setTimeout(check, 50);
      };
      check();
    });
  }

  function markSaved(button) {
    button.title = "Saved to Watch later";
    button.setAttribute("aria-label", "Saved to Watch later");
  }

  async function saveCardToWatchLater(card, button) {
    if (activeSaveButton || button.getAttribute("aria-busy") === "true") return;

    activeSaveButton = button;
    button.setAttribute("aria-busy", "true");
    let menuHidden = false;
    try {
      const nativeAction = findNativeWatchLaterAction(card);
      if (nativeAction) {
        if (nativeAction.action === "save") nativeAction.control.click();
        markSaved(button);
        return;
      }

      const menuButton = findCardMenuButton(card);
      if (!menuButton) return;

      document.documentElement.classList.add("wlh-saving-watch-later");
      menuHidden = true;
      menuButton.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const menuAction = await waitForMenuAction();
      if (!menuAction) {
        menuButton.click();
        return;
      }

      if (menuAction.action === "save") menuAction.target.click();
      else menuButton.click();
      markSaved(button);
    } finally {
      if (menuHidden) {
        document.documentElement.classList.remove("wlh-saving-watch-later");
      }
      activeSaveButton = null;
      button.removeAttribute("aria-busy");
    }
  }

  let timer = null;
  function scheduleHighlight() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      highlightWatchLaterItems();
      syncCardButtons();
    }, 100);
  }

  new MutationObserver(scheduleHighlight).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  highlightWatchLaterItems();
  syncCardButtons();

  for (const eventType of ["pointerdown", "mousedown", "mouseup", "dblclick", "click"]) {
    document.addEventListener(eventType, handleCardButtonEvent, true);
  }
  window.addEventListener("resize", () => {
    document
      .querySelectorAll(".wlh-card-title-reserved")
      .forEach((title) => title.classList.remove("wlh-card-title-reserved"));
    scheduleHighlight();
  });
  document.addEventListener("wlh-settings-changed", syncCardButtons);
})();
