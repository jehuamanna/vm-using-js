# Episode 14: Debugger Pro

## Overview
In this episode, we're building a professional-grade debugger for our VM! We'll implement step controls (Step Into, Step Over, Step Out), breakpoints, watches, call stack visualization, and exception pausing. This is how real debuggers work in IDEs like VS Code, IntelliJ, and GDB.

**Duration:** ~30-35 minutes  
**Learning Goals:**
- Understand how professional debuggers work
- Implement step-by-step execution controls
- Build a breakpoint system
- Create a watches panel for monitoring variables
- Visualize the call stack and execution state
- Understand the difference between Step Into, Step Over, and Step Out
- See how debuggers pause execution and inspect state

---

## Script Outline

### [00:00 - 05:00] Introduction & Why Debuggers Matter

**On Screen:** Title card, Episode 13 recap, Episode 14 title

**Narration:**
"Hey everyone! Welcome to Episode 14. Today we're building a professional debugger - one of the most important tools in a developer's toolkit!

So far, we've been running programs and seeing the final output. But when something goes wrong, how do we figure out what happened? That's where debuggers come in!

A debugger lets us:
- **Pause execution** at any point
- **Step through code** instruction by instruction
- **Inspect variables** and memory
- **Set breakpoints** to pause at specific locations
- **Watch expressions** to monitor values
- **See the call stack** to understand where we are

This is exactly how debuggers work in VS Code, Chrome DevTools, GDB, and other professional tools. Today, we're building one for our VM!

We'll implement:
1. **Step Controls**: Step Into, Step Over, Step Out, Continue
2. **Breakpoints**: Pause execution at specific addresses
3. **Watches**: Monitor variables and memory locations
4. **Call Stack View**: See the function call hierarchy
5. **Exception Pausing**: Automatically pause when exceptions occur

Let's dive deep into how debuggers work!"

---

### [05:00 - 12:00] Understanding Step Controls

**On Screen:** Diagram showing Step Into vs Step Over vs Step Out

**Narration:**
"Before we code, let's understand the three types of step controls. They're all about controlling how execution proceeds:

**Step Into** - Execute the next instruction, and if it's a function call, step INTO that function. You'll see every instruction, including those inside called functions.

**Step Over** - Execute the next instruction, but if it's a function call, execute the ENTIRE function and pause at the instruction AFTER the call. You skip over the function's internals.

**Step Out** - Execute until the current function RETURNS, then pause. You're stepping OUT of the current function.

Let me show you with an example:

```javascript
let x = 5;           // Line 1
let y = factorial(x); // Line 2 - function call
print y;             // Line 3
```

If you're at line 1 and:
- **Step Into**: Goes to line 2, then INTO factorial()
- **Step Over**: Executes line 2 (including all of factorial), pauses at line 3
- **Step Out**: Only makes sense inside a function - returns to the caller

The key insight: Step Over and Step Out use the **call stack depth** to know when to pause. We track the current call stack depth, and when we step over a function, we remember the depth, execute until we're back at that depth, then pause.

Let's implement this!"

---

### [12:00 - 22:00] Implementing Step Controls in the VM

**On Screen:** `src/core/vm.ts` - Adding step control infrastructure

**Narration:**
"First, we need to add state to track step modes. Let's add these properties to our VM:

```typescript
stepMode: StepMode = 'run';
paused: boolean = false;
stepOverDepth: number = -1; // Call stack depth to step over to
stepOutDepth: number = -1;  // Call stack depth to step out to
```

The `stepMode` can be:
- `'run'` - Normal execution, no pausing
- `'step-into'` - Pause after every instruction
- `'step-over'` - Pause when back at the same call stack depth
- `'step-out'` - Pause when at a shallower call stack depth
- `'paused'` - Currently paused, waiting for user input

Now, let's modify the execute loop to check step modes:

