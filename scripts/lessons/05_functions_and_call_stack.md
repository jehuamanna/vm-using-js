# Episode 5: Functions & Call Stack

## Overview
Welcome back! In this episode, we're taking a huge leap forward by adding **function calls** to our virtual machine. This is where things get really interesting—we'll implement `CALL` and `RET` instructions, build a call stack to manage function invocations, add **stack frame support** with frame-relative local variables, and demonstrate **recursion** with both Fibonacci and factorial examples.

**Duration:** ~25-30 minutes  
**Learning Goals:**
- Understand function calls at the bytecode level
- Implement CALL and RET opcodes
- Build a call stack for function management
- Add stack frame support with LOAD_LOCAL and STORE_LOCAL
- Demonstrate simple functions, single recursion, and double recursion
- See how stack frames enable proper recursive function calls

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction

**On Screen:** Title card, Episode 4 recap, Episode 5 title

**Narration:**
"Hey everyone! Welcome to Episode 5. So far, our VM can do arithmetic, control flow, memory operations, and I/O. But there's one crucial feature missing: **functions**.

Think about it—without functions, we can't reuse code, we can't organize our programs, and we definitely can't do recursion. Today, we're fixing that by adding function calls to our virtual machine, complete with proper stack frame support for recursion.

This is a big episode, so let's dive in!"

---

### [02:00 - 05:00] The Problem: Why We Need Functions

**On Screen:** Code comparison showing code duplication vs function reuse

**Narration:**
"Let's say you want to calculate `5 * 2` and `10 * 2`. Without functions, you'd write:

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

And with proper stack frames, each function call gets its own local variables, making recursion work correctly."

---

### [05:00 - 10:00] How Function Calls Work

**On Screen:** Diagram showing function call flow, call stack visualization

**Narration:**
"When you call a function, the VM needs to:
1. **Save where to return** - Remember the instruction after the CALL
2. **Set up a stack frame** - Allocate space for local variables
3. **Jump to the function** - Start executing the function's bytecode
4. **Execute the function** - Run the function's instructions
5. **Return** - Jump back to where we came from and clean up

This is exactly what the `CALL` and `RET` instructions do, along with our new stack frame system."

---

### [10:00 - 15:00] Implementing CALL and RET

**On Screen:** Code walkthrough of VM implementation

**Narration:**
"Let's look at the implementation in our VM. First, we add four new opcodes:

```typescript
CALL: 0x0C,        // Call function at address
RET: 0x0D,         // Return from function
LOAD_LOCAL: 0x0E,  // Load from frame-relative local variable
STORE_LOCAL: 0x0F, // Store to frame-relative local variable
```

The `LOAD_LOCAL` and `STORE_LOCAL` instructions are crucial—they enable proper stack frame support, allowing each function call to have its own local variables without conflicts during recursion.

### The Call Stack

We need a data structure to track function calls. We'll use a **call stack**:

```typescript
interface CallFrame {
  returnAddress: number;
  stackPointer: number; // Stack size when function was called
  frameBase: number;    // Base address in memory for local variables
}

callStack: CallFrame[] = [];
```

Each frame stores:
- **returnAddress**: Where to jump back to
- **stackPointer**: The stack size when the function was called (useful for cleanup)
- **frameBase**: Base address for frame-relative local variables (enables proper recursion)

### CALL Implementation

```typescript
case OPCODES.CALL:
  this.pc++;
  const callAddr = bytecode[this.pc];
  
  // Save return address (next instruction after CALL and its operand)
  const returnAddr = this.pc + 1;
  
  // Calculate frame base: use call stack depth * 16 to avoid conflicts
  // Each frame gets 16 local variable slots (0-15)
  const frameBase = this.callStack.length * 16;
  
  // Save current stack pointer and frame base
  this.callStack.push({
    returnAddress: returnAddr,
    stackPointer: this.stack.length,
    frameBase: frameBase
  });
  
  // Jump to function
  this.pc = callAddr;
  break;
```

The key addition is `frameBase` - each function call gets its own memory region for local variables, preventing conflicts during recursion.

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

### LOAD_LOCAL and STORE_LOCAL Implementation

These instructions provide frame-relative local variable access:

```typescript
case OPCODES.LOAD_LOCAL:
  this.pc++;
  const localOffset = bytecode[this.pc];
  const currentFrame = this.callStack[this.callStack.length - 1];
  const localAddr = currentFrame.frameBase + localOffset;
  this.push(this.memory[localAddr]);
  this.pc++;
  break;

case OPCODES.STORE_LOCAL:
  this.pc++;
  const storeLocalOffset = bytecode[this.pc];
  const currentFrame2 = this.callStack[this.callStack.length - 1];
  const storeLocalAddr = currentFrame2.frameBase + storeLocalOffset;
  const valueToStoreLocal = this.pop();
  this.memory[storeLocalAddr] = valueToStoreLocal;
  this.pc++;
  break;
```

Each function call gets its own frame with a unique `frameBase`, so `local[0]` in one call refers to a different memory location than `local[0]` in another call. This enables proper recursion!"

---

### [15:00 - 18:00] Demo 1: Simple Function

**On Screen:** Demo 1 running, showing bytecode and output

**Narration:**
"Let's start with a simple example: a `double` function that multiplies a number by 2.

### The Bytecode

```
// Main program
PUSH 5        // Push argument
CALL double   // Call function at address 6
PRINT         // Print result
HALT

// double function (address 6)
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
2. `CALL` saves the return address (address 4) and jumps to address 6
3. The function pushes `2`, multiplies, leaving `10` on the stack
4. `RET` pops the return address and jumps back to address 4
5. `PRINT` outputs `10`

This is a simple function with no local variables, so we don't need LOAD_LOCAL or STORE_LOCAL here. But watch what happens when we add recursion!"

---

### [18:00 - 25:00] Demo 2: Recursive Fibonacci

**On Screen:** Demo 2 running, showing Fibonacci calculation, call stack growing

**Narration:**
"Now for the fun part: **recursion**! We'll implement the Fibonacci sequence using recursive function calls.

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

// fib function (address 6)
STORE_LOCAL 0 // Pop n and save in local[0] (frame-relative)
LOAD_LOCAL 0  // Load n from local[0]
PUSH 1        // Push 1
SUB           // n - 1
JMP_IF_NEG base_case  // if n < 1, jump to base case
JMP_IF_ZERO base_case // if n == 1, jump to base case

// Recursive case: fib(n-1) + fib(n-2)
LOAD_LOCAL 0  // Load n from local[0]
PUSH 1
SUB           // n - 1
CALL fib      // Call fib(n-1), result on stack
STORE_LOCAL 1 // Save fib(n-1) in local[1]

LOAD_LOCAL 0  // Load n from local[0] (still safe in our frame!)
PUSH 2
SUB           // n - 2
CALL fib      // Call fib(n-2), result on stack

LOAD_LOCAL 1  // Load fib(n-1) from local[1]
ADD           // fib(n-1) + fib(n-2)
RET           // Return result

// Base case
base_case:
LOAD_LOCAL 0  // Load n from local[0]
RET           // Return n
```

**Key difference**: We use `LOAD_LOCAL` and `STORE_LOCAL` instead of `LOAD` and `STORE`. This ensures each recursive call has its own local variables, preventing conflicts!

### How It Works

1. **Base case**: If `n <= 1`, return `n` directly
2. **Recursive case**: 
   - Compute `fib(n-1)` and save it in `local[1]`
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

### Why Stack Frames Matter

Notice how each call uses `local[0]` and `local[1]`, but they don't conflict! That's because:
- `fib(4)` uses frame base 0 (locals at memory[0-15])
- `fib(3)` uses frame base 16 (locals at memory[16-31])
- `fib(2)` uses frame base 32 (locals at memory[32-47])

Each call's `local[0]` refers to a different memory location. Without stack frames, all calls would share the same memory, causing bugs!"

---

### [25:00 - 30:00] Demo 3: Recursive Factorial

**On Screen:** Demo 3 running, showing factorial calculation

**Narration:**
"Let's validate our recursion implementation with another example: **factorial**. This uses a different recursion pattern—single recursive call instead of two.

### Factorial Definition

```
fact(0) = 1
fact(n) = n * fact(n-1)  for n > 0
```

### The Bytecode

