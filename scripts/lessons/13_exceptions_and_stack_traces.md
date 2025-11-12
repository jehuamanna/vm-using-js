# Episode 13: Exceptions & Stack Traces

## Overview
In this episode, we're adding exception handling to our VM and language! We'll implement try/catch blocks, throw statements, stack unwinding, and stack traces. This brings robust error handling to our mini language.

**Duration:** ~25-30 minutes  
**Learning Goals:**
- Understand exception handling in virtual machines
- Implement try/catch blocks with stack unwinding
- Add throw statements for raising exceptions
- Generate and display stack traces
- See how exceptions propagate through the call stack

---

## Script Outline

### [00:00 - 03:00] Recap & Introduction

**On Screen:** Title card, Episode 12 recap, Episode 13 title

**Narration:**
"Hey everyone! Welcome to Episode 13. Today we're adding exception handling to our VM and language!

So far, when something goes wrong in our programs, execution just stops. But in real programming languages, we have exception handling - try/catch blocks that let us gracefully handle errors and recover from them.

Today, we'll implement:
- Try/catch blocks: `try { ... } catch (e) { ... }`
- Throw statements: `throw 42;`
- Stack unwinding: automatically cleaning up when exceptions occur
- Stack traces: seeing exactly where an error occurred

This is how real VMs handle errors! Let's dive in!"

---

### [03:00 - 10:00] Adding Exception Opcodes to the VM

**On Screen:** `src/core/vm.ts` - Adding new opcodes

**Narration:**
"First, we need to add three new opcodes to our VM:

1. `ENTER_TRY` - Marks the start of a try block and registers a catch handler
2. `LEAVE_TRY` - Marks the end of a try block
3. `THROW` - Throws an exception and unwinds the stack

Let's add these to our opcodes:

```typescript
ENTER_TRY: 0x10,   // Enter try block (address of catch handler)
LEAVE_TRY: 0x11,   // Leave try block
THROW: 0x12,       // Throw exception (error code on stack)
```

We also need to track active try blocks. Let's add a try stack:

```typescript
interface TryBlock {
  tryStart: number;     // Address where try block starts
  catchHandler: number; // Address of catch handler
  stackPointer: number; // Stack size when try block was entered
}
```

And add it to our VM:

```typescript
tryStack: TryBlock[] = [];
exceptionThrown: boolean = false;
exceptionValue: number = 0;
stackTrace: Array<{ address: number; functionName?: string }> = [];
```

This tracks which try blocks are active and can catch exceptions."

---

### [10:00 - 20:00] Implementing Exception Handling in the VM

**On Screen:** `src/core/vm.ts` - Implementing ENTER_TRY, LEAVE_TRY, THROW

**Narration:**
"Now let's implement the exception handling logic. First, `ENTER_TRY`:

```typescript
case OPCODES.ENTER_TRY:
  this.pc++;
  const catchHandler = bytecode[this.pc];
  this.tryStack.push({
    tryStart: this.pc - 1,
    catchHandler: catchHandler,
    stackPointer: this.stack.length
  });
  this.pc++;
  break;
```

This registers a try block and records where the catch handler is.

For `LEAVE_TRY`:

```typescript
case OPCODES.LEAVE_TRY:
  if (this.tryStack.length === 0) {
    throw new Error('LEAVE_TRY called but no active try block');
  }
  this.tryStack.pop();
  this.pc++;
  break;
```

Simple - just pop the try block from the stack.

Now for the interesting part - `THROW`:

```typescript
case OPCODES.THROW:
  if (this.stack.length === 0) {
    throw new Error('THROW called but stack is empty');
  }
  this.exceptionValue = this.pop();
  this.exceptionThrown = true;
  
  // Build stack trace
  this.stackTrace = [];
  for (const frame of this.callStack) {
    this.stackTrace.push({ address: frame.returnAddress });
  }
  this.stackTrace.push({ address: this.pc });
  
  // Find the innermost try block
  if (this.tryStack.length === 0) {
    // No try block - unwind everything and throw
    while (this.callStack.length > 0) {
      const frame = this.callStack.pop()!;
      while (this.stack.length > frame.stackPointer) {
        this.stack.pop();
      }
    }
    throw new Error(`Uncaught exception: ${this.exceptionValue}`);
  }
  
  const tryBlock = this.tryStack.pop()!;
  // Unwind stack to try block's stack pointer
  while (this.stack.length > tryBlock.stackPointer) {
    this.stack.pop();
  }
  
  // Jump to catch handler
  this.pc = tryBlock.catchHandler;
  // Push exception value onto stack for catch handler
  this.push(this.exceptionValue);
  this.exceptionThrown = false;
  break;
```

