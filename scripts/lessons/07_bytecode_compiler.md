# Episode 7: Bytecode Compiler

## Overview
In this episode, we're enhancing our assembler into a full-featured bytecode compiler. We'll add macro support, which allows us to write cleaner, more readable code. Macros are like shortcuts—they expand into multiple opcodes automatically. This makes programming much more convenient!

**Duration:** ~20-25 minutes  
**Learning Goals:**
- Understand what macros are and why they're useful
- Implement macro expansion in the assembler
- Learn common macro patterns (INC, DEC, NEG, etc.)
- See how macros make code more readable
- Understand the compilation process (source → expanded → bytecode)

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction

**On Screen:** Title card, Episode 6 recap, Episode 7 title

**Narration:**
"Hey everyone! Welcome to Episode 7. Last time, we added error handling and debugging tools. Today, we're taking our assembler to the next level by adding **macros**.

Right now, to increment a value, you have to write:
```
PUSH 1
ADD
```

That's two instructions for something so simple! Macros let us write just `INC` instead. The compiler automatically expands it into the full sequence.

We'll cover:
- What macros are and why they're useful
- Implementing macro expansion
- Common macros (INC, DEC, NEG, SWAP, etc.)
- How the compilation process works

Let's build a better compiler!"

---

### [02:00 - 07:00] What Are Macros?

**On Screen:** Code comparison showing with/without macros

**Narration:**
"Macros are **text substitutions** that happen during compilation. Think of them as shortcuts or abbreviations.

For example, instead of writing:
```
PUSH 1
ADD
```

We can write:
```
INC
```

The compiler sees `INC`, looks up its definition, and replaces it with the expanded code before assembling.

### Why Use Macros?

1. **Readability**: `INC` is clearer than `PUSH 1; ADD`
2. **Conciseness**: Fewer lines of code
3. **Consistency**: Everyone uses the same pattern
4. **Maintainability**: Change the macro definition once, affects all uses

### Common Macro Patterns

Let's look at some useful macros:

- **INC**: Increment (add 1) → `PUSH 1; ADD`
- **DEC**: Decrement (subtract 1) → `PUSH -1; ADD`
- **NEG**: Negate (multiply by -1) → `PUSH -1; MUL`
- **DUP**: Duplicate top of stack
- **SWAP**: Swap top two stack values
- **POP**: Pop and discard value

These are operations we do all the time, so having macros makes programming much easier!"

---

### [07:00 - 14:00] Implementing Macro Expansion

**On Screen:** Code walkthrough of macro expansion implementation

**Narration:**
"Let's implement macro expansion in our assembler. We'll add a macro system that expands macros before assembling.

### Macro Definition

First, we define our macros:

```typescript
export interface Macro {
  name: string
  description: string
  expand: (operands: string[]) => string[]
}

export const MACROS: Macro[] = [
  {
    name: 'INC',
    description: 'Increment value on stack (add 1)',
    expand: () => ['PUSH 1', 'ADD']
  },
  {
    name: 'DEC',
    description: 'Decrement value on stack (subtract 1)',
    expand: () => ['PUSH -1', 'ADD']
  },
  {
    name: 'NEG',
    description: 'Negate value on stack (multiply by -1)',
    expand: () => ['PUSH -1', 'MUL']
  },
  // ... more macros
]
```

Each macro has:
- **name**: The macro identifier (e.g., "INC")
- **description**: What it does
- **expand**: Function that returns the expanded opcodes

### Expansion Process

The expansion happens in two phases:

1. **Preprocessing**: Expand all macros
2. **Assembly**: Convert expanded code to bytecode

