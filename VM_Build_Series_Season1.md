# Build a Virtual Machine in JavaScript — Season 1

## Overview
This season takes you from “What’s a VM?” to a complete mini programming language running on your own stack-based virtual machine in JavaScript.

Each episode builds on the previous, culminating in a capstone project that demonstrates real programs running inside your VM.

---

## Episode Index

### 1. Introduction & Tiny VM
- What’s a Virtual Machine?
- History (IBM mainframes → JVM → Docker → WASM)
- Implement a toy stack-based VM: `PUSH`, `ADD`, `PRINT`.
- Extend with `SUB` and `MUL`.

### 2. Branching and Loops
- Add `JMP`, `JMP_IF_ZERO`, `JMP_IF_NEG`.
- Build conditionals and loops from control flow.
- Example: factorial using loop and countdown.

### 3. Memory & Variables
- Add simulated memory (array).
- `LOAD`, `STORE` instructions.
- Demonstrate variable assignment and reuse.

### 4. Input and Output
- Add `READ` instruction (interactive input).
- Build a small calculator using `READ` and `PRINT`.

### 5. Functions & Call Stack
- Implement `CALL` and `RET`.
- Stack frames, parameters, and recursion.
- Example: recursive Fibonacci.

### 6. Error Handling & Debugging
- Handle stack underflow, overflow, invalid opcodes.
- Add a “debug mode” to trace execution.

### 7. Bytecode Compiler
- Simple assembler: human-readable → bytecode array.
- Compile and run short programs automatically.

### 8. Optimizations & JIT Basics
- Compare interpreter styles: dispatch tables, direct threading.
- Concept of JIT compilation in modern VMs.

### 9. Real-World Virtual Machines
- JVM, CLR, WebAssembly, CHIP-8 case studies.
- How each differs in bytecode model and runtime guarantees.

### 10. Bytecode Disassembler & Pretty Printer
- Convert bytecode back to mnemonics.
- Add macros (`INC`, `DEC`, etc.) for convenience.

### 11. Complete Mini Language (Compiler)
- Lexer → Parser → Bytecode Generator pipeline.
- Supports `let`, arithmetic, `if/else`, `while`, I/O.

### 12. Functions in the Language
- High-level function syntax and calls.
- Frame-relative locals and arguments.
- Example: `fib(n)` implemented in language syntax.

### 13. Exceptions & Stack Traces
- New ops: `ENTER_TRY`, `LEAVE_TRY`, `THROW`.
- Proper stack unwinding and tracing on error.

### 14. Debugger Pro
- Step Into / Over / Out controls.
- Breakpoints and exception pausing.
- Watches panel for variables and memory.

### 15. Modules & Linking
- `import`, `export`, `from` syntax.
- Linker merges modules and resolves symbols.
- Example: `math.add(2,3)` from linked modules.

### 16. Arrays & Strings
- Linear heap memory with `MALLOC`, `LOAD8/32`, `STORE8/32`.
- Null-terminated strings.
- Example: dynamic string and array manipulation.

### 17. Mini Standard Library
- Modules: `std.math`, `std.array`, `std.str`, `std.io`.
- Builtins mapped to low-level VM ops.

### 18. Optimizations II
- Peephole optimizer, dead-code elimination, function inlining.
- Compare before/after bytecode and performance.

### 19. Packaging & Distribution
- `.tvm` bundle format (JSON-based, versioned).
- Export/import programs with metadata and symbol tables.

### 20. Bytecode Verifier
- Three-phase static checker: decode, CFG build, stack-depth analysis.
- Validates opcodes, immediates, and control flow before execution.

### 21. Garbage Collection — Mark & Sweep
- Implement conservative stop-the-world mark & sweep.
- Manage free list, detect unreachable objects.

### 22. Compacting GC
- Two algorithms:
  - **Slide compactor** (one-space)
  - **Cheney’s semi-space** (two-space)
- Eliminates fragmentation and reclaims memory efficiently.

### 23. Closures & First-Class Functions
- Heap-allocated boxes for captured variables.
- `MAKE_CLOSURE`, `CALLC`, `ENV_GET`, `ENV_SET`.
- Example: `makeAdder` and `makeCounter` closures.

### 24. Higher-Order Standard Library
- `map`, `filter`, `reduce`, `forEach` built using closures.
- Partial application (`_` placeholder syntax).

### 25. Records / Objects
- Static layout structs with named fields.
- Field access compiled to offset math (`base + offset`).
- “Methods” as functions with `self` parameter.

### 26. Capstone Project — JSON Pretty Printer
- Parse simplified JSON.
- Represent objects as records and arrays.
- Recursively print formatted output.
- Package and run as a `.tvm` bundle.

---

## Learning Outcomes
By the end of Season 1, you can:
- Design and implement a working stack-based VM.
- Build a compiler and high-level language targeting your VM.
- Understand garbage collection, closures, and records.
- Write and package programs in your own language.
- Draw parallels with JVM, CLR, and WebAssembly.

---

## Recommended Stop Point
Season 1 naturally concludes at Episode 26 (Capstone). Beyond this, you can branch into advanced arcs:
- **Concurrency & async VM**
- **Type system & inference**
- **Performance & JIT backend**
- **Runtime tools & profiler**

---

## Author Notes
This Season 1 course structure is ideal for teaching or self-learning virtual machines and language design, with JavaScript as a clear, accessible implementation language.