```typescript
// Episode 14: Handle step modes
if (this.debugMode && this.stepMode !== 'run') {
  if (this.stepMode === 'step-into') {
    // Always pause on step-into
    this.paused = true;
    this.stepMode = 'paused';
  } else if (this.stepMode === 'step-over') {
    // Pause if we're back at the same call stack depth
    if (this.callStack.length <= this.stepOverDepth) {
      this.paused = true;
      this.stepMode = 'paused';
      this.stepOverDepth = -1;
    }
  } else if (this.stepMode === 'step-out') {
    // Pause if we've returned to a shallower call stack depth
    if (this.callStack.length < this.stepOutDepth) {
      this.paused = true;
      this.stepMode = 'paused';
      this.stepOutDepth = -1;
    }
  }
  
  if (this.paused) {
    // Create execution step and notify UI
    const step = this.createExecutionStep(opcode);
    this.executionTrace.push(step);
    if (this.stepCallback) {
      this.stepCallback(step);
    }
    return this.output; // Pause execution
  }
}
```

The key is checking the call stack depth. When we step over a function call, we remember the current depth. As we execute, if the depth goes deeper (function calls), we keep going. When it returns to our remembered depth, we pause.

For step out, we remember the current depth and pause when we're at a shallower depth (meaning we've returned).

Now, when we encounter a CALL instruction, we need to handle step-over:

```typescript
case OPCODES.CALL:
  // ... existing call logic ...
  
  // Episode 14: Handle step-over - if stepping over, don't pause in function
  if (this.debugMode && this.stepMode === 'step-over' && this.stepOverDepth === -1) {
    this.stepOverDepth = this.callStack.length - 1;
  }
  
  this.pc = callAddr;
  break;
```

This sets the target depth for step-over. We'll pause when we return to this depth or shallower.

Now let's add the control methods:

```typescript
stepInto(): void {
  if (this.paused) {
    this.paused = false;
    this.stepMode = 'step-into';
    this.stepOverDepth = -1;
    this.stepOutDepth = -1;
  }
}

stepOver(): void {
  if (this.paused) {
    this.paused = false;
    this.stepMode = 'step-over';
    this.stepOverDepth = this.callStack.length;
    this.stepOutDepth = -1;
  }
}

stepOut(): void {
  if (this.paused && this.callStack.length > 0) {
    this.paused = false;
    this.stepMode = 'step-out';
    this.stepOutDepth = this.callStack.length;
    this.stepOverDepth = -1;
  }
}

continue(): void {
  if (this.paused) {
    this.paused = false;
    this.stepMode = 'run';
    this.stepOverDepth = -1;
    this.stepOutDepth = -1;
  }
}
```

These methods set the step mode and clear the paused state. The execute loop will then proceed according to the mode.

One more thing - we need to make execute resumable. Let's add a `resume` parameter:

```typescript
execute(bytecode: number[], debugMode: boolean = false, resume: boolean = false): number[] {
  if (!resume) {
    // Only reset if not resuming
    this.pc = 0;
    this.running = true;
    this.output = [];
    // ... other resets
  }
  // Continue execution from current state
  // ...
}
```

This allows us to call execute multiple times to continue from where we paused. Perfect!"

---

### [22:00 - 30:00] Breakpoints System

**On Screen:** `src/core/vm.ts` - Implementing breakpoints

**Narration:**
"Now let's implement breakpoints - one of the most useful debugging features!

A breakpoint is a marker at a specific address that tells the debugger: 'When execution reaches this address, pause!'

We'll store breakpoints in a Map:

```typescript
breakpoints: Map<number, Breakpoint> = new Map();

interface Breakpoint {
  address: number;
  enabled: boolean;
}
```

The `enabled` flag lets us temporarily disable breakpoints without removing them.

In the execute loop, before executing each instruction, we check for breakpoints:

```typescript
// Episode 14: Check for breakpoints
if (this.debugMode && this.breakpoints.has(this.pc)) {
  const bp = this.breakpoints.get(this.pc)!;
  if (bp.enabled) {
    this.paused = true;
    this.stepMode = 'paused';
    const step = this.createExecutionStep(opcode);
    this.executionTrace.push(step);
    if (this.stepCallback) {
      this.stepCallback(step);
    }
    return this.output; // Pause execution
  }
}
```