```typescript
function expandMacros(source: string): string {
  const lines = source.split('\n')
  const expanded: string[] = []
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    const name = parts[0].toUpperCase()
    
    if (MACRO_MAP.has(name)) {
      const macro = MACRO_MAP.get(name)!
      const expandedLines = macro.expand(parts.slice(1))
      expanded.push(`// Macro: ${line.trim()}`)
      expanded.push(...expandedLines)
    } else {
      expanded.push(line)
    }
  }
  
  return expanded.join('\n')
}
```

This function:
- Scans each line
- Checks if it's a macro
- If yes, expands it and adds a comment showing the original
- If no, keeps the line as-is

### Integration

We integrate macro expansion into our assemble function:

```typescript
export function assemble(source: string) {
  // Step 1: Expand macros
  const expanded = expandMacros(source)
  
  // Step 2: Assemble expanded code
  const { bytecode, errors } = assembleExpanded(expanded)
  
  return { bytecode, errors, expandedSource: expanded }
}
```

Now we can see both the original source and the expanded code!"

---

### [14:00 - 20:00] Demo: Using Macros

**On Screen:** Live demo showing macro expansion

**Narration:**
"Let's see macros in action! We'll write a simple program using macros and watch them expand.

### Example 1: Increment and Decrement

Original code:
```
PUSH 5
INC
PRINT
PUSH 10
DEC
PRINT
HALT
```

After macro expansion:
```
PUSH 5
// Macro: INC
PUSH 1
ADD
PRINT
PUSH 10
// Macro: DEC
PUSH -1
ADD
PRINT
HALT
```

See how `INC` expanded to `PUSH 1; ADD`? And `DEC` expanded to `PUSH -1; ADD`?

The compiler automatically:
1. Recognizes the macros
2. Expands them
3. Assembles the result
4. Runs the program

### Example 2: Negation

Original:
```
PUSH 42
NEG
PRINT
HALT
```

Expanded:
```
PUSH 42
// Macro: NEG
PUSH -1
MUL
PRINT
HALT
```

Much cleaner! The macro makes the intent clear: we're negating the value.

### Benefits

Notice how:
- The code is more readable
- We write less code
- The intent is clearer
- We can see the expansion if needed

This is exactly how real assemblers work—they have macros for common patterns!"

---

### [20:00 - 24:00] Macro Examples & Patterns

**On Screen:** Various macro examples

**Narration:**
"Let's look at more macro patterns and how they're useful.

### Common Macros

**INC/DEC**: Increment and decrement
- Used constantly in loops and counters
- Makes code much cleaner

**NEG**: Negate
- Common operation
- Clearer than `PUSH -1; MUL`

**SWAP**: Swap top two stack values
- Useful for reordering operands
- Expands to multiple STORE/LOAD operations

**POP**: Pop and discard
- Sometimes you just want to remove a value
- Expands to `STORE` to an unused memory address

### When to Use Macros

Use macros when:
- You repeat the same opcode sequence often
- The sequence has a clear semantic meaning
- You want to make code more readable

Don't use macros when:
- The sequence is only used once
- The macro would be confusing
- You need fine-grained control

### Real-World Parallels

Real assemblers have tons of macros:
- x86: `MOV`, `PUSH`, `POP` (these are actually instructions, but many are macros)
- ARM: Various convenience macros
- LLVM: Intrinsic functions that expand to multiple instructions

The principle is the same: make common patterns easier to write!"

---

### [24:00 - 26:00] Compilation Process Recap

**On Screen:** Diagram showing compilation pipeline

**Narration:**
"Let's recap the complete compilation process:

1. **Source Code**: Human-readable opcodes and macros
   ```
   PUSH 5
   INC
   PRINT
   ```

2. **Macro Expansion**: Expand all macros
   ```
   PUSH 5
   PUSH 1
   ADD
   PRINT
   ```

3. **Label Resolution**: Resolve all labels to addresses
   - First pass: collect labels
   - Second pass: replace label references with addresses

4. **Assembly**: Convert to bytecode
   ```
   [0x01, 5, 0x01, 1, 0x02, 0x05, 0x00]
   ```

5. **Execution**: Run on the VM

This is a simplified version of what real compilers do, but the principles are the same!"

---

### [26:00 - 27:00] What's Next?

**On Screen:** Preview of Episode 8

**Narration:**
"We've built a complete compiler with macro support! But there's still more to explore:
- **Optimizations**: Make programs run faster
- **JIT Compilation**: Just-In-Time compilation techniques
- **Better error messages**: More helpful compiler errors
- **More macros**: Add your own custom macros

In the next episode, we'll explore **optimizations and JIT basics**. We'll learn different interpreter styles and how modern VMs make programs run faster.

But for now, we have a fully functional compiler that can:
- ✅ Assemble opcodes
- ✅ Expand macros
- ✅ Resolve labels
- ✅ Generate bytecode
- ✅ Show expanded source

That's a complete compilation pipeline!"

---

### [27:00 - 28:00] Summary & Outro

**On Screen:** Final summary, subscribe reminder

**Narration:**
"Today we:
- ✅ Learned what macros are and why they're useful
- ✅ Implemented macro expansion in our assembler
- ✅ Added common macros (INC, DEC, NEG, SWAP, POP)
- ✅ Saw how macros make code more readable
- ✅ Understood the complete compilation process

Macros are a powerful tool that makes programming easier. They're used in every real assembler and compiler.

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. Try writing your own programs with macros. See you in the next episode!"

---

## Demo Notes

### Visual Elements

**Macro Expansion Demo:**
- Show original source code with macros
- Show expanded source code after macro expansion
- Highlight which lines were expanded
- Show the compilation process step-by-step

**Example Programs:**
- Simple increment/decrement example
- Negation example
- More complex examples using multiple macros

### Code Walkthrough

1. **Show macro definitions**
   - INC, DEC, NEG macros
   - How they expand
   - The expand function

2. **Demonstrate expansion process**
   - Original code
   - After expansion
   - How comments are preserved

3. **Walk through compilation**
   - Source → Expanded → Bytecode
   - Show each step visually

### Interactive Elements

- Let viewers write code with macros
- Show expanded source automatically
- Run programs and see results
- Step through execution in debug mode

### Teaching Tips

1. **Emphasize readability**
   - Macros make code clearer
   - Show before/after comparisons

2. **Explain the expansion process**
   - Macros are text substitutions
   - Happen before assembly
   - Can see expanded code

3. **Show real-world parallels**
   - Real assemblers use macros
   - Same principles apply
   - Common pattern in compilers

---

## Technical Details

### Macro Expansion Algorithm

```
1. Split source into lines
2. For each line:
   a. Check if it's a macro
   b. If yes, expand it
   c. If no, keep as-is
3. Return expanded source
```

### Compilation Pipeline

```
Source Code
  ↓
Macro Expansion
  ↓
Label Resolution
  ↓
Assembly
  ↓
Bytecode
  ↓
Execution
```

### Macro Examples

**INC**: `PUSH 1; ADD`
**DEC**: `PUSH -1; ADD`
**NEG**: `PUSH -1; MUL`
**SWAP**: Multiple STORE/LOAD operations
**POP**: `STORE 255` (discard to unused address)

---

## Episode Checklist

- [x] Add macro system to assembler
- [x] Implement macro expansion
- [x] Add common macros (INC, DEC, NEG, SWAP, POP)
- [x] Show expanded source in UI
- [x] Create example programs using macros
- [x] Write comprehensive lesson script
- [x] Test macro expansion
- [x] Verify compilation works correctly

---

**End of Episode 7 Script**

