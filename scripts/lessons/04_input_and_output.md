# Episode 4 — Input and Output

## Overview
In this episode, we'll add interactive input to our virtual machine. We'll implement a READ instruction that allows programs to accept user input, making our VM truly interactive!

**Duration:** ~20-25 minutes  
**Learning Goals:**
- Understand input/output in virtual machines
- Implement READ instruction for interactive input
- Build an input queue system
- Create an interactive calculator program
- See how I/O makes programs dynamic and user-driven

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction
**On Screen:** Title card, Episode 3 recap

**Narration:**
"Welcome back to Episode 4! So far, our VM can execute programs, use memory, and control flow. But there's one thing missing: our programs can't interact with users. They're static - they always do the same thing.

Today, we're adding input! We'll implement a READ instruction that lets programs accept values from users, making our VM truly interactive. This opens up a whole new world of possibilities - we can build calculators, interactive programs, and more!"

---

### [02:00 - 06:00] Understanding Input/Output in VMs
**On Screen:** Diagram showing I/O flow

**Narration:**
"Input/Output, or I/O, is how programs communicate with the outside world. In our VM:
- **Output** (PRINT) - we already have this! It sends values from the program to the user.
- **Input** (READ) - this is new! It receives values from the user into the program.

Think of it like a conversation:
- The program asks for input (READ)
- The user provides a value
- The program processes it
- The program shows results (PRINT)

In real systems, I/O can be:
- Keyboard input
- File reading
- Network data
- Sensor readings

For our VM, we'll use a simple input queue - values are added to a queue, and READ pops them off one at a time. This is similar to how many systems handle input buffering."

---

### [06:00 - 10:00] Implementing the Input Queue
**On Screen:** Code editor showing input queue implementation

**Narration:**
"First, we need a way to store input values. We'll use an input queue - a simple array that holds values waiting to be read.

```typescript
inputQueue: number[] = [];

addInput(value: number): void {
  this.inputQueue.push(value);
}
```

When a program needs input, it calls READ. READ pops the first value from the queue and pushes it onto the stack. If the queue is empty, we throw an error - the program is trying to read input that doesn't exist!

This queue-based approach is simple but effective. In a real system, the queue might be filled by:
- User typing on keyboard
- Reading from a file
- Receiving network data
- Reading from sensors

For now, we'll manually add values to the queue before running programs."

---

### [10:00 - 14:00] Implementing READ Instruction
**On Screen:** Code editor showing READ implementation

**Narration:**
"Now let's implement the READ instruction. READ is simple:
1. Check if there's input available in the queue
2. If yes, pop the first value
3. Push it onto the stack
4. Continue execution

[Show code implementation]

```typescript
case OPCODES.READ:
  if (this.inputQueue.length === 0) {
    throw new Error('No input available');
  }
  const inputValue = this.inputQueue.shift()!;
  this.push(inputValue);
  this.pc++;
  break;
```

Notice we check if the queue is empty. This prevents the program from hanging or crashing if it tries to read more input than is available. In a real system, READ might block and wait for input, but for simplicity, we'll throw an error.

READ consumes a value from the input queue - once read, it's gone. If you need to use the same input multiple times, you'd need to store it in memory first!"

---

### [14:00 - 18:00] Demo: Reading Two Inputs
**On Screen:** Demo showing two inputs being read

**Narration:"
"Let's see READ in action! We'll read two numbers and add them together:

```
READ    // Read first number
READ    // Read second number
ADD     // Add them
PRINT   // Show result
HALT
```

[Show the demo with input fields]

Before running, we add two values to the input queue: 5 and 3. When the program executes:
1. First READ pops 5 and pushes it onto the stack
2. Second READ pops 3 and pushes it onto the stack
3. ADD pops both, adds them, pushes 8
4. PRINT shows 8

This is interactive! We can change the input values and get different results. This is the power of I/O - programs become dynamic and user-driven."

---

### [18:00 - 22:00] Demo: Interactive Calculator
**On Screen:** Demo showing calculator

**Narration:"
"Now let's build something more interesting - a calculator! We'll calculate (input * 2) + 5:

```
READ    // Read input value
PUSH 2  // Push 2
MUL     // Multiply input by 2
PUSH 5  // Push 5
ADD     // Add 5
PRINT   // Show result
HALT
```

[Show the calculator demo]

This demonstrates how input makes programs flexible. The same program can work with any input value! We can:
- Enter 10 → get 25 (10*2 + 5)
- Enter 0 → get 5 (0*2 + 5)
- Enter -3 → get -1 (-3*2 + 5)

This is the foundation of interactive programming. Real programs use input for:
- User preferences
- Configuration
- Data processing
- Interactive games
- Command-line tools"

---

### [22:00 - 25:00] Input Queue Management
**On Screen:** Code showing input queue lifecycle

**Narration:"
"Let's talk about managing the input queue. When should we clear it?

- **Before each program run**: We reset the queue so old input doesn't interfere
- **After reading**: Values are consumed, so they're automatically removed
- **On VM reset**: The queue is cleared along with stack and memory

This ensures each program run starts with a clean slate. In a real system, input might come from:
- Standard input (stdin)
- Files
- Network sockets
- Event handlers

Our simple queue is a good starting point. As we build more features, we might add:
- Input validation
- Type checking
- Non-blocking I/O
- Input buffering"

---

### [25:00 - 27:00] Summary & Next Episode
**On Screen:** Summary slide

**Narration:"
"Excellent! We've added input to our VM. Today we learned:
- How input/output works in virtual machines
- Implementing an input queue
- The READ instruction for interactive input
- Building interactive programs like calculators
- Managing input queue lifecycle

Our VM is now interactive! Programs can accept user input and respond dynamically.

In the next episode, we'll add functions and the call stack. This will let us organize code into reusable functions, support recursion, and build more complex programs. We'll implement CALL and RET instructions for function calls and returns.

The code for this episode is in the repository. Try building your own interactive programs!

Thanks for watching, and I'll see you in Episode 5!"

---

## Demo Notes

### Visual Elements to Show:
1. **Input Fields**: Show number inputs for user interaction
2. **Input Queue Visualization**: Show values in the queue before execution
3. **Stack Visualization**: Show values being pushed from READ
4. **Output Display**: Show results with input values displayed

### Interactive Elements:
- Number input fields for entering values
- Buttons to run programs
- Real-time stack visualization
- Output showing both inputs and results

---

## Code Files Created/Modified
- `src/core/vm.ts` - Added READ opcode and input queue
- `src/pages/Episode04.tsx` - Interactive demo page with input fields
- `src/components/ui/input.tsx` - Input component
- `src/components/ui/label.tsx` - Label component

---

## Key Concepts Introduced
- Input/Output (I/O)
- Input Queue
- READ Instruction
- Interactive Programming
- Input Queue Management
- User-Driven Programs

---

## Technical Notes
- Input queue is a simple array
- READ consumes values from the queue (FIFO)
- Queue is cleared on VM reset
- Error thrown if READ is called with empty queue
- Input values are added before program execution

---

## Next Episode Teaser
Episode 5 will add functions and the call stack with CALL and RET instructions. This will enable code organization, reusability, and recursion - essential features for building complex programs!

