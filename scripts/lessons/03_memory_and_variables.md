# Episode 3 — Memory & Variables

## Overview
In this episode, we'll add memory to our virtual machine, allowing us to store and retrieve values. This enables variable-like behavior, making our programs much more practical and powerful.

**Duration:** ~20-25 minutes  
**Learning Goals:**
- Understand how memory works in virtual machines
- Implement a memory array for storing values
- Add LOAD and STORE instructions
- Use memory to create variables and accumulate values
- See how memory enables more complex programs

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction
**On Screen:** Title card, Episode 2 recap

**Narration:**
"Welcome back to Episode 3! So far, we've built a VM that can do arithmetic and control flow. But there's a problem: we can't store values for later use. Every time we need a value, we have to push it onto the stack again.

Today, we're adding memory to our VM. This will let us store values at specific addresses and load them back later - essentially giving us variables! This is a huge step forward in making our VM practical for real programs."

---

### [02:00 - 06:00] Understanding Memory in VMs
**On Screen:** Diagram showing stack vs memory

**Narration:**
"Let's understand the difference between the stack and memory:

**The Stack** is temporary storage. Values are pushed and popped in LIFO (Last In, First Out) order. It's perfect for calculations, but values disappear when popped.

**Memory** is persistent storage. It's like an array where we can store values at specific addresses and retrieve them later. Think of it like variables in a programming language.

In our VM, we'll implement memory as a simple array. Each position in the array is a memory address. We can:
- STORE a value from the stack to a memory address
- LOAD a value from a memory address onto the stack

This gives us the ability to create variables! For example:
- Address 0 might hold variable `x`
- Address 1 might hold variable `y`
- Address 2 might hold a counter

Let's implement this!"

---

### [06:00 - 10:00] Adding Memory to the VM
**On Screen:** Code editor showing memory array initialization

**Narration:**
"First, we need to add a memory array to our VM. We'll initialize it in the constructor:

```javascript
constructor(memorySize = 256) {
  this.stack = [];
  this.memory = new Array(memorySize).fill(0);
  // ...
}
```

We're creating a memory array of 256 cells, all initialized to zero. This gives us 256 memory addresses (0-255) to work with. In a real VM, memory might be much larger, but 256 is plenty for our examples.

We also need to clear memory when we reset the VM:

```javascript
reset() {
  this.stack = [];
  this.memory.fill(0);  // Clear all memory
  // ...
}
```

Now let's add the opcodes for memory operations!"

---

### [10:00 - 14:00] Implementing STORE Instruction
**On Screen:** Code editor showing STORE implementation

**Narration:**
"The STORE instruction takes a value from the stack and stores it at a memory address. Here's how it works:

1. The STORE opcode is followed by a memory address
2. Pop a value from the stack
3. Store that value at the specified memory address

[Show code implementation]

```javascript
case OPCODES.STORE:
  this.pc++;
  const storeAddr = bytecode[this.pc];
  if (storeAddr < 0 || storeAddr >= this.memory.length) {
    throw new Error(`Invalid memory address: ${storeAddr}`);
  }
  const valueToStore = this.pop();
  this.memory[storeAddr] = valueToStore;
  this.pc++;
  break;
```

Notice we validate the address to prevent accessing memory outside our array bounds. This is important for safety!

STORE consumes a value from the stack - the value is removed and placed in memory."

---

### [14:00 - 18:00] Implementing LOAD Instruction
**On Screen:** Code editor showing LOAD implementation

**Narration:**
"The LOAD instruction does the opposite: it reads a value from memory and pushes it onto the stack.

1. The LOAD opcode is followed by a memory address
2. Read the value from that memory address
3. Push it onto the stack

[Show code implementation]

```javascript
case OPCODES.LOAD:
  this.pc++;
  const loadAddr = bytecode[this.pc];
  if (loadAddr < 0 || loadAddr >= this.memory.length) {
    throw new Error(`Invalid memory address: ${loadAddr}`);
  }
  this.push(this.memory[loadAddr]);
  this.pc++;
  break;
```

LOAD doesn't remove the value from memory - it just copies it to the stack. This means we can load the same value multiple times!

Together, LOAD and STORE give us variables. We can think of memory addresses as variable names."

---

