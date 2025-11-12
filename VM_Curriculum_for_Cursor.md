# 🎬 Build a Virtual Machine in JavaScript — Complete YouTube Curriculum
### Prompt for Cursor.ai (HTML + CSS + JavaScript VM Series)

## 🎯 Project Goal
Create a **browser-based virtual machine** entirely in **HTML, CSS, and JavaScript**, presented as a narrated **YouTube tutorial series**.

Each **episode = Git commit**.
Each **season = YouTube playlist**.
Each **chapter = one web page or module**.

---

## 📁 Repository Setup

**Project Name:** `vm-js-series`

**Structure:**
```
/public/index.html
/src/core/            # VM core (stack, memory, opcodes)
/src/compiler/        # Bytecode compiler + parser
/src/runtime/         # GC, JIT, scheduler
/src/ui/              # Web UI (HTML/CSS for demo + debugger)
/scripts/lessons/     # YouTube script markdowns
/docs/                # Generated documentation
```

Each episode must:
- Add new source files or extend existing ones.
- Contain a `lesson.md` file (the YouTube script).
- Commit message format:  
  `feat(lesson): <episode number> - <title>`

---

## 🧠 Instruction to Cursor
For each episode below:
1. Generate a **teaching script** suitable for a YouTube narration (casual, instructive tone).
2. Write the **code changes** (HTML/CSS/JS) that implement the episode concept.
3. Commit the code and script using the format above.
4. Render small demo UIs (HTML canvas, terminal, etc.) showing the feature.

---

## 🎓 Curriculum Overview

### Season 1 — Foundations (Episodes 1–26)
*(Based on [season 1](VM_Build_Series_Season1.md))*  
Covers: stack VM, compiler, GC, closures, records, and capstone JSON pretty printer.

### Season 2 — Concurrency & JIT (Episodes 27–50)
*(Based on [season 2](VM_Build_Series_Season2.md))*  
Covers: fibers, async I/O, typing, WebAssembly backend, FFI, debugger, and microservice simulation.

### Season 3 — Systems & Distribution (Episodes 51–60)
*(Based on [season 3](VM_Build_Series_Season3.md))*  
Covers: persistent heap, networking, distributed GC, module manager, monitoring, and multi-node cluster.

### Season 4 — Language Engineering (Episodes 61–70)
*(Based on [season 4](VM_Build_Series_Season4.md))*  
Covers: macros, Hindley–Milner types, IR optimizer, IDE integration, and statically typed compiler.

### Season 5 — Native & AI (Episodes 71–80)
*(Based on [season 5](VM_Build_Series_Season5.md))*  
Covers: LLVM backend, SIMD, adaptive JIT, AI-optimized bytecode, and self-hosting compiler.

---

## 🧩 Commit & Lesson Format

**Example Episode:**
```
Commit: feat(lesson): 01 - Introduction & Tiny VM

Files:
- src/core/vm.js
- scripts/lessons/01_introduction_tiny_vm.md

Lesson Script Outline:
1. Intro narration — “Welcome to the VM series...”
2. Explain the concept of virtual machines.
3. Show stack operations (`PUSH`, `ADD`, `PRINT`).
4. Demo in browser terminal.
5. Conclude with what’s next.

Deliverables:
✅ Code implementation
✅ Markdown YouTube script
✅ HTML demo
✅ Git commit
```

---

## 🎬 Output Requirements

- All commits should be **chronologically ordered** from Episode 1 → 80.
- Each lesson markdown must include:
  - `# Episode X — Title`
  - Overview
  - Code walkthrough
  - Explanation (YouTube-friendly narration)
  - Demo notes (visual shown on screen)
  - Summary & teaser for next episode
- The final repository should run locally with:
  ```bash
  npm install
  npm run dev
  ```
  (or just `index.html` for browser-only mode).

---

## 📚 Reference Material (Attached)
Use these markdowns as canonical sources for episode structure and descriptions:
- `VM_Build_Series_Season1.md`
- `VM_Build_Series_Season2.md`
- `VM_Build_Series_Season3.md`
- `VM_Build_Series_Season4.md`
- `VM_Build_Series_Season5.md`

Each corresponds directly to chapters (lessons) Cursor should turn into commits and scripts.

---

## 💡 Bonus Automation
Cursor should:
- Auto-generate Git commit after each lesson.
- Auto-generate `README.md` with playlist links once Season 1 completes.
- Optionally add timeline JSON (`timeline.json`) for syncing with YouTube chapter markers.

---

## 🏁 Final Goal
A complete **interactive educational repo**:
- Teaches Virtual Machine design from scratch.
- Runs fully in the browser.
- Narration-ready for YouTube production.
- Chronologically versioned via Git commits.

---

> “Every commit is a story. Every episode builds a machine.”
