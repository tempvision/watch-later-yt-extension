(function () {
  const ITEM_CLASS = "wlh-watch-later-item";
  const SAVE_BUTTON_CLASS = "wlh-card-watch-later";
  const REMOVE_BUTTON_CLASS = "wlh-card-remove-watch-later";
  const ACTION_BUTTON_SELECTOR =
    `.${SAVE_BUTTON_CLASS}, .${REMOVE_BUTTON_CLASS}`;
  const TITLE_SELECTOR =
    "yt-list-view-model yt-list-item-view-model .ytListItemViewModelTitle, ytd-menu-service-item-renderer yt-formatted-string";
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
  let activeActionButton = null;

  function getWatchLaterAction(text) {
    const label = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (label === "save to watch later") return "save";
    if (label === "remove from watch later") return "remove";
    return null;
  }

  function highlightWatchLaterItems() {
    const titles = document.querySelectorAll(TITLE_SELECTOR);
    for (const title of titles) {
      const item = title.closest(
        "yt-list-item-view-model, ytd-menu-service-item-renderer"
      );
      if (item) {
        const action = getWatchLaterAction(title.textContent);
        item.classList.toggle(ITEM_CLASS, Boolean(action));
        if (action) item.dataset.wlhWatchLaterAction = action;
        else delete item.dataset.wlhWatchLaterAction;
      }
    }
  }

  function createCardButton(action) {
    const button = document.createElement("button");
    button.type = "button";
    const isRemoveAction = action === "remove";
    button.className = isRemoveAction
      ? REMOVE_BUTTON_CLASS
      : SAVE_BUTTON_CLASS;
    button.title = isRemoveAction
      ? "Remove from Watch later"
      : "Save to Watch later";
    button.setAttribute("aria-label", button.title);

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svgNamespace, "path");
    if (isRemoveAction) {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("d", "M6 6l12 12M18 6 6 18");
    } else {
      path.setAttribute("fill", "currentColor");
      path.setAttribute(
        "d",
        "M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 2a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 3a1 1 0 0 0-1 1v5.57l.49.29 3.33 2a1 1 0 1 0 1.03-1.72L13 11.44V7a1 1 0 0 0-1-1Z"
      );
    }
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }

  function handleCardButtonEvent(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(ACTION_BUTTON_SELECTOR);
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type !== "click") return;
    const card = button.closest(CARD_SELECTOR);
    if (!card) return;

    const action = button.classList.contains(REMOVE_BUTTON_CLASS)
      ? "remove"
      : "save";
    runWatchLaterAction(card, button, action);
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
    return window.location.pathname.startsWith("/playables");
  }

  function isWatchLaterPage() {
    return (
      window.location.pathname === "/playlist" &&
      new URLSearchParams(window.location.search).get("list") === "WL"
    );
  }

  function clearCardButton(card) {
    card.querySelectorAll(ACTION_BUTTON_SELECTOR).forEach((button) => button.remove());
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
    card.querySelectorAll(ACTION_BUTTON_SELECTOR).forEach((button) => {
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

    const action = isWatchLaterPage() ? "remove" : "save";
    const buttonClass = action === "remove"
      ? REMOVE_BUTTON_CLASS
      : SAVE_BUTTON_CLASS;

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
      host.querySelectorAll(ACTION_BUTTON_SELECTOR).forEach((button) => {
        if (!button.classList.contains(buttonClass)) button.remove();
      });
      host.classList.add("wlh-card-actions");
      if (title && !title.classList.contains("wlh-card-title-reserved")) {
        const titleRect = title.getBoundingClientRect();
        const actionsRect = host.getBoundingClientRect();
        if (titleRect.right > actionsRect.left) {
          title.classList.add("wlh-card-title-reserved");
        }
      }
      if (!host.querySelector(`:scope > .${buttonClass}`)) {
        host.insertBefore(createCardButton(action), menuControl);
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

  function findVisibleMenuAction(expectedAction) {
    highlightWatchLaterItems();
    const items = document.querySelectorAll(`.${ITEM_CLASS}`);
    for (const item of items) {
      if (item.getClientRects().length > 0) {
        const target = item.querySelector(
          "button[role='menuitem'], a[role='menuitem'], [role='menuitem'], tp-yt-paper-item"
        );
        if (target && item.dataset.wlhWatchLaterAction === expectedAction) {
          return target;
        }
      }
    }
    return null;
  }

  function waitForMenuAction(expectedAction, timeout = 1500) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const result = findVisibleMenuAction(expectedAction);
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

  async function runWatchLaterAction(card, button, expectedAction) {
    if (activeActionButton || button.getAttribute("aria-busy") === "true") return;

    activeActionButton = button;
    button.setAttribute("aria-busy", "true");
    let menuHidden = false;
    try {
      const nativeAction = findNativeWatchLaterAction(card);
      if (nativeAction?.action === expectedAction) {
        nativeAction.control.click();
        if (expectedAction === "save") markSaved(button);
        return;
      }

      const menuButton = findCardMenuButton(card);
      if (!menuButton) return;

      document.documentElement.classList.add("wlh-running-watch-later-action");
      menuHidden = true;
      menuButton.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const menuAction = await waitForMenuAction(expectedAction);
      if (!menuAction) {
        menuButton.click();
        return;
      }

      menuAction.click();
      if (expectedAction === "save") markSaved(button);
    } finally {
      if (menuHidden) {
        document.documentElement.classList.remove("wlh-running-watch-later-action");
      }
      activeActionButton = null;
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