This is simple but powerful! Before executing any instruction, we check if there's a breakpoint at the current PC. If there is and it's enabled, we pause.

Now let's add breakpoint management methods:

```typescript
setBreakpoint(address: number, enabled: boolean = true): void {
  this.breakpoints.set(address, { address, enabled });
}

removeBreakpoint(address: number): void {
  this.breakpoints.delete(address);
}

toggleBreakpoint(address: number): void {
  const bp = this.breakpoints.get(address);
  if (bp) {
    bp.enabled = !bp.enabled;
  } else {
    this.setBreakpoint(address, true);
  }
}

getBreakpoints(): Breakpoint[] {
  return Array.from(this.breakpoints.values());
}
```

These methods let the UI add, remove, and toggle breakpoints. The UI can set breakpoints at specific bytecode addresses, and execution will pause when it reaches them.

In a real debugger, breakpoints are usually set on source code lines, and the debugger maps those to bytecode addresses. For now, we're working directly with bytecode addresses, but the concept is the same!"

---

### [30:00 - 38:00] Watches Panel

**On Screen:** `src/core/vm.ts` - Implementing watches

**Narration:**
"Watches let you monitor the value of variables or memory locations as execution proceeds. They're incredibly useful for understanding how values change!

A watch is essentially: 'Show me the value at this memory address or variable name.'

Let's define the Watch interface:

```typescript
interface Watch {
  name: string;
  type: 'variable' | 'memory' | 'expression';
  address?: number;
  expression?: string;
}
```

For now, we'll support variable and memory watches. Expression watches (like `x + y`) would require evaluating expressions, which is more complex.

We store watches in an array:

```typescript
watches: Watch[] = [];
```

And add management methods:

```typescript
addWatch(watch: Watch): void {
  this.watches.push(watch);
}

removeWatch(index: number): void {
  this.watches.splice(index, 1);
}

getWatches(): Watch[] {
  return [...this.watches];
}
```

Now the interesting part - evaluating watches. We need to read the current value:

```typescript
evaluateWatches(): Array<{ watch: Watch; value: number | string }> {
  const results: Array<{ watch: Watch; value: number | string }> = [];
  
  for (const watch of this.watches) {
    try {
      if (watch.type === 'variable' && watch.address !== undefined) {
        // Variable watch - check if it's a local or global
        if (this.callStack.length > 0) {
          // Check if it's a local variable
          const currentFrame = this.callStack[this.callStack.length - 1];
          const localAddr = currentFrame.frameBase + watch.address;
          if (localAddr >= 0 && localAddr < this.memory.length) {
            results.push({ watch, value: this.memory[localAddr] });
            continue;
          }
        }
        // Global variable
        if (watch.address >= 0 && watch.address < this.memory.length) {
          results.push({ watch, value: this.memory[watch.address] });
        } else {
          results.push({ watch, value: 'Invalid address' });
        }
      } else if (watch.type === 'memory' && watch.address !== undefined) {
        // Memory watch - direct memory access
        if (watch.address >= 0 && watch.address < this.memory.length) {
          results.push({ watch, value: this.memory[watch.address] });
        } else {
          results.push({ watch, value: 'Invalid address' });
        }
      }
    } catch (error) {
      results.push({ watch, value: `Error: ${error}` });
    }
  }
  
  return results;
}
```

This method evaluates all watches and returns their current values. For variables, we check if we're in a function and if the address is a local variable (using frame-relative addressing), otherwise we treat it as a global.

The UI can call this method whenever execution pauses to show the current watch values. This gives you a live view of what's happening in memory!"

---

### [38:00 - 42:00] Exception Pausing

**On Screen:** `src/core/vm.ts` - Adding exception pausing

**Narration:**
"One more feature - automatically pausing when exceptions occur. This is incredibly useful for debugging!

