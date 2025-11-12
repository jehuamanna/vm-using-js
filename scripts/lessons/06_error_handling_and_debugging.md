# Episode 6: Error Handling & Debugging

## Overview
In this episode, we're adding robust error handling and debugging capabilities to our virtual machine. This is crucial for developing and testing programs—we need to know what went wrong and where! We'll implement enhanced error messages, stack overflow protection, execution tracing, and a debug mode that lets us step through programs instruction by instruction.

**Duration:** ~20-25 minutes  
**Learning Goals:**
- Understand error handling in virtual machines
- Implement stack overflow detection
- Add enhanced error messages with context
- Build execution tracing and debug mode
- Step through programs for debugging

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction

**On Screen:** Title card, Episode 5 recap, Episode 6 title

**Narration:**
"Hey everyone! Welcome to Episode 6. So far, our VM can execute programs, handle functions, and do recursion. But what happens when something goes wrong? 

Right now, if there's an error, we just get a generic message. That's not very helpful! Today, we're adding proper error handling and debugging tools to make our VM production-ready.

We'll cover:
- Enhanced error messages with context
- Stack overflow protection
- Execution tracing
- Debug mode for step-by-step debugging

Let's dive in!"

---

### [02:00 - 06:00] The Problem: Why We Need Error Handling

**On Screen:** Code showing errors without context vs with context

**Narration:**
"When you're writing programs, things go wrong. Maybe you try to pop from an empty stack, or jump to an invalid address, or use an unknown opcode. 

Right now, our VM throws errors, but they don't tell us much:
- 'Stack underflow' - but where? Which instruction?
- 'Invalid jump address' - but what was the address? What instruction caused it?

We need **context** in our error messages. We need to know:
- **Where** the error occurred (program counter)
- **What** instruction caused it (opcode name)
- **Why** it failed (detailed error message)

This is exactly what we'll implement today!"

---

### [06:00 - 12:00] Enhanced Error Handling

**On Screen:** Code walkthrough of error handling implementation

**Narration:**
"Let's enhance our error handling. First, we'll add a helper method to get opcode names for better error messages:

```typescript
private getOpcodeName(opcode: number): string {
  const entries = Object.entries(OPCODES);
  const entry = entries.find(([_, value]) => value === opcode);
  return entry ? entry[0] : `UNKNOWN(0x${opcode.toString(16)})`;
}
```

This converts opcode numbers to readable names like 'ADD', 'PUSH', etc.

### Stack Overflow Protection

We also need to protect against stack overflow. Let's add a maximum stack size:

```typescript
maxStackSize: number = 1000; // Stack overflow protection

push(value: number): void {
  if (this.stack.length >= this.maxStackSize) {
    throw new Error(`Stack overflow: stack size (${this.stack.length}) exceeds maximum (${this.maxStackSize})`);
  }
  this.stack.push(value);
}
```

### Enhanced Error Messages

Now let's wrap our execution in a try-catch to add context:

```typescript
try {
  switch (opcode) {
    // ... all our opcodes
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const opcodeName = this.getOpcodeName(opcode);
  const enhancedError = `Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`;
  throw new Error(enhancedError);
}
```

Now when an error occurs, we get messages like:
- 'Error at PC=5 (ADD): Stack underflow: attempted to pop from empty stack'
- 'Error at PC=10 (JMP): Invalid jump address: 999'

Much more helpful!"

---

### [12:00 - 18:00] Debug Mode & Execution Tracing

**On Screen:** Demo showing debug mode in action

**Narration:**
"Now for the fun part: **debug mode**! This lets us trace execution step-by-step.

### Execution Step Interface

First, we define what information we want to capture:

```typescript
export interface ExecutionStep {
  pc: number;
  opcode: number;
  opcodeName: string;
  stack: number[];
  callStackDepth: number;
  error?: string;
}
```

Each step captures:
- **PC**: Program counter (where we are)
- **Opcode**: The instruction being executed
- **Opcode name**: Human-readable name
- **Stack**: Current stack state
- **Call stack depth**: How deep in function calls we are
- **Error**: Optional error message

### Recording Execution Steps

In debug mode, we record each step:

```typescript
execute(bytecode: number[], debugMode: boolean = false): number[] {
  this.debugMode = debugMode;
  this.executionTrace = [];
  
  while (this.running && this.pc < bytecode.length) {
    const opcode = bytecode[this.pc];
    
    if (this.debugMode) {
      const step = this.createExecutionStep(opcode);
      this.executionTrace.push(step);
      if (this.stepCallback) {
        this.stepCallback(step);
      }
    }
    
    // ... execute instruction
  }
}
```

### Step Callback

We can also provide a callback for real-time debugging:

```typescript
setDebugMode(enabled: boolean, stepCallback?: (step: ExecutionStep) => void): void {
  this.debugMode = enabled;
  this.stepCallback = stepCallback;
}
```

This allows external code to react to each step, perfect for building debuggers!"

---

### [18:00 - 22:00] Demo: Error Handling

**On Screen:** Error handling demos running

**Narration:**
"Let's test our error handling with some demos.

### Demo 1: Stack Underflow

We'll try to execute `ADD` on an empty stack:

```
ADD  // Needs 2 values, but stack is empty
HALT
```

This should give us: 'Error at PC=0 (ADD): Stack underflow: attempted to pop from empty stack'

Perfect! We know exactly where and what went wrong.

### Demo 2: Invalid Opcode

Let's try an unknown opcode:

```
PUSH 5
0xFF  // Invalid opcode
HALT
```

This gives us: 'Error at PC=2 (UNKNOWN(0xff)): Unknown opcode: 0xff at PC=2'

### Demo 3: Invalid Jump

