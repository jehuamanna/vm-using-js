# Episode 8: Code Walkthrough Script
## Line-by-Line Explanation

---

## Part 1: Switch-Based Interpreter (Lines 14-158)

**[00:00] Introduction**
"Let's start by examining the switch-based interpreter. This is our baseline implementation that uses a traditional switch statement."

### Class Declaration (Lines 14-18)

**Line 14-17:**
```typescript
/**
 * Switch-based interpreter (current implementation)
 * Simple but slower due to switch overhead
 */
```
**Narration:** "First, we have a comment explaining this is the switch-based approach. It's simple but has overhead from the switch statement evaluation."

**Line 18:**
```typescript
export class SwitchInterpreter extends TinyVM {
```
**Narration:** "We export a class called `SwitchInterpreter` that extends our base `TinyVM` class. This means it inherits all the VM functionality—stack, memory, input queue, and so on."

### Execute Method Setup (Lines 19-24)

**Line 19:**
```typescript
execute(bytecode: number[], debugMode: boolean = false): number[] {
```
**Narration:** "The `execute` method takes bytecode as an array of numbers, an optional debug mode flag, and returns an array of output values."

**Line 20:**
```typescript
this.pc = 0
```
**Narration:** "Initialize the program counter to zero. This tracks which instruction we're currently executing."

**Line 21:**
```typescript
this.running = true
```
**Narration:** "Set the running flag to true. This controls our main execution loop."

**Line 22:**
```typescript
this.output = []
```
**Narration:** "Initialize an empty output array. This will collect all values printed during execution."

**Line 23:**
```typescript
this.debugMode = debugMode
```
**Narration:** "Store the debug mode setting. If enabled, we'll record execution steps."

**Line 24:**
```typescript
this.executionTrace = []
```
**Narration:** "Initialize the execution trace array. This stores each step when debug mode is on."

### Main Execution Loop (Lines 26-35)

**Line 26:**
```typescript
while (this.running && this.pc < bytecode.length) {
```
**Narration:** "Our main loop continues while the VM is running and we haven't reached the end of the bytecode. This is the heart of our interpreter."

**Line 27:**
```typescript
const opcode = bytecode[this.pc]
```
**Narration:** "Read the current opcode from the bytecode array at the program counter position. This is the instruction we're about to execute."

**Lines 29-35:**
```typescript
if (this.debugMode) {
  const step = this.createExecutionStep(opcode)
  this.executionTrace.push(step)
  if (this.stepCallback) {
    this.stepCallback(step)
  }
}
```
**Narration:** "If debug mode is enabled, we create an execution step object that captures the current state—program counter, opcode, stack, and so on. We add it to the trace and call the callback if one is registered."

### Switch Statement (Lines 37-148)

**Line 37:**
```typescript
try {
```
**Narration:** "We wrap the switch statement in a try-catch block to handle any errors that occur during execution."

**Line 38:**
```typescript
switch (opcode) {
```
**Narration:** "Here's the switch statement. The JavaScript engine evaluates the opcode value and jumps to the matching case. This evaluation has overhead—it's what makes this approach slower than alternatives."

**Lines 39-43: PUSH Opcode**
```typescript
case OPCODES.PUSH:
  this.pc++
  this.push(bytecode[this.pc])
  this.pc++
  break
```
**Narration:** "For PUSH, we first increment the program counter to skip past the opcode itself. Then we read the value from the next bytecode position and push it onto the stack. Finally, we increment the PC again to move past the value, and break to exit the switch."

**Lines 44-47: ADD Opcode**
```typescript
case OPCODES.ADD:
  this.push(this.pop() + this.pop())
  this.pc++
  break
```
**Narration:** "ADD pops two values from the stack, adds them together, and pushes the result back. Notice we pop twice—the right operand first, then the left. This is because the stack is LIFO—Last In, First Out."

**Lines 48-53: SUB Opcode**
```typescript
case OPCODES.SUB:
  const subB = this.pop()
  const subA = this.pop()
  this.push(subA - subB)
  this.pc++
  break
```
**Narration:** "SUB is similar, but we need to be careful about operand order. We pop the second value first, then the first value, and subtract second from first. This ensures we get the correct result: first minus second."