When an exception is thrown and there's no catch block, we can pause execution instead of immediately crashing. This lets you inspect the state right when the error occurs.

Let's add a flag:

```typescript
pauseOnException: boolean = true;
```

And in the THROW opcode, when we have an uncaught exception:

```typescript
// Episode 14: Pause on exception if enabled
if (this.debugMode && this.pauseOnException) {
  this.paused = true;
  this.stepMode = 'paused';
  const step = this.createExecutionStep(opcode);
  step.error = `Uncaught exception: ${this.exceptionValue}`;
  this.executionTrace.push(step);
  if (this.stepCallback) {
    this.stepCallback(step);
  }
  return this.output; // Pause instead of throwing
}
```

This pauses execution and includes the exception value in the execution step. The UI can then show the error and let you inspect the state before deciding what to do.

This is exactly how Chrome DevTools pauses on uncaught exceptions!"

---

### [42:00 - 50:00] Building the Debugger UI

**On Screen:** `src/pages/Episode14.tsx` - Building the UI

**Narration:**
"Now let's build the UI! We need several panels:

1. **Debug Controls** - Step Into, Step Over, Step Out, Continue buttons
2. **Current Instruction** - Show PC, opcode, call stack depth
3. **Watches Panel** - Add/remove watches, show current values
4. **Call Stack View** - Show the function call hierarchy
5. **Stack View** - Show the current stack contents
6. **Output** - Program output

Let's start with the debug controls:

```typescript
const stepInto = () => {
  if (!isPaused || !compilationResult) return
  vm.stepInto()
  executeStep()
}

const stepOver = () => {
  if (!isPaused || !compilationResult) return
  vm.stepOver()
  executeStep()
}

const stepOut = () => {
  if (!isPaused || !compilationResult) return
  vm.stepOut()
  executeStep()
}

const continueExecution = () => {
  if (!isPaused || !compilationResult) return
  vm.continue()
  executeStep()
}

const executeStep = () => {
  if (!compilationResult) return
  try {
    vm.execute(compilationResult.bytecode, true, true) // resume = true
    setIsPaused(vm.paused)
    const trace = vm.getExecutionTrace()
    setCurrentStep(trace[trace.length - 1] || null)
    updateOutput()
    
    if (!vm.running) {
      setIsDebugging(false)
      setIsPaused(false)
    }
  } catch (error) {
    // Handle errors
  }
}
```

The key is calling `execute()` with `resume=true` to continue from where we paused. Each step control sets the appropriate mode, then we resume execution.

For watches, we provide a UI to add watches by address:

```typescript
const addWatch = () => {
  const address = parseInt(watchInput.trim())
  const watch: Watch = {
    name: `${watchType}@${address}`,
    type: watchType,
    address: address,
  }
  setWatches([...watches, watch])
  vm.addWatch(watch)
}
```

And we display watch values:

```typescript
{vm.evaluateWatches().map((result, idx) => (
  <div key={idx}>
    <span>{result.watch.name}</span>
    <span>{String(result.value)}</span>
  </div>
))}
```

For the call stack, we show each frame:

```typescript
{vm.callStack.map((frame, idx) => (
  <div key={idx}>
    Frame {vm.callStack.length - idx - 1}: 
    Return @ {frame.returnAddress}, 
    Stack Pointer: {frame.stackPointer}
  </div>
))}
```

This gives you a complete view of where execution is and what the state is. This is exactly how professional debuggers work!"

---

### [50:00 - 55:00] Demo & Testing

**On Screen:** Episode 14 demo UI in action

**Narration:**
"Let's test it! Here's a simple program:

```javascript
fn factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

let x = 5;
let result = factorial(x);
print result;
```

Let's debug it step by step:

1. **Start Debugging** - Execution pauses at the first instruction
2. **Step Over** - We skip over the function definition
3. **Step Into** - We step into the factorial function call
4. **Add Watch** - Watch variable `n` (address 0 in the function)
5. **Step Through** - See how `n` changes with each recursive call
6. **Step Out** - Return from the current function call
7. **Continue** - Run until the next breakpoint or end