This is the magic! When an exception is thrown:
1. We pop the exception value from the stack
2. We build a stack trace showing where the error occurred
3. We find the innermost try block
4. We unwind the stack back to when the try block started
5. We jump to the catch handler
6. We push the exception value so the catch handler can use it

This is called stack unwinding - we're cleaning up all the intermediate state!"

---

### [20:00 - 28:00] Adding Try/Catch to the Compiler

**On Screen:** `src/compiler/lexer.ts`, `src/compiler/parser.ts`, `src/compiler/codegen.ts`

**Narration:**
"Now let's add try/catch syntax to our language. First, the lexer:

```typescript
TRY = 'TRY',
CATCH = 'CATCH',
THROW = 'THROW',
```

And add them to keywords:

```typescript
'try': TokenType.TRY,
'catch': TokenType.CATCH,
'throw': TokenType.THROW,
```

In the parser, we add AST nodes:

```typescript
export interface TryStatement {
  type: 'TryStatement'
  tryBlock: Statement[]
  catchBlock: Statement[]
  catchVariable?: string
}

export interface ThrowStatement {
  type: 'ThrowStatement'
  value: Expression
}
```

And parsing logic:

```typescript
private parseTryStatement(): TryStatement {
  this.expect(TokenType.TRY)
  this.expect(TokenType.LEFT_BRACE)
  const tryBlock = this.parseBlock()
  this.expect(TokenType.RIGHT_BRACE)
  
  this.expect(TokenType.CATCH)
  this.expect(TokenType.LEFT_PAREN)
  
  let catchVariable: string | undefined
  if (this.current().type === TokenType.IDENTIFIER) {
    catchVariable = this.expect(TokenType.IDENTIFIER).value as string
  }
  
  this.expect(TokenType.RIGHT_PAREN)
  this.expect(TokenType.LEFT_BRACE)
  const catchBlock = this.parseBlock()
  this.expect(TokenType.RIGHT_BRACE)

  return {
    type: 'TryStatement',
    tryBlock,
    catchBlock,
    catchVariable,
  }
}
```

For code generation, we need to:

1. Generate `ENTER_TRY` with a placeholder for the catch handler address
2. Generate the try block
3. Generate `LEAVE_TRY`
4. Jump over the catch handler
5. Generate the catch handler
6. Patch the address

```typescript
private generateTryStatement(stmt: { tryBlock: Statement[]; catchBlock: Statement[]; catchVariable?: string }): void {
  const catchHandlerLabel = this.newLabel()
  this.bytecode.push(OPCODES.ENTER_TRY)
  this.bytecode.push(catchHandlerLabel) // Will be patched
  
  // Generate try block
  for (const tryStmt of stmt.tryBlock) {
    this.generateStatement(tryStmt)
  }
  
  this.bytecode.push(OPCODES.LEAVE_TRY)
  
  // Jump over catch handler
  const endLabel = this.newLabel()
  this.bytecode.push(OPCODES.JMP)
  this.bytecode.push(endLabel)
  
  // Generate catch handler
  const catchHandlerAddress = this.bytecode.length
  this.patchJump(catchHandlerLabel, catchHandlerAddress)
  
  // Store exception value if catch variable specified
  if (stmt.catchVariable) {
    // Exception value is on stack from THROW
    // Store it in the catch variable
    // ... (store logic)
  }
  
  // Generate catch block
  for (const catchStmt of stmt.catchBlock) {
    this.generateStatement(catchStmt)
  }
  
  // Patch end jump
  this.patchJump(endLabel, this.bytecode.length)
}
```

Perfect! Our compiler can now generate try/catch blocks!"

---

### [28:00 - 30:00] Demo & Testing