What about an invalid jump address?

```
JMP 999  // Jump to address 999 (doesn't exist)
HALT
```

This gives us: 'Error at PC=0 (JMP): Invalid jump address: 999'

All our errors now have context! This makes debugging so much easier."

---

### [22:00 - 25:00] Demo: Debug Mode & Step-Through

**On Screen:** Debug mode demo, stepping through execution

**Narration:**
"Now let's see debug mode in action. We'll run a simple program:

```
PUSH 5
PUSH 3
ADD
PRINT
HALT
```

When we run this in debug mode, we get a complete execution trace:

```
Step 1: PC=0 PUSH Stack=[]
Step 2: PC=2 PUSH Stack=[5]
Step 3: PC=4 ADD Stack=[5, 3]
Step 4: PC=5 PRINT Stack=[8]
Step 5: PC=6 HALT Stack=[]
```

We can see:
- Each instruction executed
- The program counter at each step
- The stack state after each instruction

### Step-Through Debugging

Even better, we can step through execution one instruction at a time. This is incredibly useful for understanding how programs work or finding bugs.

Watch as we step through:
- Step 1: Push 5 onto stack → Stack: [5]
- Step 2: Push 3 onto stack → Stack: [5, 3]
- Step 3: Add top two values → Stack: [8]
- Step 4: Print the result → Output: 8
- Step 5: Halt → Program ends

This is exactly how real debuggers work!"

---

### [25:00 - 27:00] Key Concepts Recap

**On Screen:** Summary slide

**Narration:**
"Let's recap what we learned:

1. **Enhanced error messages**: Include PC, opcode name, and detailed error
2. **Stack overflow protection**: Prevent stack from growing too large
3. **Execution tracing**: Record every step of execution
4. **Debug mode**: Enable detailed logging and step callbacks
5. **Step-through debugging**: Step through programs instruction by instruction

These tools are essential for developing and debugging programs. They're what make a VM usable in practice!"

---

### [27:00 - 28:00] What's Next?

**On Screen:** Preview of Episode 7

**Narration:**
"We've added error handling and debugging, but there's still more to explore:
- **Bytecode compiler** - Convert human-readable code to bytecode
- **Assembler** - Write programs more easily
- **More optimizations** - Make programs run faster

In the next episode, we'll start building a **bytecode compiler** that can translate high-level code into our bytecode. This is where the real magic happens—we'll be able to write programs in a more natural way!

But for now, we have a robust VM with:
- Full error handling
- Debug mode and execution tracing
- Step-through debugging

That's a solid foundation!"

---

### [28:00 - 29:00] Summary & Outro

**On Screen:** Final summary, subscribe reminder

**Narration:**
"Today we:
- ✅ Enhanced error messages with context (PC, opcode name)
- ✅ Added stack overflow protection
- ✅ Implemented execution tracing
- ✅ Built debug mode with step callbacks
- ✅ Created step-through debugging interface

Error handling and debugging are what separate a toy VM from a production-ready one. With these tools, we can now develop and debug programs effectively.

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. Try out the error demos and debug mode yourself. See you in the next episode!"

---

## Demo Notes

### Visual Elements

**Error Handling Demos:**
- Show three error scenarios
- Display enhanced error messages with context
- Highlight PC and opcode name in errors
- Show stack state when error occurs

**Debug Mode Demo:**
- Show execution trace being built
- Display step-by-step execution
- Highlight current step in trace
- Show stack state at each step
- Demonstrate step-forward button

### Code Walkthrough

1. **Show error handling implementation**
   - getOpcodeName() method
   - Enhanced error messages
   - Stack overflow protection

2. **Demonstrate execution tracing**
   - ExecutionStep interface
   - createExecutionStep() method
   - Recording steps in debug mode

3. **Walk through debug mode**
   - Setting up debug mode
   - Running program with tracing
   - Stepping through execution

### Interactive Elements

- Let viewers trigger different error conditions
- Show real-time execution trace
- Allow step-by-step navigation
- Highlight current step in trace
- Show stack state at each step

### Teaching Tips

1. **Emphasize the importance of context**
   - Errors without context are useless
   - PC and opcode name are essential
   - Stack state helps understand what went wrong

2. **Explain debug mode benefits**
   - See exactly what's happening
   - Understand program flow
   - Find bugs more easily

3. **Show real-world parallels**
   - Real debuggers work similarly
   - Step-through is standard in IDEs
   - Execution tracing is used in profilers

---

## Technical Details

### Error Message Format

```
Error at PC=<pc> (<opcodeName>): <original error message>
```

Example:
```
Error at PC=5 (ADD): Stack underflow: attempted to pop from empty stack
```

### Execution Step Structure

```typescript
{
  pc: number,              // Program counter
  opcode: number,          // Opcode value
  opcodeName: string,      // Human-readable name
  stack: number[],         // Stack state snapshot
  callStackDepth: number,  // Depth in call stack
  error?: string           // Optional error message
}
```

### Debug Mode API

```typescript
// Enable debug mode with callback
vm.setDebugMode(true, (step) => {
  console.log('Step:', step);
});

// Execute with debug mode
const results = vm.execute(bytecode, true);

// Get execution trace
const trace = vm.getExecutionTrace();
```

---

## Episode Checklist

- [x] Add enhanced error messages with context
- [x] Implement stack overflow protection
- [x] Add execution tracing
- [x] Implement debug mode
- [x] Add step callback support
- [x] Create error handling demos
- [x] Create debug mode demo
- [x] Add step-through debugging UI
- [x] Write comprehensive lesson script
- [x] Test all error scenarios
- [x] Verify debug mode works correctly

---

**End of Episode 6 Script**

