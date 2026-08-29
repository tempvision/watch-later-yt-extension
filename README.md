# Watch Later Highlighter

> **Chrome Web Store** — [Install the extension](https://chromewebstore.google.com/detail/cmlmlkmlhhlhjkbdddjneejpamnacdhm?utm_source=item-share-cb)

A lightweight Chrome/Edge extension that highlights the **Watch later** entry in YouTube's left sidebar and adds quick-access shortcuts to your most recently updated playlists.

## Features

- Highlights the "Watch later" sidebar entry with a customizable border color.
- Adds shortcuts to your most recently updated playlists, right under the "Playlists" sidebar entry (up to 20).
- Changes apply instantly on an already-open YouTube tab — no reload needed.
- Works in light and dark themes, and in any YouTube locale (it matches language-neutral URLs, not translated labels).

## Installation (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (toggle in the top-right).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open YouTube — the Watch later entry is highlighted and your playlists appear in the sidebar.

## Usage

Click the extension icon to open the settings popup:

- **Watch later border color** — pick any color; it applies instantly on YouTube.
- **Playlist shortcuts to show** — set `0` to hide the shortcuts, up to `20`.
- **Reset to defaults** — restores the default orange highlight and 5 shortcuts.

## Configuration

| Setting | Default | Range |
| --- | --- | --- |
| `borderColor` | `#ff9800` | any hex color |
| `maxPlaylists` | `5` | 0–20 |

Settings are stored with `chrome.storage.sync`, so they sync across your Chrome profile.

## Permissions

Only `storage`. The extension reads your playlists from the public `/feed/playlists` page on the same origin (youtube.com → youtube.com) — no extra host permissions and no private API endpoints.

## Project structure

```
manifest.json           MV3 manifest
constants.js            Shared defaults (borderColor, maxPlaylists)
settings.js             Content script: loads/applies settings
playlist-shortcuts.js   Content script: fetches & renders playlist shortcuts
content.css             Sidebar highlight + shortcut styles
popup.html / .css / .js Settings popup
icons/                  Extension icons
```
