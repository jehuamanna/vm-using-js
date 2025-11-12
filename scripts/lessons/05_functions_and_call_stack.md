# Episode 5: Functions & Call Stack

## Overview
Welcome back! In this episode, we're taking a huge leap forward by adding **function calls** to our virtual machine. This is where things get really interesting—we'll implement `CALL` and `RET` instructions, build a call stack to manage function invocations, and even demonstrate **recursion** with a Fibonacci example.

## What You'll Learn
- How function calls work at the bytecode level
- The `CALL` and `RET` opcodes
- Call stack management and stack frames
- Parameter passing conventions
- Recursive function calls

---

## Introduction (0:00 - 1:00)

Hey everyone! So far, our VM can do arithmetic, control flow, memory operations, and I/O. But there's one crucial feature missing: **functions**. 

Think about it—without functions, we can't reuse code, we can't organize our programs, and we definitely can't do recursion. Today, we're fixing that by adding function calls to our virtual machine.

---

## The Problem: Why We Need Functions (1:00 - 2:30)

Let's say you want to calculate `5 * 2` and `10 * 2`. Without functions, you'd write:

```
PUSH 5
PUSH 2
MUL
PRINT

PUSH 10
PUSH 2
MUL
PRINT
```

But with a `double` function, you could write:

```
PUSH 5
CALL double
PRINT

PUSH 10
CALL double
PRINT
```

Much cleaner! Functions let us:
1. **Reuse code** - Write once, call many times
2. **Organize programs** - Break complex logic into smaller pieces
3. **Enable recursion** - Functions can call themselves

---

## How Function Calls Work (2:30 - 5:00)

When you call a function, the VM needs to:
1. **Save where to return** - Remember the instruction after the CALL
2. **Jump to the function** - Start executing the function's bytecode
3. **Execute the function** - Run the function's instructions
4. **Return** - Jump back to where we came from

This is exactly what the `CALL` and `RET` instructions do.

### The CALL Instruction

`CALL` takes one operand: the address of the function to call.

```
CALL 15  // Call function at address 15
```

When executed:
1. Save the return address (the instruction after CALL)
2. Save the current stack pointer (for frame management)
3. Jump to the function address

### The RET Instruction

`RET` takes no operands—it just returns from the current function.

```
RET  // Return to caller
```

When executed:
1. Pop the return address from the call stack
2. Jump back to that address

---

## Implementing CALL and RET (5:00 - 10:00)

Let's look at the implementation in our VM:

### Adding the Opcodes

First, we add two new opcodes:

```typescript
CALL: 0x0C,  // Episode 5: Call function at address
RET: 0x0D,   // Episode 5: Return from function
```

### The Call Stack

We need a data structure to track function calls. We'll use a **call stack**:

```typescript
interface CallFrame {
  returnAddress: number;
  stackPointer: number; // Stack size when function was called
}

callStack: CallFrame[] = [];
```

Each frame stores:
- **returnAddress**: Where to jump back to
- **stackPointer**: The stack size when the function was called (useful for cleanup)

### CALL Implementation

```typescript
case OPCODES.CALL:
  this.pc++;
  const callAddr = bytecode[this.pc];
  
  // Save return address (next instruction after CALL and its operand)
  const returnAddr = this.pc + 1;
  
  // Save current stack pointer
  this.callStack.push({
    returnAddress: returnAddr,
    stackPointer: this.stack.length
  });
  
  // Jump to function
  this.pc = callAddr;
  break;
```

### RET Implementation

```typescript
case OPCODES.RET:
  if (this.callStack.length === 0) {
    throw new Error('RET called but call stack is empty');
  }
  
  const frame = this.callStack.pop()!;
  this.pc = frame.returnAddress;
  break;
```

---

## Demo 1: Simple Function (10:00 - 12:00)

Let's start with a simple example: a `double` function that multiplies a number by 2.

### The Bytecode

```
// Main program
PUSH 5        // Push argument
CALL double   // Call function at address 5
PRINT         // Print result
HALT

// double function (address 5)
PUSH 2        // Push 2
MUL           // Multiply: n * 2
RET           // Return result
```

### Calling Convention

Our simple calling convention:
- **Parameters**: Passed on the stack (pushed before CALL)
- **Return value**: Left on the stack (pushed before RET)
- **Stack cleanup**: Caller's responsibility