**Lines 54-57: MUL Opcode**
```typescript
case OPCODES.MUL:
  this.push(this.pop() * this.pop())
  this.pc++
  break
```
**Narration:** "MUL multiplies the top two stack values. Since multiplication is commutative, order doesn't matter here."

**Lines 58-61: PRINT Opcode**
```typescript
case OPCODES.PRINT:
  this.output.push(this.pop())
  this.pc++
  break
```
**Narration:** "PRINT pops a value from the stack and adds it to our output array. This is how we collect results."

**Lines 62-65: JMP Opcode**
```typescript
case OPCODES.JMP:
  this.pc++
  this.pc = bytecode[this.pc]
  break
```
**Narration:** "JMP is an unconditional jump. We increment PC to read the jump address, then set PC directly to that address. This breaks sequential execution and jumps to a different part of the program."

**Lines 66-74: JMP_IF_ZERO Opcode**
```typescript
case OPCODES.JMP_IF_ZERO:
  this.pc++
  const zeroAddr = bytecode[this.pc]
  if (this.pop() === 0) {
    this.pc = zeroAddr
  } else {
    this.pc++
  }
  break
```
**Narration:** "JMP_IF_ZERO is a conditional jump. We read the jump address, then pop a value from the stack. If it's zero, we jump to that address. Otherwise, we just increment PC to continue normally."

**Lines 75-83: JMP_IF_NEG Opcode**
```typescript
case OPCODES.JMP_IF_NEG:
  this.pc++
  const negAddr = bytecode[this.pc]
  if (this.pop() < 0) {
    this.pc = negAddr
  } else {
    this.pc++
  }
  break
```
**Narration:** "JMP_IF_NEG works similarly, but checks if the value is negative instead of zero."

**Lines 84-88: LOAD Opcode**
```typescript
case OPCODES.LOAD:
  this.pc++
  this.push(this.memory[bytecode[this.pc]])
  this.pc++
  break
```
**Narration:** "LOAD reads from memory. We increment PC to get the memory address, then push the value stored at that address onto the stack."

**Lines 89-93: STORE Opcode**
```typescript
case OPCODES.STORE:
  this.pc++
  this.memory[bytecode[this.pc]] = this.pop()
  this.pc++
  break
```
**Narration:** "STORE writes to memory. We get the address, pop a value from the stack, and store it at that memory location."

**Lines 94-100: READ Opcode**
```typescript
case OPCODES.READ:
  if (this.inputQueue.length === 0) {
    throw new Error('No input available')
  }
  this.push(this.inputQueue.shift()!)
  this.pc++
  break
```
**Narration:** "READ gets input from the input queue. We check if there's input available, and if not, throw an error. Otherwise, we shift a value from the queue and push it onto the stack."

**Lines 101-112: CALL Opcode**
```typescript
case OPCODES.CALL:
  this.pc++
  const callAddr = bytecode[this.pc]
  const returnAddr = this.pc + 1
  const frameBase = this.callStack.length * 16
  this.callStack.push({
    returnAddress: returnAddr,
    stackPointer: this.stack.length,
    frameBase: frameBase
  })
  this.pc = callAddr
  break
```
**Narration:** "CALL invokes a function. We read the function address, calculate the return address—that's the next instruction after the CALL and its operand. We create a new stack frame with the return address, current stack pointer, and a frame base for local variables. Each frame gets 16 local variable slots. Then we jump to the function address."

**Lines 113-119: RET Opcode**
```typescript
case OPCODES.RET:
  if (this.callStack.length === 0) {
    throw new Error('RET called but call stack is empty')
  }
  const frame = this.callStack.pop()!
  this.pc = frame.returnAddress
  break
```
**Narration:** "RET returns from a function. We check that there's a frame on the call stack, pop it, and jump back to the return address."

**Lines 120-130: LOAD_LOCAL Opcode**
```typescript
case OPCODES.LOAD_LOCAL:
  this.pc++
  const localOffset = bytecode[this.pc]
  if (this.callStack.length === 0) {
    throw new Error('LOAD_LOCAL called but no active function frame')
  }
  const currentFrame = this.callStack[this.callStack.length - 1]
  const localAddr = currentFrame.frameBase + localOffset
  this.push(this.memory[localAddr])
  this.pc++
  break
```
**Narration:** "LOAD_LOCAL reads a local variable. We get the offset, find the current frame, calculate the actual memory address by adding the frame base to the offset, and push that value onto the stack."

