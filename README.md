<div align="center">

# Open businessideasdb

### A self-hosted viewer for validated business ideas, fetched live and rendered with a clean, pixel-faithful UI.

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
</p>

</div>

---

## Overview

> This project is for educational purposes only.

A lightweight **Express** server that fetches business ideas live from `businessideasdb.com`, parses the Next.js **RSC** payload server-side, and exposes a clean JSON API consumed by two static pages — a **list view** and an **idea detail view**.

## Features

- **List page** — paginated grid of all 73 ideas with category, signal, competitors, tags, volume, growth & a trend chart
- **Detail page** — full report: scores, brief, source signals, keyword data, competition, build path, proven earners & FAQ
- **Live data** — fetched on demand; no static snapshots
- **Faithful UI** — matches the original card & layout design

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Backend  | Node.js + Express       |
| Frontend | Vanilla HTML / CSS / JS |
| Data     | Next.js RSC parsing     |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# → http://localhost:3000
```

> [!NOTE]
> Update `SESSION_COOKIE` in `server.js` with a fresh session token from your browser if data stops loading.

## API Reference

| Method | Endpoint            | Description                          |
| ------ | ------------------- | ------------------------------------ |
| `GET`  | `/api/ideas?page=N` | Paginated list of ideas (12 per page) |
| `GET`  | `/api/idea/:slug`   | Full detail for a single idea        |

## Project Structure

```
businessideas-viewer/
├── server.js        # Express server + RSC parser
├── index.html       # List page
├── detail.html      # Idea detail page
└── package.json
```

## License

This project is licensed under the [MIT License](LICENSE).

<div align="center">

---

<sub>Built with Node.js</sub>

</div>