As we step, we can see:
- The current instruction (PC, opcode)
- The call stack growing and shrinking
- Watch values updating
- The stack contents changing

This is incredibly powerful! You can see exactly what's happening at each step.

Let's also test breakpoints. Set a breakpoint at a specific address, then click Continue. Execution will pause at that address, letting you inspect the state.

And if an exception occurs, execution automatically pauses, showing you the error and the current state. This makes debugging so much easier!"

---

### [55:00 - 60:00] Deep Dive: How Real Debuggers Work

**On Screen:** Comparison with real debuggers

**Narration:**
"Let's talk about how this compares to real debuggers like GDB, Chrome DevTools, or VS Code.

**Source-Level Debugging**: Real debuggers work with source code, not bytecode. They maintain a mapping between source lines and bytecode addresses. When you set a breakpoint on line 42, the debugger finds the corresponding bytecode address and sets a breakpoint there. We're working directly with bytecode addresses, but the concept is the same.

**Symbol Information**: Real debuggers have symbol tables that map variable names to addresses. When you watch `x`, the debugger looks up `x` in the symbol table to find its address. We're using addresses directly, but a full implementation would include symbol information from the compiler.

**Expression Evaluation**: Professional debuggers can evaluate expressions like `x + y` or `array[0]`. This requires parsing and evaluating expressions in the debugger context. We support simple variable/memory watches, but expression evaluation is a more advanced feature.

**Conditional Breakpoints**: Some debuggers support conditional breakpoints - only pause if `x > 10`. This requires evaluating a condition at each breakpoint. We support simple breakpoints, but conditionals would be a great extension.

**Remote Debugging**: Real debuggers can debug programs running on remote machines. They use a protocol (like the Debug Adapter Protocol) to communicate between the debugger UI and the debuggee. Our debugger is integrated, but the concepts are similar.

**Multi-threaded Debugging**: Real debuggers handle multiple threads, pausing all threads when one hits a breakpoint. Our VM is single-threaded, but the concepts extend to multi-threaded scenarios.

The core concepts we've implemented - step controls, breakpoints, watches, call stack inspection - are exactly what professional debuggers use. We've built a real, working debugger!"

---

### [60:00 - 65:00] Summary & Next Steps

**On Screen:** Summary slide, Episode 14 recap

**Narration:**
"Amazing work! In this episode, we:

1. **Implemented step controls** - Step Into, Step Over, Step Out, Continue
2. **Built a breakpoint system** - Pause execution at specific addresses
3. **Created a watches panel** - Monitor variables and memory locations
4. **Added call stack visualization** - See the function call hierarchy
5. **Implemented exception pausing** - Automatically pause on uncaught exceptions
6. **Built a professional debugger UI** - Complete with all the tools developers expect

Our VM now has:
- A complete programming language with functions, exceptions, and more
- A professional debugger with step controls, breakpoints, and watches
- Stack traces and error handling
- All the tools needed for real development!

This is a huge achievement! We've built a complete, production-ready virtual machine with debugging capabilities that rival professional tools.

The concepts we've covered - step modes, breakpoints, watches, call stack inspection - are exactly what you'll find in GDB, Chrome DevTools, VS Code, and other professional debuggers. Understanding how these work at the VM level gives you deep insight into how all debuggers function.

In the next episode, we'll explore modules and linking - how to split programs into multiple files and link them together. But for now, you have a complete, debuggable virtual machine!

Thanks for watching, and I'll see you in the next episode!"

---

## Key Code Changes