**Lines 131-141: STORE_LOCAL Opcode**
```typescript
case OPCODES.STORE_LOCAL:
  this.pc++
  const storeLocalOffset = bytecode[this.pc]
  if (this.callStack.length === 0) {
    throw new Error('STORE_LOCAL called but no active function frame')
  }
  const currentFrame2 = this.callStack[this.callStack.length - 1]
  const storeLocalAddr = currentFrame2.frameBase + storeLocalOffset
  this.memory[storeLocalAddr] = this.pop()
  this.pc++
  break
```
**Narration:** "STORE_LOCAL writes to a local variable. Similar to LOAD_LOCAL, but we pop a value from the stack and store it at the calculated address."

**Lines 142-145: HALT Opcode**
```typescript
case OPCODES.HALT:
  this.running = false
  this.pc++
  break
```
**Narration:** "HALT stops execution by setting the running flag to false. This will cause the while loop to exit."

**Lines 146-148: Default Case**
```typescript
default:
  throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`)
```
**Narration:** "If we encounter an opcode that doesn't match any case, we throw an error. This helps catch bugs in our bytecode."

**Lines 149-153: Error Handling**
```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const opcodeName = this.getOpcodeName(opcode)
  throw new Error(`Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`)
}
```
**Narration:** "If any error occurs during execution, we catch it, extract the error message, get the opcode name for context, and throw a new error with full context—where it happened and what instruction caused it."

**Line 156:**
```typescript
return this.output
```
**Narration:** "Finally, we return the output array containing all printed values."

---

## Part 2: Dispatch Table Interpreter (Lines 160-335)

**[05:00] Introduction to Dispatch Table**
"Now let's look at the dispatch table interpreter. This uses function pointers instead of a switch statement."

### Class Declaration (Lines 160-170)

**Line 164:**
```typescript
export class DispatchTableInterpreter extends TinyVM {
```
**Narration:** "Same as before, we extend TinyVM to inherit all the base functionality."

**Line 165:**
```typescript
private handlers: Map<number, () => void> = new Map()
```
**Narration:** "Here's the key difference! We have a Map that stores opcode numbers as keys and handler functions as values. This is our dispatch table—a lookup table of function pointers."

**Lines 167-170:**
```typescript
constructor(memorySize: number = 256) {
  super(memorySize)
  this.setupHandlers()
}
```
**Narration:** "In the constructor, we call the parent constructor and then set up all our handler functions. This happens once when the interpreter is created."

### Setup Handlers (Lines 172-293)

**Line 172:**
```typescript
private setupHandlers() {
```
**Narration:** "This method registers all opcode handlers in our dispatch table."

**Lines 173-177: PUSH Handler**
```typescript
this.handlers.set(OPCODES.PUSH, () => {
  this.pc++
  this.push(this.bytecode![this.pc])
  this.pc++
})
```
**Narration:** "We register the PUSH handler. Notice it's an arrow function that does the same thing as the switch case, but it's stored as a function reference. The `this.bytecode!` uses the non-null assertion operator because we know bytecode will be set before execution."

**Lines 179-182: ADD Handler**
```typescript
this.handlers.set(OPCODES.ADD, () => {
  this.push(this.pop() + this.pop())
  this.pc++
})
```
**Narration:** "ADD handler—same logic, but as a function. Notice how clean this is—no case labels, no breaks."

**Lines 184-189: SUB Handler**
```typescript
this.handlers.set(OPCODES.SUB, () => {
  const b = this.pop()
  const a = this.pop()
  this.push(a - b)
  this.pc++
})
```
**Narration:** "SUB handler with proper operand ordering."

**Lines 191-194: MUL Handler**
```typescript
this.handlers.set(OPCODES.MUL, () => {
  this.push(this.pop() * this.pop())
  this.pc++
})
```
**Narration:** "MUL handler—straightforward multiplication."

**Lines 196-199: PRINT Handler**
```typescript
this.handlers.set(OPCODES.PRINT, () => {
  this.output.push(this.pop())
  this.pc++
})
```
**Narration:** "PRINT handler adds to output array."

**Lines 201-204: JMP Handler**
```typescript
this.handlers.set(OPCODES.JMP, () => {
  this.pc++
  this.pc = this.bytecode![this.pc]
})
```
**Narration:** "JMP handler performs unconditional jump."

**Lines 206-214: JMP_IF_ZERO Handler**
```typescript
this.handlers.set(OPCODES.JMP_IF_ZERO, () => {
  this.pc++
  const addr = this.bytecode![this.pc]
  if (this.pop() === 0) {
    this.pc = addr
  } else {
    this.pc++
  }
})
```
**Narration:** "JMP_IF_ZERO with conditional logic."

**Lines 216-224: JMP_IF_NEG Handler**
```typescript
this.handlers.set(OPCODES.JMP_IF_NEG, () => {
  this.pc++
  const addr = this.bytecode![this.pc]
  if (this.pop() < 0) {
    this.pc = addr
  } else {
    this.pc++
  }
})
```
**Narration:** "JMP_IF_NEG checks for negative values."

**Lines 226-230: LOAD Handler**
```typescript
this.handlers.set(OPCODES.LOAD, () => {
  this.pc++
  this.push(this.memory[this.bytecode![this.pc]])
  this.pc++
})
```
**Narration:** "LOAD reads from memory."

**Lines 232-236: STORE Handler**
```typescript
this.handlers.set(OPCODES.STORE, () => {
  this.pc++
  this.memory[this.bytecode![this.pc]] = this.pop()
  this.pc++
})
```
**Narration:** "STORE writes to memory."

**Lines 238-244: READ Handler**
```typescript
this.handlers.set(OPCODES.READ, () => {
  if (this.inputQueue.length === 0) {
    throw new Error('No input available')
  }
  this.push(this.inputQueue.shift()!)
  this.pc++
})
```
**Narration:** "READ gets input from queue with error checking."

**Lines 246-257: CALL Handler**
```typescript
this.handlers.set(OPCODES.CALL, () => {
  this.pc++
  const callAddr = this.bytecode![this.pc]
  const returnAddr = this.pc + 1
  const frameBase = this.callStack.length * 16
  this.callStack.push({
    returnAddress: returnAddr,
    stackPointer: this.stack.length,
    frameBase: frameBase
  })
  this.pc = callAddr
})
```
**Narration:** "CALL creates a new stack frame and jumps to the function."

**Lines 259-265: RET Handler**
```typescript
this.handlers.set(OPCODES.RET, () => {
  if (this.callStack.length === 0) {
    throw new Error('RET called but call stack is empty')
  }
  const frame = this.callStack.pop()!
  this.pc = frame.returnAddress
})
```
**Narration:** "RET pops the frame and returns."

**Lines 267-276: LOAD_LOCAL Handler**
```typescript
this.handlers.set(OPCODES.LOAD_LOCAL, () => {
  this.pc++
  const offset = this.bytecode![this.pc]
  if (this.callStack.length === 0) {
    throw new Error('LOAD_LOCAL called but no active function frame')
  }
  const frame = this.callStack[this.callStack.length - 1]
  this.push(this.memory[frame.frameBase + offset])
  this.pc++
})
```
**Narration:** "LOAD_LOCAL reads from frame-relative local variable."

**Lines 278-287: STORE_LOCAL Handler**
```typescript
this.handlers.set(OPCODES.STORE_LOCAL, () => {
  this.pc++
  const offset = this.bytecode![this.pc]
  if (this.callStack.length === 0) {
    throw new Error('STORE_LOCAL called but no active function frame')
  }
  const frame = this.callStack[this.callStack.length - 1]
  this.memory[frame.frameBase + offset] = this.pop()
  this.pc++
})
```
**Narration:** "STORE_LOCAL writes to frame-relative local variable."

**Lines 289-292: HALT Handler**
```typescript
this.handlers.set(OPCODES.HALT, () => {
  this.running = false
  this.pc++
})
```
**Narration:** "HALT stops execution."

### Execute Method (Lines 297-335)

**Line 295:**
```typescript
private bytecode?: number[]
```
**Narration:** "We store the bytecode as an instance variable so handlers can access it."

**Line 297:**
```typescript
execute(bytecode: number[], debugMode: boolean = false): number[] {
```
**Narration:** "Same signature as the switch-based interpreter."

**Line 298:**
```typescript
this.bytecode = bytecode
```
**Narration:** "Store the bytecode so handlers can access it."

**Lines 299-303:**
```typescript
this.pc = 0
this.running = true
this.output = []
this.debugMode = debugMode
this.executionTrace = []
```
**Narration:** "Same initialization as before."

**Line 305:**
```typescript
while (this.running && this.pc < bytecode.length) {
```
**Narration:** "Same main loop."

**Line 306:**
```typescript
const opcode = bytecode[this.pc]
```
**Narration:** "Read the opcode."

**Lines 308-314:**
```typescript
if (this.debugMode) {
  const step = this.createExecutionStep(opcode)
  this.executionTrace.push(step)
  if (this.stepCallback) {
    this.stepCallback(step)
  }
}
```
**Narration:** "Same debug mode handling."

**Lines 316-325:**
```typescript
try {
  const handler = this.handlers.get(opcode)
  if (!handler) {
    throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`)
  }
  handler()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const opcodeName = this.getOpcodeName(opcode)
  throw new Error(`Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`)
}
```
**Narration:** "Here's the key difference! Instead of a switch statement, we look up the handler in our Map using `get()`. If found, we call it directly. This is a direct function call—no switch evaluation, no case matching. The JavaScript engine can optimize this better, which is why it's potentially faster."

**Line 327:**
```typescript
return this.output
```
**Narration:** "Return the output."

---

## Part 3: Benchmark Function (Lines 338-365)

**[10:00] Benchmarking**
"Now let's look at how we benchmark these interpreters."

**Line 338:**
```typescript
export function benchmarkInterpreter(
```
**Narration:** "We export a function that benchmarks any interpreter."

**Lines 339-342:**
```typescript
interpreter: TinyVM,
bytecode: number[],
iterations: number = 1000
): InterpreterResult {
```
**Narration:** "It takes an interpreter instance, bytecode to run, and a number of iterations. By default, we run 1000 times to get accurate timing measurements."

**Line 343:**
```typescript
const startTime = performance.now()
```
**Narration:** "We use `performance.now()` to get high-resolution timing. This gives us millisecond precision."

**Line 344:**
```typescript
let instructionsExecuted = 0
```
**Narration:** "Track how many instructions we execute. This is a rough estimate based on bytecode length."

**Line 345:**
```typescript
let lastOutput: number[] = []
```
**Narration:** "Store the last output so we can return it. This ensures the benchmark actually runs the code."

**Line 347:**
```typescript
for (let i = 0; i < iterations; i++) {
```
**Narration:** "Loop for the specified number of iterations. More iterations give more accurate timing but take longer."

**Line 348:**
```typescript
interpreter.reset()
```
**Narration:** "Reset the interpreter state before each run. This ensures each iteration starts fresh."

**Lines 349-354:**
```typescript
try {
  lastOutput = interpreter.execute(bytecode, false)
  instructionsExecuted += bytecode.length
} catch (error) {
  // Ignore errors for benchmarking
}
```
**Narration:** "Execute the bytecode and capture the output. We estimate instructions executed by adding the bytecode length. If there's an error, we ignore it—we're just measuring performance, not correctness."

**Line 357:**
```typescript
const endTime = performance.now()
```
**Narration:** "Capture the end time."

**Line 358:**
```typescript
const executionTime = endTime - startTime
```
**Narration:** "Calculate the total execution time in milliseconds."

**Lines 360-364:**
```typescript
return {
  output: lastOutput,
  executionTime,
  instructionsExecuted
}
```
**Narration:** "Return an object with the output, execution time, and instruction count. This lets us compare interpreters and calculate throughput—instructions per second."

---

## Summary

**[12:00] Key Differences**

**Narration:** "So what's the difference between these two approaches?

**Switch-based:**
- Uses a switch statement
- JavaScript engine must evaluate the switch
- Each case requires a break statement
- More overhead from switch evaluation

**Dispatch table:**
- Uses a Map lookup
- Direct function call after lookup
- No switch evaluation overhead
- JavaScript engines optimize function calls well
- Potentially faster, especially with many opcodes

The dispatch table approach can be faster because:
1. Map lookup is optimized by JavaScript engines
2. Direct function calls are easier for branch prediction
3. No switch statement evaluation overhead

However, performance varies by JavaScript engine, CPU, and program characteristics. Sometimes the switch might actually be faster due to engine optimizations!

This is why real VMs use sophisticated techniques like JIT compilation—they can optimize based on actual runtime behavior."

---

**End of Code Walkthrough**

