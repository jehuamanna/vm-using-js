# vm-js-series

This repository is an educational series: **Build a Virtual Machine in JavaScript**.
It is structured so each episode is committed individually (one commit per lesson).

## 🚀 Quick Start

### Browser-only (no server needed):
1. Open `public/index.html` in your browser.
2. Click the demo buttons to see the VM in action!

### With local server:
```bash
npm install
npm run dev
# Then open http://localhost:8000/public/index.html
```

## 📚 Episodes

### Season 1 — Foundations (Episodes 1–26)
- ✅ **Episode 1**: Introduction & Tiny VM — Basic stack-based VM with PUSH, ADD, SUB, MUL, PRINT
- ✅ **Episode 2**: Branching and Loops — Control flow with JMP, JMP_IF_ZERO, JMP_IF_NEG

[More episodes coming soon...]

## 📁 Project Structure

```
/public/              # Demo HTML pages
/src/
  /core/              # VM core (stack, memory, opcodes)
  /compiler/          # Bytecode compiler + parser
  /runtime/           # GC, JIT, scheduler
  /ui/                # Web UI components
/scripts/lessons/     # YouTube lesson scripts
/docs/                # Generated documentation
```

## 📖 Lesson Scripts

Each episode includes a detailed lesson script in `scripts/lessons/` suitable for YouTube narration.

## 🎯 Learning Path

1. **Season 1**: Stack VM, compiler, GC, closures, records
2. **Season 2**: Concurrency, JIT, typing, WebAssembly, FFI
3. **Season 3**: Distribution, networking, persistent heap
4. **Season 4**: Language engineering, type systems, IDE integration
5. **Season 5**: Native codegen, SIMD, AI optimization, self-hosting

## 📝 Files

- `VM_Curriculum_for_Cursor.md` — Complete curriculum overview
- `cursor.json` — Task instruction file for Cursor.ai
- `timeline.json` — Episode timeline and metadata
- `VM_Build_Series_Season*.md` — Detailed episode descriptions per season