### VM (`src/core/vm.ts`)
- Added `Breakpoint`, `Watch`, and `StepMode` types
- Added debugger state: `breakpoints`, `watches`, `stepMode`, `paused`, `stepOverDepth`, `stepOutDepth`, `pauseOnException`
- Modified `execute()` to support resuming with `resume` parameter
- Added breakpoint checking before each instruction
- Added step mode handling in execute loop
- Updated `CALL` opcode to handle step-over
- Added exception pausing in `THROW` opcode
- Implemented breakpoint management methods: `setBreakpoint()`, `removeBreakpoint()`, `toggleBreakpoint()`, `getBreakpoints()`
- Implemented watch management methods: `addWatch()`, `removeWatch()`, `getWatches()`, `evaluateWatches()`
- Implemented step control methods: `stepInto()`, `stepOver()`, `stepOut()`, `continue()`
- Updated `reset()` to clear debugger state

### UI (`src/pages/Episode14.tsx`)
- Created comprehensive debugger UI with:
  - Debug controls (Step Into, Step Over, Step Out, Continue)
  - Current instruction display
  - Watches panel with add/remove functionality
  - Call stack visualization
  - Stack contents view
  - Output display
  - Disassembly view
- Implemented step execution logic
- Added breakpoint management UI
- Added watch management UI

---

## Testing Examples

### Example 1: Step Through Factorial
```javascript
fn factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

let x = 5;
let result = factorial(x);
print result;
```

**Debugging Steps:**
1. Start debugging - pauses at first instruction
2. Step Over to skip function definition
3. Step Into to enter factorial function
4. Add watch on `n` (local variable address 0)
5. Step through recursive calls, watching `n` decrease
6. Step Out to return from function
7. Continue to finish execution

### Example 2: Breakpoint on Function Call
```javascript
fn add(a, b) {
    return a + b;
}

let x = 5;
let y = 10;
let sum = add(x, y); // Set breakpoint here
print sum;
```

**Debugging Steps:**
1. Set breakpoint at the CALL instruction address
2. Start debugging
3. Execution pauses at breakpoint
4. Inspect variables `x` and `y`
5. Step Into to enter function
6. Step through function body
7. Step Out to return
8. Continue to finish

### Example 3: Exception Pausing
```javascript
fn risky() {
    throw 42;
    return 0;
}

try {
    let result = risky();
} catch (e) {
    print e;
}
```

**Debugging Steps:**
1. Start debugging
2. Step Into risky function
3. When exception is thrown, execution pauses (if pauseOnException enabled)
4. Inspect call stack to see where exception occurred
5. Continue to see exception caught

---

## Advanced Concepts Explained

### Step Over Implementation Details

Step Over works by:
1. When you step over a CALL instruction, we remember the current call stack depth
2. We set `stepMode` to `'step-over'` and `stepOverDepth` to the current depth
3. As execution continues, if the call stack gets deeper (function calls), we keep executing
4. When the call stack returns to our remembered depth (or shallower), we pause
5. This effectively executes the entire function call without stepping into it

### Step Out Implementation Details

Step Out works by:
1. When you step out, we remember the current call stack depth
2. We set `stepMode` to `'step-out'` and `stepOutDepth` to the current depth
3. We execute until the call stack becomes shallower (function returns)
4. When we're at a shallower depth, we pause
5. This executes until the current function returns

### Breakpoint vs Step

- **Breakpoints** are persistent - they stay set until you remove them
- **Step controls** are temporary - they affect only the next instruction(s)
- You can combine them - set a breakpoint, then use step controls when paused

### Watch Evaluation

Watches are evaluated every time execution pauses. The debugger:
1. Iterates through all watches
2. For each watch, determines if it's a local or global variable
3. Calculates the memory address (using frame-relative addressing for locals)
4. Reads the value from memory
5. Returns the current value

This happens synchronously, so watches always show the current state.

---

## Notes for Presenter

- Emphasize that this is how REAL debuggers work - GDB, Chrome DevTools, etc.
- Show the difference between Step Into, Step Over, and Step Out clearly
- Demonstrate breakpoints with a real example
- Show how watches update as you step through code
- Explain the call stack visualization - this is crucial for understanding execution flow
- Point out that this is a complete, production-ready debugger
- Mention that real debuggers add source-level mapping, symbol tables, and expression evaluation, but the core concepts are the same
- This episode is a major milestone - we now have a complete development environment!

