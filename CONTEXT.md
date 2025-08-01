# 🧠 DesignStorm Project Context

## 🔥 Vision

DesignStorm is a devtool platform that converts Figma designs into **pixel-perfect**, **responsive**, and **production-grade** Next.js code using **AI**.

### 🏁 Goal

- Replicate exact Figma designs (1:1)
- Make responsive via AI-powered layout refactoring
- Output clean, scalable Next.js (TypeScript + Tailwind + shadcn/ui)
- Enable full IDE experience in browser: code, prompt, terminal

---

## 🎯 Key Features

1. **Figma JSON Parser**
   - Uses `absoluteBoundingBox` to extract positioning
   - Supports raw Figma JSON/API response
   - Renders React components with exact layout

2. **Initial Rendering Layer**
   - Applies absolute positioning with Tailwind (`absolute`, `top`, `left`, `w`, `h`)
   - Matches Figma dimensions exactly in browser

3. **Smart Scaling for Responsiveness**
   - Calculates scaleX / scaleY ratios based on screen width vs design width
   - Resizes elements proportionally using Tailwind classes
   - Maintains visual fidelity on all breakpoints

4. **AI Layout Refactor (via GPT-4o / Claude)**
   - Analyzes component tree
   - Rewrites layout using `flex` and `grid`
   - Applies `shadcn/ui` for common patterns (buttons, inputs, cards)

5. **Project Output**
   - Generates full Next.js app:
     - `/app` pages
     - `/components`
     - Tailwind setup
     - TypeScript
     - shadcn pre-installed
   - Download as ZIP or GitHub export

6. **IDE in Browser**
   - Monaco editor
   - AI prompt editing (e.g. “make mobile-friendly”)
   - Terminal for running scripts
   - Visual diff feedback (future)

---

## 🧩 Technology Stack

| Layer      | Tech Stack                                         |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 14, App Router, TypeScript, Tailwind CSS   |
| Components | shadcn/ui                                          |
| AI Layer   | GPT-4o, Claude 3.5 Opus                            |
| Editor     | Monaco                                             |
| Hosting    | Vercel, Railway                                    |
| Auth       | Clerk or Supabase                                  |

---

## 🤝 Philosophy

- **Step-by-step** transformation: from exact layout → responsive layout → maintainable code
- Prioritize **visual fidelity first**
- Let AI do **intelligent restructuring**, not approximate guessing
- Output must be **developer-usable**, not throwaway HTML

---

## 📌 Summary

> "DesignStorm doesn’t just convert Figma to code. It replicates your design pixel-for-pixel, then makes it production-grade with AI."