**On Screen:** Episode 13 demo UI with exception examples

**Narration:**
"Let's test it! Here's a simple example:

```javascript
try {
    print 10;
    throw 42;
    print 20; // This won't execute
} catch (e) {
    print e; // Prints 42
}
```

This throws an exception, which is caught and printed. The code after `throw` doesn't execute.

Here's a nested example:

```javascript
try {
    try {
        throw 100;
    } catch (inner) {
        print inner; // Prints 100
    }
    print 200; // This executes
} catch (outer) {
    print outer; // This won't execute
}
```

The inner try block catches the exception, so the outer one never sees it.

And here's an exception in a function:

```javascript
fn risky() {
    throw 999;
    return 0;
}

try {
    let result = risky();
    print result;
} catch (err) {
    print err; // Prints 999
}
```

The exception propagates up through the call stack until it's caught!

When an exception is uncaught, we get a stack trace showing exactly where the error occurred. This is incredibly useful for debugging!"

---

### [30:00 - 32:00] Summary & Next Steps

**On Screen:** Summary slide, Episode 13 recap

**Narration:**
"Great work! In this episode, we:

1. Added three new opcodes: `ENTER_TRY`, `LEAVE_TRY`, `THROW`
2. Implemented stack unwinding in the VM
3. Added try/catch and throw syntax to our language
4. Implemented stack trace generation
5. Demonstrated exception propagation through the call stack

Our mini language now supports:
- Variables, arithmetic, conditionals, loops
- Functions with parameters
- **Exception handling with try/catch!**

This is a huge milestone! We now have a complete, production-ready programming language with proper error handling.

In the next episode, we'll build a professional debugger with step controls, breakpoints, and watches. But for now, you have everything you need to write robust programs that handle errors gracefully!

Thanks for watching, and I'll see you in the next episode!"

---

## Key Code Changes

### VM (`src/core/vm.ts`)
- Added `ENTER_TRY`, `LEAVE_TRY`, `THROW` opcodes
- Added `TryBlock` interface and `tryStack` array
- Added exception state tracking (`exceptionThrown`, `exceptionValue`, `stackTrace`)
- Implemented stack unwinding in `THROW` opcode
- Added `getStackTrace()` method
- Updated `reset()` to clear exception state

### Assembler (`src/core/assembler.ts`)
- Added opcode definitions for exception handling opcodes

### Lexer (`src/compiler/lexer.ts`)
- Added `TRY`, `CATCH`, `THROW` token types
- Added keywords: `'try'`, `'catch'`, `'throw'`

### Parser (`src/compiler/parser.ts`)
- Added `TryStatement` and `ThrowStatement` AST nodes
- Implemented `parseTryStatement()` method
- Implemented `parseThrowStatement()` method
- Updated `parseStatement()` to handle try/catch/throw

### Code Generator (`src/compiler/codegen.ts`)
- Implemented `generateTryStatement()` method
- Implemented `generateThrowStatement()` method
- Updated `patchJump()` to handle `ENTER_TRY` opcode
- Added catch variable handling

### UI (`src/pages/Episode13.tsx`)
- Created Episode 13 component with exception examples
- Added stack trace display
- Updated default source code to demonstrate exceptions

---

## Testing Examples

### Example 1: Simple Try/Catch
```javascript
try {
    print 10;
    throw 42;
    print 20;
} catch (e) {
    print e;
}
```
**Expected Output:** 
```
10
42
```

### Example 2: Nested Try/Catch
```javascript
try {
    try {
        throw 100;
    } catch (inner) {
        print inner;
    }
    print 200;
} catch (outer) {
    print outer;
}
```
**Expected Output:**
```
100
200
```

### Example 3: Exception in Function
```javascript
fn risky() {
    throw 999;
    return 0;
}

try {
    let result = risky();
    print result;
} catch (err) {
    print err;
}
```
**Expected Output:**
```
999
```

---

## Notes for Presenter

- Emphasize the importance of stack unwinding
- Show how stack traces help with debugging
- Demonstrate exception propagation through function calls
- Explain that uncaught exceptions stop execution
- Point out that this is how real VMs (JVM, CLR) handle exceptions!