When `CALL double` executes:
1. The argument `5` is already on the stack
2. `CALL` saves the return address (address 4) and jumps to address 5
3. The function pushes `2`, multiplies, leaving `10` on the stack
4. `RET` pops the return address and jumps back to address 4
5. `PRINT` outputs `10`

---

## Demo 2: Recursive Fibonacci (12:00 - 18:00)

Now for the fun part: **recursion**! We'll implement the Fibonacci sequence using recursive function calls.

### Fibonacci Definition

```
fib(0) = 0
fib(1) = 1
fib(n) = fib(n-1) + fib(n-2)  for n > 1
```

### The Bytecode

```
// Main program
PUSH n        // Push argument
CALL fib      // Call fib function
PRINT         // Print result
HALT

// fib function (address 15)
STORE 0       // Pop n and save in memory[0]
LOAD 0        // Load n
PUSH 1        // Push 1
SUB           // n - 1
JMP_IF_NEG base_case  // if n < 1, jump to base case
JMP_IF_ZERO base_case // if n == 1, jump to base case

// Recursive case: fib(n-1) + fib(n-2)
LOAD 0        // Load n
PUSH 1
SUB           // n - 1
CALL fib      // Call fib(n-1), result on stack
STORE 1       // Save fib(n-1) in memory[1]

LOAD 0        // Load n
PUSH 2
SUB           // n - 2
CALL fib      // Call fib(n-2), result on stack

LOAD 1        // Load fib(n-1)
ADD           // fib(n-1) + fib(n-2)
RET           // Return result

// Base case
base_case:
LOAD 0        // Load n
RET           // Return n
```

### How It Works

1. **Base case**: If `n <= 1`, return `n` directly
2. **Recursive case**: 
   - Compute `fib(n-1)` and save it
   - Compute `fib(n-2)`
   - Add them together and return

### The Call Stack in Action

When computing `fib(4)`, the call stack grows and shrinks:

```
fib(4) calls fib(3)
  fib(3) calls fib(2)
    fib(2) calls fib(1) → returns 1
    fib(2) calls fib(0) → returns 0
    fib(2) returns 1
  fib(3) calls fib(1) → returns 1
  fib(3) returns 2
fib(4) calls fib(2) → returns 1
fib(4) returns 3
```

Each recursive call pushes a new frame onto the call stack, and each return pops it off.

---

## Visualizing the Call Stack (18:00 - 20:00)

In our demo UI, we show:
1. **Stack visualization** - The data stack with values
2. **Call stack visualization** - The function call frames

Watch how the call stack grows during recursion and shrinks as functions return. This is exactly what happens in real programming languages!

---

## Key Concepts Recap (20:00 - 21:00)

Let's recap what we learned:

1. **CALL instruction**: Saves return address, jumps to function
2. **RET instruction**: Restores return address, jumps back
3. **Call stack**: Tracks active function calls
4. **Stack frames**: Store return addresses and stack pointers
5. **Calling convention**: How parameters and return values are passed

---

## What's Next? (21:00 - 22:00)

We've added functions, but there's still more to explore:
- **Local variables** - Functions need their own variable space
- **Multiple parameters** - Passing more than one argument
- **Function pointers** - Calling functions dynamically
- **Tail call optimization** - Making recursion more efficient

In the next episode, we'll start building a **compiler** that can translate high-level code into our bytecode. This is where the real magic happens!

---

## Summary

Today we:
- ✅ Added `CALL` and `RET` opcodes
- ✅ Implemented a call stack for function management
- ✅ Demonstrated simple function calls
- ✅ Showed recursive function calls with Fibonacci

Functions are the foundation of structured programming. With them, our VM can now handle complex, reusable code. 

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. See you in the next episode!

---

## Demo Notes

**Visual Elements:**
- Show the bytecode for both demos
- Highlight CALL and RET instructions
- Display stack state during execution
- Show call stack growing/shrinking during recursion
- Use different colors for stack vs call stack

**Code Walkthrough:**
- Point out the CALL implementation
- Show how return addresses are saved
- Demonstrate the call stack in action
- Walk through the Fibonacci recursion step-by-step

**Interactive Elements:**
- Let viewers change the Fibonacci input
- Show real-time stack and call stack updates
- Highlight which instruction is currently executing

