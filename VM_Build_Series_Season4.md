# Build a Virtual Machine in JavaScript — Season 4
### Language Engineering & Tooling
> Theme: *Ecosystem, Compilers, and Static Analysis*

---

## Episode Index

### 61. Macro System & Hygienic Expansion
- Token-level macros with hygiene.
- AST manipulation and expansion phase.
- Compile macros to bytecode safely.

### 62. Pattern Matching & Algebraic Data Types
- Add `match` expression and variant constructors.
- Compile to jump tables and tag-based dispatch.

### 63. Type System & Inference (Hindley–Milner)
- Constraint-based type inference.
- Type generalization for polymorphic functions.
- Type errors with readable messages.

### 64. Type-Directed Code Generation
- Insert runtime checks only when necessary.
- Monomorphize specialized functions.

### 65. Intermediate Representation (IR) Optimizer
- Convert AST → SSA-like IR.
- Implement constant folding, copy propagation, inlining.

### 66. Cross-Language Interop (JS ↔ VM)
- Expose JS host functions to VM.
- Import JS modules as `.ffi` bindings.
- Safe value marshalling between worlds.

### 67. Static Analysis Tools
- Linter: unused vars, unreachable code.
- Flow-sensitive analysis for side effects.
- Bytecode analyzer with warnings.

### 68. IDE Integration
- Language Server Protocol (LSP) support.
- Autocomplete, hover docs, diagnostics.
- Live debugger integration.

### 69. Performance Analyzer & Coverage Tools
- Bytecode instrumentation for profiling.
- Collect branch coverage and call frequency data.
- Visualize hotspots in the IDE.

### 70. Capstone IV — MiniRust / MiniTypeScript Compiler
- Design a statically typed subset of your language.
- Compile it to VM bytecode with type inference and IR optimization.
- Demonstrate end-to-end static compilation.

---

## Learning Outcomes
- Implement a macro and type system.
- Build developer tooling (LSP, linter, profiler).
- Write your own compiler front-end targeting the VM.

---

## Recommended Stop Point
After Season 4, your VM becomes a full **language ecosystem**, complete with IDE, type checker, and static compiler.
