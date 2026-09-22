# Watch Later Highlighter

> **Chrome Web Store** — [Install the extension](https://chromewebstore.google.com/detail/cmlmlkmlhhlhjkbdddjneejpamnacdhm?utm_source=item-share-cb)

A lightweight Chrome/Edge extension that highlights **Watch later** across YouTube — in the left sidebar and in video menus — and adds quick-access shortcuts to your most recently updated playlists.

## Features

- Highlights the "Watch later" sidebar entry with a customizable border color.
- Highlights the "Save to Watch later" and "Remove from Watch later" menu options where YouTube provides them.
- Adds one-click Watch later actions beside supported videos' three-dot menus: save on normal pages and remove on the Watch Later playlist. Shorts and Playables are excluded.
- Adds shortcuts to your most recently updated playlists, right under the "Playlists" sidebar entry (up to 20).
- Changes apply instantly on an already-open YouTube tab — no reload needed.
- Works in light and dark themes. Sidebar highlighting uses language-neutral URLs.

## Installation (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (toggle in the top-right).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open YouTube — the Watch later entry is highlighted and your playlists appear in the sidebar.

## Usage

Click the extension icon to open the settings popup:

- **Watch later border color** — pick any color; it applies instantly on YouTube.
- **Playlist shortcuts** — search and choose the playlists shown in your sidebar.
- **Video action** — show or hide one-click save/remove actions beside video menus.
- **Reset to defaults** — restores the default orange highlight, 5 shortcuts, and video action.

## Configuration

| Setting | Default | Range |
| --- | --- | --- |
| `borderColor` | `#ff9800` | any hex color |
| `selectedPlaylistIds` | first 5 playlists after migration | selected playlist IDs |
| `showCardButton` | `true` | on/off |

Settings are stored with `chrome.storage.sync`, so they sync across your Chrome profile.

Existing installations migrate their old playlist count automatically by selecting the same first playlists they previously displayed. The picker uses the playlists available in YouTube's initial `/feed/playlists` response; very large libraries may not expose every playlist until YouTube loads more results.

## Permissions

Only `storage`. The extension reads your playlists from the public `/feed/playlists` page on the same origin (youtube.com → youtube.com) — no extra host permissions and no private API endpoints.

## Maintenance note

YouTube does not provide a public API for modifying its interface, so the extension relies on YouTube's internal HTML structure. If YouTube renames or reorganizes its video-card, sidebar, or menu elements, the selectors in `content.css`, `playlist-shortcuts.js`, and `menu-highlight.js` may need updating.

Menu actions are currently identified by the English labels "Save to Watch later" and "Remove from Watch later." These features may not work when YouTube is displayed in another language. The sidebar highlight is more resilient because it uses the language-neutral `list=WL` URL.

## Project structure

```
manifest.json           MV3 manifest
constants.js            Shared settings defaults
settings.js             Content script: loads/applies settings
playlist-shortcuts.js   Content script: fetches & renders playlist shortcuts
content.css             Sidebar, menu and video action styles
menu-highlight.js       Content script: menu highlighting + video actions
popup.html / .css / .js Settings popup
icons/                  Extension icons
```
