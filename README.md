# FlowDesk 🗂️

> A sleek, all-in-one personal productivity dashboard — built with pure HTML, CSS & JavaScript. No frameworks, no dependencies, no server required.

![FlowDesk Banner](https://img.shields.io/badge/FlowDesk-Productivity%20Dashboard-6C63FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzZDNjNGRiIvPjxwYXRoIGQ9Ik04IDEwaDE0TTggMTZoMTJNOCAyMmgxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==)
![GitHub repo size](https://img.shields.io/github/repo-size/Hi-iamAT/myPro_organizer?color=6C63FF)
![License](https://img.shields.io/badge/license-MIT-a78bfa)

---

## 📸 Website Screenshots & Preview

Here is a tour of the FlowDesk dark & light productivity hub interface across all core widgets:

### 🖥️ Main Dashboard Overview
<p align="center">
  <img src="screenshots/dashboard_UI.png" alt="FlowDesk Main Dashboard" height="400px" style="border-radius: 8px;">
</p>

### 🛠️ Feature & Widget Showcase

<table width="100%">
  <tr>
    <td width="50%" align="center" valign="top">
      <h4>📝 To-Do Manager</h4>
      <img src="screenshots/todo_UI.png" alt="To-Do List Widget" width="100%">
    </td>
    <td width="50%" align="center" valign="top">
      <h4>📌 Quick Notes</h4>
      <img src="screenshots/quicknotes_UI.png" alt="Quick Notes Widget" width="100%">
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <h4>⏱️ Focus Timer</h4>
      <img src="screenshots/focustimer_UI.png" alt="Focus Timer Widget" width="100%">
    </td>
    <td width="50%" align="center" valign="top">
      <h4>🧮 Calculator</h4>
      <img src="screenshots/calculator_UI.png" alt="Calculator Widget" width="100%">
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <h4>⚖️ BMI Calculator</h4>
      <img src="screenshots/BMI_UI.png" alt="BMI Calculator Widget" width="100%">
    </td>
    <td width="50%" align="center" valign="top">
      <h4>🌤️ Weather Forecast</h4>
      <img src="screenshots/weather_UI.png" alt="Weather Widget" width="100%">
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <h4>⚖️ Live Calendar</h4>
      <img src="screenshots/calendar_UI.png" alt="Live Calendar Widget" width="100%">
    </td>
    <td width="50%" align="center" valign="top">
      <h4>🌤️ Daily Goals</h4>
      <img src="screenshots/dailygoals_UI.png" alt="Daily Goals Widget" width="100%">
    </td>
  </tr>
</table>

---

## ✨ Features

| Widget | Description |
|--------|-------------|
| **📝 To-Do List** | Add, complete, and delete tasks. Stats pills show total / done / remaining at a glance. |
| **📌 Quick Notes** | Multi-note rich-text editor. Bold, italic, bullet lists, custom text colour, per-note accent colour. |
| **🧮 Calculator** | Full expression evaluator with backspace, parentheses support, and keyboard input. |
| **⏱️ Focus Timer** | Pomodoro-style countdown (Work 25m / Break 5m / Long Break 15m) with animated SVG progress ring and daily session counter. |
| **⚖️ BMI Calculator** | Easily check body mass index with category indicators. |
| **🌤️ Weather Forecast** | Check live local weather updates. |
| **⚖️ Live Calendar** | Check live calendar in English/ Bengali/ Hijri and add events. |
| **🌤️ Daily Goals** | Add your daily goals and track your progress. |

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

No build step needed. Just open `index.html`:

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
myPro_organizer/
├── index.html              # Main HTML entry point
├── style.css               # Design system, tokens, layout & widget styles
├── favicon.svg             # Tab & app branding icon
├── screenshots/
│   └── dashboard_preview.png # Application UI screenshot
└── README.md               # Project documentation
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

## ♿ Accessibility & Polish

- Dark theme is the default (an explicit Light choice is remembered) and applied before first paint — no white flash.
- Visible keyboard focus rings on all controls; brand logo is keyboard-activatable.
- Respects `prefers-reduced-motion`.
- Compact icon-only navbar actions on phones so nothing overflows.

## 🛠️ Tech Stack

- **HTML5** — semantic markup
- **CSS3** — grid layout, custom properties, transitions, SVG animations
- **Vanilla JavaScript** — no external runtime dependencies
- **LocalStorage** — client-side data persistence

---

## 📄 License

MIT © [Hi-iamAT](https://github.com/Hi-iamAT)
