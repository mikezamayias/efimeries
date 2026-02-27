# Efimeries

A specialized, mobile-first Progressive Web App (PWA) designed for Greek public hospitals. It features a custom algorithmic scheduling engine that automatically resolves complex constraints to generate fair, rule-compliant on-call shift schedules.

Live App: [https://efimeries.pages.dev](https://efimeries.pages.dev)

## ✨ Features

- **Automated Scheduling Engine:** Custom Constraint Satisfaction Problem (CSP) solver using backtracking, AC-3 propagation, and MRV heuristics to automatically distribute shifts while respecting hard and soft medical rules.
- **Fairness Algorithms:** Algorithmic balancing for weekends, holidays, specific shift types (24-hour vs morning), and requested days off.
- **Native-like Mobile Experience:** Smooth drag-and-drop interactions, haptic feedback, bottom sheets, and swipe panels tailored for doctors using their phones on the ward.
- **Advanced State Management:** Robust undo/redo history system for tracking and reverting complex scheduling changes.
- **Serverless Sharing:** Compresses entire schedule states (`lz-string`) directly into URLs and QR codes for instant sharing without needing a backend database.
- **Client-Side Exports:** Generate PDFs (`jspdf`) and Excel spreadsheets (`xlsx-js-style`) entirely in the browser.
- **Progressive Web App (PWA):** Installable on iOS/Android home screens with full offline capability.
- **Battle-Tested:** Comprehensive CI testing pipeline ensuring medical-grade reliability and inclusivity:
  - Unit testing with **Vitest**
  - End-to-End testing with **Playwright**
  - Accessibility (a11y) auditing with **Axe-core**

## 🛠️ Tech Stack

- **Framework:** Nuxt 4, Vue 3 (Composition API)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Radix Vue (Headless UI), Class Variance Authority (CVA)
- **Testing:** Vitest, Playwright, @axe-core/playwright
- **Deployment:** Vercel / Cloudflare Pages (Serverless-ready)

## 🚀 Quick Start

Make sure to install dependencies using your preferred package manager:

```bash
bun install
```

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

Run the test suites:

```bash
bun run test         # Unit tests
bun run test:e2e     # End-to-End tests
```

## 📄 License & Commercial Use

This project is **Dual-Licensed**.

**1. Open Source (AGPLv3)**
The source code in this repository is available under the [GNU AGPLv3 License](LICENSE). This means you can freely use, modify, and distribute this software for personal or open-source projects, provided that you give appropriate credit and open-source your entire derivative work under the exact same AGPLv3 terms. 

**2. Commercial / Proprietary Use**
If you wish to use this software in a commercial product, closed-source project, or internal business system without being forced to open-source your own proprietary code (as required by the AGPLv3), you must obtain a separate Commercial License. 

To request a commercial license or discuss custom usage permissions, please contact: **contact@mikezamayias.com**
