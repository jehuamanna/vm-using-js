# Episode 2 — Branching and Loops

## Overview
In this episode, we'll add control flow to our virtual machine. We'll implement jump instructions that allow our VM to make decisions and create loops, making it Turing-complete!

**Duration:** ~20-25 minutes  
**Learning Goals:**
- Understand control flow in virtual machines
- Implement JMP (unconditional jump)
- Implement JMP_IF_ZERO (conditional jump)
- Implement JMP_IF_NEG (conditional jump)
- Build loops and conditionals from these primitives
- Calculate factorial using a loop

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction
**On Screen:** Title card, Episode 1 recap

**Narration:**
"Welcome back to Episode 2! In Episode 1, we built a tiny virtual machine that could do basic arithmetic. But our VM was limited - it could only execute instructions sequentially, one after another. 

Today, we're going to add control flow: the ability to jump to different parts of our program, make decisions, and create loops. This will make our VM Turing-complete - meaning it can compute anything that's computable!

Let's add three new instructions: JMP, JMP_IF_ZERO, and JMP_IF_NEG."

---

### [02:00 - 06:00] Understanding Control Flow
**On Screen:** Diagram showing sequential vs branching execution

**Narration:**
"Control flow is how a program decides which instructions to execute next. In most programming languages, you have:
- **Conditionals**: if/else statements
- **Loops**: while, for loops
- **Functions**: jumping to different code sections

In our VM, we'll implement these using jump instructions. A jump instruction changes the program counter (PC) - the pointer that tells the VM which instruction to execute next.

Normally, the PC just increments after each instruction. But with jumps, we can set the PC to any address in our bytecode, allowing us to:
- Skip ahead (like an if statement)
- Jump back (like a loop)
- Jump to different sections (like function calls)

Let's see how this works!"

---

### [06:00 - 10:00] Implementing JMP (Unconditional Jump)
**On Screen:** Code editor showing JMP implementation

**Narration:**
"First, let's implement the simplest jump: JMP, which unconditionally jumps to a specified address.

Here's how it works:
1. The JMP opcode is followed by an address (a number indicating which bytecode position to jump to)
2. When we encounter JMP, we read the address and set our program counter to that address
3. Execution continues from there

[Show code implementation]

```javascript
case OPCODES.JMP:
  this.pc++;
  const jumpAddr = bytecode[this.pc];
  if (jumpAddr < 0 || jumpAddr >= bytecode.length) {
    throw new Error(`Invalid jump address: ${jumpAddr}`);
  }
  this.pc = jumpAddr;
  break;
```

Notice we validate the address to prevent jumping outside our program bounds. This is important for safety!

JMP by itself isn't very useful - it just creates an infinite loop if you jump back. But combined with conditional jumps, it becomes powerful."

---

### [10:00 - 14:00] Implementing Conditional Jumps
**On Screen:** Code editor showing JMP_IF_ZERO and JMP_IF_NEG

**Narration:**
"Now let's add conditional jumps. These check a condition before jumping.

**JMP_IF_ZERO**: Jumps if the top of the stack is zero
- Pop a value from the stack
- If it's zero, jump to the specified address
- Otherwise, continue to the next instruction

**JMP_IF_NEG**: Jumps if the top of the stack is negative
- Pop a value from the stack
- If it's less than zero, jump to the specified address
- Otherwise, continue to the next instruction

[Show code implementation]

```javascript
case OPCODES.JMP_IF_ZERO:
  this.pc++;
  const zeroAddr = bytecode[this.pc];
  const topValue = this.pop();
  if (topValue === 0) {
    this.pc = zeroAddr;
  } else {
    this.pc++;
  }
  break;
```

These conditional jumps consume a value from the stack. This is important - the value is popped, so if you need it later, you'll need to duplicate it first. We'll add a DUP instruction in a future episode!"

---

### [14:00 - 18:00] Building Conditionals
**On Screen:** Demo showing conditional branching

