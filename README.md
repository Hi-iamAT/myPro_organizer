# FlowDesk 🗂️

> A sleek, all-in-one personal productivity dashboard — built with pure HTML, CSS & JavaScript. No frameworks, no dependencies, no server required.

![FlowDesk Banner](https://img.shields.io/badge/FlowDesk-Productivity%20Dashboard-6C63FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzZDNjNGRiIvPjxwYXRoIGQ9Ik04IDEwaDE0TTggMTZoMTJNOCAyMmgxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==)
![GitHub repo size](https://img.shields.io/github/repo-size/Hi-iamAT/myPro_organizer?color=6C63FF)
![License](https://img.shields.io/badge/license-MIT-a78bfa)

---

## ✨ Features

| Widget | Description |
|--------|-------------|
| **📝 To-Do List** | Add, complete, and delete tasks. Stats pills show total / done / remaining at a glance. |
| **📌 Quick Notes** | Multi-note rich-text editor. Bold, italic, bullet lists, custom text colour, per-note accent colour. |
| **🧮 Calculator** | Full expression evaluator with backspace, parentheses support, and keyboard input. |
| **⏱️ Focus Timer** | Pomodoro-style countdown (Work 25m / Break 5m / Long Break 15m) with animated SVG progress ring and daily session counter. |

### Extras
- 🌙 / ☀️ **Dark / Light mode** — persisted across sessions
- 🕐 **Live clock** in the navbar
- 📥 **JSON export** of all your todos and notes
- 🍞 **Toast notifications** — no more intrusive `alert()` popups
- ⌨️ **Keyboard support** for the calculator (digits, operators, Enter, Backspace, Escape)
- 💾 **LocalStorage persistence** — everything saves automatically in the browser
- 📱 **Responsive** — single-column stack on small screens

---

## 🚀 Getting Started

No build step needed. Just open the file:

```bash
# Clone the repo
git clone https://github.com/Hi-iamAT/myPro_organizer.git
cd myPro_organizer

# Open directly in your browser
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or serve it locally (optional, for font/network features):

```bash
python3 -m http.server 5500
# Then open http://localhost:5500
```

---

## 🗂️ Project Structure

```
flowdesk/
├── index.html      # App structure + all JavaScript logic
├── style.css       # Design system, tokens, layout, animations
├── favicon.svg     # Browser tab icon
└── README.md       # You are here
```

---

## 🎨 Design System

FlowDesk uses a **CSS custom property** design token system for effortless theming:

| Token | Light | Dark |
|-------|-------|------|
| `--brand` | `#6C63FF` | `#6C63FF` |
| `--bg` | `#f0f2f8` | `#0f0f1a` |
| `--surface` | `#ffffff` | `#1a1a2e` |
| `--txt` | `#1e1e2e` | `#e4e4f0` |

Fonts: **Inter** (UI) + **JetBrains Mono** (clock, calculator display, timer) via Google Fonts.

---

## 🛠️ Tech Stack

- **HTML5** — semantic markup
- **CSS3** — grid layout, custom properties, transitions, SVG animations
- **Vanilla JavaScript** — no libraries or frameworks
- **LocalStorage** — client-side data persistence

---

## 📸 Screenshots

> Open `index.html` in your browser to see the live dashboard.

---

## 📄 License

MIT © [Hi-iamAT](https://github.com/Hi-iamAT)

---

<p align="center">Made with ❤️ and vanilla code</p>