### [18:00 - 22:00] Demo: Basic Variable Assignment
**On Screen:** Demo showing variable assignment

**Narration:**
"Let's see memory in action! We'll store a value and load it back:

```
PUSH 42
STORE 0    // Store 42 at address 0
LOAD 0     // Load from address 0
PRINT      // Print 42
```

[Run the demo, show memory visualization]

Perfect! We stored 42 at address 0, then loaded it back and printed it. Notice how the memory visualization shows the value stored at address 0.

This is like writing `x = 42` and then using `x` in a programming language!"

---

### [22:00 - 26:00] Demo: Variable Reuse
**On Screen:** Demo showing multiple variables

**Narration:**
"Now let's use multiple variables. We'll store x = 10 and y = 20, calculate x + y, then modify x and calculate again:

```
PUSH 10
STORE 0    // x = 10
PUSH 20
STORE 1    // y = 20

LOAD 0     // Load x
LOAD 1     // Load y
ADD        // x + y = 30
PRINT

PUSH 15
STORE 0    // x = 15 (modify x)

LOAD 0     // Load x (now 15)
LOAD 1     // Load y (still 20)
ADD        // x + y = 35
PRINT
```

[Run the demo, explain step by step]

This demonstrates a key feature of variables: we can modify them and reuse them. The value at address 0 changed from 10 to 15, and we could use both values in calculations!"

---

### [26:00 - 29:00] Demo: Accumulator Pattern
**On Screen:** Demo showing accumulator

**Narration:**
"One common pattern is the accumulator: we start with a value and keep adding to it. Let's calculate 0 + 5 + 10 + 3:

```
PUSH 0
STORE 0    // sum = 0

LOAD 0     // Load sum
PUSH 5     // Push 5
ADD        // sum + 5
STORE 0    // sum = 5

LOAD 0     // Load sum (now 5)
PUSH 10    // Push 10
ADD        // sum + 10
STORE 0    // sum = 15

LOAD 0     // Load sum (now 15)
PUSH 3     // Push 3
ADD        // sum + 3
STORE 0    // sum = 18

LOAD 0
PRINT      // Print 18
```

[Run the demo]

This pattern of LOAD, modify, STORE is very common. It's how we update variables in our VM!"

---

### [29:00 - 32:00] Summary & Next Episode
**On Screen:** Summary slide

**Narration:**
"Excellent! We've added memory to our VM. Today we learned:
- How memory differs from the stack
- Implementing a memory array in the VM
- STORE instruction: save values to memory
- LOAD instruction: retrieve values from memory
- Using memory to create variables and accumulate values

Our VM is getting more powerful! We can now store and reuse values, which is essential for practical programs.

In the next episode, we'll add input and output. We'll implement a READ instruction that lets users input values interactively, and we'll build a small calculator program that uses both input and output.

The code for this episode is in the repository. Try creating your own programs that use memory!

Thanks for watching, and I'll see you in Episode 4!"

---

## Demo Notes

### Visual Elements to Show:
1. **Memory Visualization**: Show memory addresses and their values in a grid
2. **Stack Visualization**: Show values being pushed/popped
3. **Memory Updates**: Highlight when memory addresses change
4. **Step-by-step Execution**: Show LOAD/STORE operations clearly

### Interactive Elements:
- Buttons to run different demo programs
- Real-time memory visualization showing used addresses
- Stack state during execution
- Clear visual distinction between stack and memory

---

## Code Files Created/Modified
- `src/core/vm.js` - Added memory array, LOAD, and STORE opcodes
- `public/demos/episode03.html` - Interactive demo page with memory examples

---

## Key Concepts Introduced
- Memory vs Stack
- Memory Addresses
- LOAD Instruction
- STORE Instruction
- Variables (as memory addresses)
- Accumulator Pattern
- Memory Bounds Checking

---

## Technical Notes
- Memory is implemented as a simple array
- Default memory size is 256 addresses
- Memory addresses are validated to prevent out-of-bounds access
- Memory persists across operations until reset
- LOAD copies values (doesn't remove from memory)
- STORE consumes values from the stack

---

## Next Episode Teaser
Episode 4 will add input and output with a READ instruction. We'll build an interactive calculator that can read user input and perform calculations, making our VM truly interactive!