**Narration:**
"Let's use our new instructions to build an if/else statement. We want to print 'Positive' if a number is greater than zero, otherwise print 'Zero or Negative'.

Here's the logic:
1. Push our test value onto the stack
2. Use JMP_IF_NEG to jump to the 'else' branch if negative
3. If we reach here, the value is positive - print 1
4. Jump to the end to skip the else branch
5. Else branch: print 0
6. End label: halt

[Show bytecode and run demo]

Notice how we use labels in our assembler to make the code readable. The assembler converts labels like 'negative_label' into actual bytecode addresses. This is similar to how assembly language works!"

---

### [18:00 - 22:00] Building Loops
**On Screen:** Demo showing loop execution

**Narration:**
"Now let's build a loop! A loop needs:
1. A start label (where the loop begins)
2. Loop body (the code to repeat)
3. A condition check
4. A jump back to the start if the condition is true

For example, a countdown loop:
- Start: print the counter
- Decrement the counter
- Check if counter is negative (meaning we're done)
- If not negative, jump back to start
- Otherwise, exit

[Show countdown example]

However, there's a challenge: we need to check the counter AND keep it on the stack for the next iteration. This requires duplicating the top of the stack, which we'll add in a future episode. For now, we can work around this limitation."

---

### [22:00 - 25:00] Factorial Example
**On Screen:** Demo calculating factorial

**Narration:**
"Let's calculate factorial! Factorial of n (written n!) is n × (n-1) × (n-2) × ... × 1.

For example, 5! = 5 × 4 × 3 × 2 × 1 = 120.

The algorithm:
1. Start with result = 1
2. Loop from n down to 1:
   - Multiply result by current n
   - Decrement n
3. When n reaches 0, we're done

[Show factorial calculation]

Since we don't have DUP yet, I'll show a simplified version. In the next episodes, we'll add more stack manipulation instructions that make loops easier to write."

---

### [25:00 - 27:00] Summary & Next Episode
**On Screen:** Summary slide

**Narration:**
"Excellent! We've added control flow to our VM. Today we learned:
- How jump instructions work
- Implementing JMP, JMP_IF_ZERO, and JMP_IF_NEG
- Building conditionals and loops from these primitives
- Our VM is now Turing-complete!

In the next episode, we'll add memory and variables. This will let us store and retrieve values by name, making our programs much more practical. We'll implement LOAD and STORE instructions that work with a memory array.

The code for this episode is in the repository. Try modifying the examples to create your own loops and conditionals!

Thanks for watching, and I'll see you in Episode 3!"

---

## Demo Notes

### Visual Elements to Show:
1. **Program Counter Animation**: Show PC moving through bytecode, jumping on JMP instructions
2. **Stack Visualization**: Show values being popped for conditional checks
3. **Control Flow Graph**: Visual diagram showing how jumps create branches and loops
4. **Step-by-step Execution**: Highlight current instruction and show PC value

### Interactive Elements:
- Buttons to run different demo programs
- Visual representation of bytecode with addresses
- Stack state during execution
- Program counter indicator

---

## Code Files Created/Modified
- `src/core/vm.js` - Added JMP, JMP_IF_ZERO, JMP_IF_NEG opcodes
- `public/demos/episode02.html` - Interactive demo page with branching examples

---

## Key Concepts Introduced
- Control Flow
- Program Counter (PC) manipulation
- Unconditional Jump (JMP)
- Conditional Jump (JMP_IF_ZERO, JMP_IF_NEG)
- Loops
- Conditionals
- Turing Completeness
- Labels and Addresses

---

## Technical Notes
- Jump addresses are validated to prevent out-of-bounds access
- Conditional jumps consume the value from the stack
- Labels are converted to addresses during assembly
- Full loop support requires DUP instruction (coming in future episode)

---

## Next Episode Teaser
Episode 3 will add memory and variables with LOAD and STORE instructions. This will let us write programs that can store and retrieve values, making our VM much more practical for real programs!