```
// Main program
PUSH n        // Push argument
CALL fact     // Call fact function
PRINT         // Print result
HALT

// fact function (address 6)
STORE_LOCAL 0 // Pop n and save in local[0]
LOAD_LOCAL 0  // Load n from local[0]
PUSH 0        // Push 0
SUB           // n - 0
JMP_IF_ZERO base_case // if n == 0, jump to base case

// Recursive case: n * fact(n-1)
LOAD_LOCAL 0  // Load n from local[0]
PUSH 1
SUB           // n - 1
CALL fact     // Call fact(n-1), result on stack

LOAD_LOCAL 0  // Load n from local[0]
MUL           // n * fact(n-1)
RET           // Return result

// Base case
base_case:
PUSH 1        // Push 1
RET           // Return 1
```

### Key Differences from Fibonacci

1. **Single recursive call** - Only calls `fact(n-1)`, not two separate calls
2. **Multiplication pattern** - Multiplies the result, doesn't add
3. **Different base case** - Returns 1 instead of n

But it still uses the same stack frame mechanism! Each recursive call gets its own frame with its own `local[0]`, so `fact(5)` can safely call `fact(4)`, which calls `fact(3)`, and so on.

### Execution Trace

For `fact(5)`:
- `fact(5)` stores 5 in its `local[0]`, calls `fact(4)`
- `fact(4)` stores 4 in its `local[0]` (different frame!), calls `fact(3)`
- ...continues until `fact(0)` returns 1
- Then each call multiplies by its own `n` and returns

The result: `5 * 4 * 3 * 2 * 1 * 1 = 120`

This validates that our stack frame implementation works correctly for different recursion patterns!"

---

### [30:00 - 32:00] Visualizing the Call Stack

**On Screen:** Call stack visualization showing frames growing and shrinking

**Narration:**
"In our demo UI, we show:
1. **Stack visualization** - The data stack with values
2. **Call stack visualization** - The function call frames with return addresses and stack pointers

Watch how the call stack grows during recursion and shrinks as functions return. This is exactly what happens in real programming languages!

Each frame shows:
- **Return address**: Where execution will resume
- **Stack pointer**: The stack size when the function was called
- **Frame base**: (Not shown in UI, but used internally) The memory region for local variables

This visualization helps you understand how recursion works at the VM level."

---

### [32:00 - 34:00] Key Concepts Recap

**On Screen:** Summary slide with key points

**Narration:**
"Let's recap what we learned:

1. **CALL instruction**: Saves return address, sets up stack frame, jumps to function
2. **RET instruction**: Restores return address, jumps back, cleans up frame
3. **Call stack**: Tracks active function calls with frames
4. **Stack frames**: Store return addresses, stack pointers, and frame bases
5. **LOAD_LOCAL and STORE_LOCAL**: Frame-relative local variable access
6. **Calling convention**: How parameters and return values are passed
7. **Recursion**: Works correctly because each call gets its own frame

These concepts are fundamental to how all programming languages work under the hood!"

---

### [34:00 - 35:00] What's Next?

**On Screen:** Preview of Episode 6

**Narration:**
"We've added functions with proper stack frame support, but there's still more to explore:
- **Error handling** - What happens when things go wrong?
- **Debugging tools** - How to trace execution step-by-step
- **More calling conventions** - Multiple parameters, return values
- **Tail call optimization** - Making recursion more efficient

In the next episode, we'll add error handling and debugging capabilities to our VM. This will make it much easier to develop and test programs!

But for now, we have a fully functional VM that supports:
- Arithmetic operations
- Control flow (loops, conditionals)
- Memory and variables
- Input and output
- **Functions and recursion with stack frames**

That's a lot of progress!"

---

### [35:00 - 36:00] Summary & Outro

**On Screen:** Final summary, subscribe reminder

**Narration:**
"Today we:
- ✅ Added `CALL` and `RET` opcodes
- ✅ Implemented a call stack for function management
- ✅ Added stack frame support with `LOAD_LOCAL` and `STORE_LOCAL`
- ✅ Demonstrated simple function calls
- ✅ Showed recursive function calls with Fibonacci (double recursion)
- ✅ Validated with factorial (single recursion)

Functions are the foundation of structured programming. With proper stack frames, our VM can now handle complex, reusable, recursive code just like real programming languages.

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. Try out the demos yourself and experiment with different values. See you in the next episode!"

---

## Demo Notes

### Visual Elements

**Demo 1: Simple Function**
- Show the bytecode for the double function
- Highlight CALL and RET instructions
- Display stack state during execution
- Show the result (10)

