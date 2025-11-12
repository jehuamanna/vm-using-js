# Episode 1 — Introduction & Tiny VM

## Overview
Welcome to the first episode of "Build a Virtual Machine in JavaScript"! In this episode, we'll explore what virtual machines are, their history, and build our very first tiny stack-based VM that can perform basic arithmetic operations.

**Duration:** ~15-20 minutes  
**Learning Goals:**
- Understand what a virtual machine is
- Learn about stack-based execution
- Implement basic opcodes: PUSH, ADD, SUB, MUL, PRINT
- See the VM in action with live demos

---

## Script Outline

### [00:00 - 02:00] Introduction & Welcome
**On Screen:** Title card, series logo

**Narration:**
"Welcome to the VM.js series! I'm excited to take you on a journey from zero to building a complete virtual machine entirely in JavaScript. By the end of this series, you'll have built a runtime that can execute programs, manage memory, handle garbage collection, and even compile code on the fly.

Today, we're starting with Episode 1: Introduction & Tiny VM. We'll build the simplest possible virtual machine that can do arithmetic. Let's dive in!"

---

### [02:00 - 05:00] What is a Virtual Machine?
**On Screen:** Diagram showing VM concept, examples (JVM, V8, WASM)

**Narration:**
"First, let's answer the fundamental question: What is a virtual machine?

A virtual machine is a software abstraction that simulates a computer. It provides an execution environment for programs, but instead of running directly on hardware, programs run on this virtualized layer.

You've probably heard of virtual machines in different contexts:
- **JVM (Java Virtual Machine)** - runs Java bytecode
- **V8** - Google's JavaScript engine that compiles JS to machine code
- **WebAssembly** - a portable binary format that runs in browsers
- **Docker containers** - lightweight VMs for applications

Today, we're building something simpler: a stack-based virtual machine. This means our VM uses a stack data structure to perform operations. Think of it like a stack of plates - you can only add or remove from the top."

---

### [05:00 - 08:00] Stack-Based Execution Model
**On Screen:** Animation showing stack operations (PUSH, POP, ADD)

**Narration:**
"Let's understand how stack-based execution works. Imagine we want to calculate 5 + 3.

First, we PUSH 5 onto the stack. The stack now has [5].
Then, we PUSH 3 onto the stack. The stack now has [5, 3].
When we execute ADD, we POP the top two values (3 and 5), add them together (5 + 3 = 8), and PUSH the result back. The stack now has [8].

This is the core of our VM: operations consume values from the stack and push results back. It's elegant and simple!"

---

### [08:00 - 12:00] Implementing the Tiny VM
**On Screen:** Code editor showing vm.js implementation

**Narration:**
"Now let's implement our tiny VM in JavaScript. We'll create a class called `TinyVM` with:
- A stack array to hold values
- A program counter (PC) to track which instruction we're executing
- An execute method that runs bytecode

Let me show you the opcodes we'll support:
- `PUSH` - pushes a value onto the stack
- `ADD` - pops two values, adds them, pushes result
- `SUB` - subtraction
- `MUL` - multiplication
- `PRINT` - pops and displays a value
- `HALT` - stops execution

[Walk through the code, explaining each opcode implementation]"

**Code Walkthrough:**
```javascript
// Opcodes as constants
const OPCODES = {
  PUSH: 0x01,
  ADD: 0x02,
  SUB: 0x03,
  MUL: 0x04,
  PRINT: 0x05,
  HALT: 0x00
};

// The VM class
class TinyVM {
  constructor() {
    this.stack = [];
    this.pc = 0;
    this.running = false;
  }

  execute(bytecode) {
    // Main execution loop
    while (this.running && this.pc < bytecode.length) {
      const opcode = bytecode[this.pc];
      // Switch on opcode...
    }
  }
}
```

---

### [12:00 - 16:00] Demo: Running Programs
**On Screen:** Browser demo showing the VM in action

**Narration:**
"Let's see our VM in action! I've created a simple web interface where we can run bytecode programs.

**Demo 1: Simple Addition**
We'll calculate 5 + 3. The bytecode looks like this:
```
PUSH 5
PUSH 3
ADD
PRINT
HALT
```

[Run the demo, show the output]

Perfect! We got 8, which is correct. Notice how the stack visualization shows the values being pushed and popped.

**Demo 2: More Complex Expression**
Now let's calculate (10 - 3) * 2:
```
PUSH 10
PUSH 3
SUB
PUSH 2
MUL
PRINT
HALT
```

[Run the demo, explain the stack operations step by step]

Great! We got 14, which is (10 - 3) * 2 = 7 * 2 = 14."

---

### [16:00 - 18:00] How Bytecode Works
**On Screen:** Show bytecode array representation

**Narration:**
"Behind the scenes, our programs are represented as arrays of numbers. For example, 'PUSH 5, PUSH 3, ADD' becomes:

```javascript
[0x01, 5, 0x01, 3, 0x02]
```

Each opcode is a number, and some opcodes like PUSH take an immediate value (the number to push). The VM reads these numbers sequentially and executes the corresponding operations.

This is similar to how real VMs work - they execute bytecode, which is a compact representation of program instructions."

---

### [18:00 - 20:00] Summary & Next Episode
**On Screen:** Summary slide, preview of Episode 2

**Narration:**
"Congratulations! You've built your first virtual machine. Today we learned:
- What virtual machines are and why they matter
- How stack-based execution works
- How to implement basic opcodes in JavaScript
- How to run simple arithmetic programs

In the next episode, we'll add branching and loops - control flow instructions like JMP and JMP_IF_ZERO. This will let us write programs with conditionals and loops, making our VM much more powerful.

The code for this episode is available in the repository. Each episode is a separate commit, so you can follow along step by step.

Thanks for watching! See you in Episode 2!"

---

## Demo Notes

### Visual Elements to Show:
1. **Stack Animation:** Show values being pushed/popped during execution
2. **Bytecode Display:** Show both human-readable and numeric bytecode
3. **Step-by-step Execution:** Highlight which instruction is currently executing
4. **Output Console:** Display results clearly

### Interactive Elements:
- Buttons to run different demo programs
- Real-time stack visualization
- Output console showing results

---

## Code Files Created
- `src/core/vm.js` - The TinyVM class implementation
- `public/index.html` - Interactive demo page

---

## Key Concepts Introduced
- Virtual Machine
- Stack-based execution
- Bytecode
- Opcodes
- Program Counter (PC)

---

## Next Episode Teaser
Episode 2 will introduce control flow: branching and loops. We'll add JMP, JMP_IF_ZERO, and JMP_IF_NEG instructions, allowing us to write programs with conditionals and loops. This will make our VM Turing-complete!