**Demo 2: Recursive Fibonacci**
- Show the bytecode with LOAD_LOCAL and STORE_LOCAL
- Display stack state during execution
- Show call stack growing and shrinking
- Highlight how each recursive call has its own frame
- Walk through fib(4) step-by-step
- Show the final result (3)

**Demo 3: Recursive Factorial**
- Show the bytecode with single recursive call
- Display stack state during execution
- Show call stack visualization
- Walk through fact(5) step-by-step
- Show the final result (120)

**Call Stack Visualization**
- Show frames with return addresses
- Show stack pointers
- Animate frames being pushed and popped
- Use different colors for different call depths

### Code Walkthrough

1. **Point out the CALL implementation**
   - Show how return address is saved
   - Explain frame base calculation
   - Show how the call stack grows

2. **Show how return addresses are saved**
   - Demonstrate with the simple function
   - Show the jump back to the caller

3. **Demonstrate the call stack in action**
   - Walk through Fibonacci recursion
   - Show how frames are pushed and popped
   - Explain why each frame needs its own local variables

4. **Walk through the Fibonacci recursion step-by-step**
   - Show fib(4) calling fib(3)
   - Show fib(3) calling fib(2) and fib(1)
   - Show how results propagate back up
   - Highlight the use of local[0] and local[1] in each frame

5. **Walk through the Factorial recursion step-by-step**
   - Show fact(5) calling fact(4)
   - Show the chain of calls down to fact(0)
   - Show how results multiply back up
   - Highlight the single recursive call pattern

### Interactive Elements

- Let viewers change the Fibonacci input (0-10)
- Let viewers change the Factorial input (0-10)
- Show real-time stack and call stack updates
- Highlight which instruction is currently executing
- Show memory addresses for local variables in different frames

### Teaching Tips

1. **Emphasize the importance of stack frames**
   - Without them, recursion wouldn't work
   - Each call needs its own local variables
   - This is how real VMs work

2. **Compare the three demos**
   - Simple function: no recursion, no local variables needed
   - Fibonacci: double recursion, needs two local variables
   - Factorial: single recursion, needs one local variable

3. **Explain the frame base calculation**
   - `frameBase = callStack.length * 16`
   - Each frame gets 16 slots (0-15)
   - This prevents conflicts between recursive calls

4. **Show the progression**
   - Start simple (double function)
   - Add complexity (Fibonacci with two recursive calls)
   - Validate with different pattern (Factorial with one recursive call)

---

## Technical Details

### Stack Frame Layout

Each call frame gets:
- **16 local variable slots** (indices 0-15)
- **Frame base** = `callStack.length * 16`
- **Memory layout**:
  - Frame 0: memory[0-15]
  - Frame 1: memory[16-31]
  - Frame 2: memory[32-47]
  - etc.

### Calling Convention

- **Parameters**: Passed on the stack (pushed before CALL)
- **Return value**: Left on the stack (pushed before RET)
- **Local variables**: Accessed via LOAD_LOCAL/STORE_LOCAL with frame-relative offsets
- **Stack cleanup**: Caller's responsibility (for now)

### Limitations

- Fixed 16 slots per frame (could be dynamic in a more advanced VM)
- No parameter passing via locals (parameters come from stack)
- No return value in locals (return value on stack)
- Frame cleanup is automatic (memory is reused, not explicitly cleared)

These limitations are fine for Episode 5. More advanced features will come in later episodes!

---

## Additional Resources

- **Call Stack**: The data structure that tracks active function calls
- **Stack Frame**: A single entry in the call stack, containing return address, stack pointer, and frame base
- **Frame-Relative Addressing**: Accessing local variables relative to the current frame's base address
- **Recursion**: A function calling itself, requiring proper stack frame isolation
- **Calling Convention**: The agreed-upon way to pass parameters and return values

---

## Episode Checklist

- [x] Implement CALL opcode
- [x] Implement RET opcode
- [x] Add call stack data structure
- [x] Add frame base to call frames
- [x] Implement LOAD_LOCAL opcode
- [x] Implement STORE_LOCAL opcode
- [x] Create simple function demo
- [x] Create recursive Fibonacci demo
- [x] Create recursive Factorial demo
- [x] Add call stack visualization
- [x] Add stack visualization
- [x] Write comprehensive lesson script
- [x] Test all demos
- [x] Verify recursion works correctly

---

**End of Episode 5 Script**
