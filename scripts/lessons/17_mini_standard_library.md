# Episode 17: Mini Standard Library

## Introduction

Welcome back! In this episode, we're building a standard library for our virtual machine. We'll add builtin functions for common operations like math, array manipulation, string handling, and I/O. These builtins will be implemented as native VM operations, making them fast and efficient.

## What We're Building

Today we'll add:
1. **Builtin Function System**: A way to call native functions from our language
2. **std.math**: Mathematical operations (abs, min, max, sqrt, pow)
3. **std.array**: Array utilities (length, push, pop, slice)
4. **std.str**: String operations (length, concat, charAt, substring)
5. **std.io**: I/O operations (readLine, write)

## Why Builtins?

Builtin functions are implemented directly in the VM, not as bytecode. This gives us several advantages:
- **Performance**: No function call overhead
- **Access to VM internals**: Can directly manipulate heap, stack, etc.
- **Native operations**: Can use JavaScript's built-in functions for complex operations

## The CALL_BUILTIN Opcode

First, let's add a new opcode for calling builtin functions:

```typescript
CALL_BUILTIN: 0x1B, // Call builtin function (builtin ID on stack)
```

The builtin ID is pushed onto the stack before calling, and the builtin function reads its arguments from the stack and pushes its result back.

## Builtin Registry

We'll create a registry that maps builtin IDs to their implementations:

```typescript
export enum BuiltinID {
  // std.math
  MATH_ABS = 0x01,
  MATH_MIN = 0x02,
  MATH_MAX = 0x03,
  MATH_SQRT = 0x04,
  MATH_POW = 0x05,
  
  // std.array
  ARRAY_LENGTH = 0x10,
  ARRAY_PUSH = 0x11,
  ARRAY_POP = 0x12,
  ARRAY_SLICE = 0x13,
  
  // std.str
  STR_LENGTH = 0x20,
  STR_CONCAT = 0x21,
  STR_CHAR_AT = 0x22,
  STR_SUBSTRING = 0x23,
  
  // std.io
  IO_READ_LINE = 0x30,
  IO_WRITE = 0x31,
}
```

Each builtin receives a VM interface that gives it access to the stack, heap, and other VM internals.

## Implementing Builtins

### std.math.abs

The absolute value function is straightforward:

```typescript
[BuiltinID.MATH_ABS, (vm) => {
  const x = vm.pop()
  vm.push(x < 0 ? -x : x)
}]
```

### std.math.sqrt

For square root, we use integer arithmetic with binary search:

```typescript
[BuiltinID.MATH_SQRT, (vm) => {
  const x = vm.pop()
  if (x < 0) {
    throw new Error('sqrt: negative number')
  }
  // Integer square root using binary search
  let low = 0
  let high = x
  let result = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const square = mid * mid
    if (square === x) {
      result = mid
      break
    } else if (square < x) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  vm.push(result)
}]
```

### std.array.push

Array operations need to manipulate the heap directly:

```typescript
[BuiltinID.ARRAY_PUSH, (vm) => {
  const value = vm.pop()
  const arrAddr = vm.pop()
  
  // Read current length from first 4 bytes
  const length = vm.heap[arrAddr] | 
                 (vm.heap[arrAddr + 1] << 8) |
                 (vm.heap[arrAddr + 2] << 16) |
                 (vm.heap[arrAddr + 3] << 24)
  
  // Calculate new element address
  const elementAddr = arrAddr + 4 + (length * 4)
  
  // Store new value
  vm.heap[elementAddr] = value & 0xFF
  vm.heap[elementAddr + 1] = (value >> 8) & 0xFF
  vm.heap[elementAddr + 2] = (value >> 16) & 0xFF
  vm.heap[elementAddr + 3] = (value >> 24) & 0xFF
  
  // Update length
  const newLength = length + 1
  vm.heap[arrAddr] = newLength & 0xFF
  vm.heap[arrAddr + 1] = (newLength >> 8) & 0xFF
  vm.heap[arrAddr + 2] = (newLength >> 16) & 0xFF
  vm.heap[arrAddr + 3] = (newLength >> 24) & 0xFF
  
  vm.push(newLength)
}]
```

### std.str.concat

String concatenation allocates a new string on the heap:

```typescript
[BuiltinID.STR_CONCAT, (vm) => {
  const bAddr = vm.pop()
  const aAddr = vm.pop()
  
  // Read lengths
  const aLength = /* read from heap */
  const bLength = /* read from heap */
  const totalLength = aLength + bLength
  
  // Allocate new string
  const newStrAddr = vm.heapNext
  const newStrSize = 4 + totalLength + 1 // length + chars + null terminator
  
  // Write length, copy characters, add null terminator
  // ...
  
  vm.setHeapNext(vm.heapNext + newStrSize)
  vm.push(newStrAddr)
}]
```

## Compiler Integration

To use builtins in our language, we need to:

1. **Parse qualified names**: Handle `std.math.abs` syntax
2. **Recognize builtins**: Check if a function call is a builtin
3. **Generate CALL_BUILTIN**: Instead of CALL, generate CALL_BUILTIN

### Parsing Qualified Names

We add support for the dot operator in the lexer and parser:

```typescript
// Lexer: Add DOT token
case '.':
  this.advance()
  return { type: TokenType.DOT, value: '.', ... }

// Parser: Handle qualified names
case TokenType.IDENTIFIER:
  let name = token.value as string
  while (this.current().type === TokenType.DOT) {
    this.advance() // consume dot
    const nextToken = this.current()
    if (nextToken.type === TokenType.IDENTIFIER) {
      this.advance()
      name = `${name}.${nextToken.value}`
    }
  }
  // ... rest of parsing
```

### Code Generation

In the code generator, we check if a function call is a builtin:

```typescript
private generateFunctionCall(expr: { name: string; arguments: Expression[] }): void {
  // Push arguments
  for (const arg of expr.arguments) {
    this.generateExpression(arg)
  }

  // Check if it's a builtin
  const builtinID = BUILTIN_NAME_MAP.get(expr.name)
  if (builtinID !== undefined) {
    // Push builtin ID and call
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(builtinID)
    this.bytecode.push(OPCODES.CALL_BUILTIN)
    return
  }

  // Otherwise, handle as regular function call
  // ...
}
```

## VM Execution

In the VM's execute loop, we handle CALL_BUILTIN:

```typescript
case OPCODES.CALL_BUILTIN:
  const builtinID = this.pop()
  const builtin = BUILTINS.get(builtinID as BuiltinID)
  if (!builtin) {
    throw new Error(`Unknown builtin ID: ${builtinID}`)
  }
  // Call builtin with VM interface
  builtin({
    stack: this.stack,
    heap: this.heap,
    heapNext: this.heapNext,
    inputQueue: this.inputQueue,
    output: this.output,
    pop: () => this.pop(),
    push: (value: number) => this.push(value),
    setHeapNext: (value: number) => { this.heapNext = value },
  })
  this.pc++
  break
```

## Example Usage

Now we can write code like this:

```javascript
// Math operations
let x = -5;
let absX = std.math.abs(x);
print absX; // 5

let minVal = std.math.min(10, 20);
let maxVal = std.math.max(10, 20);

// Array operations
let arr = [10, 20, 30];
let len = std.array.length(arr);
let newLen = std.array.push(arr, 40);
let popped = std.array.pop(arr);

// String operations
let str1 = "Hello";
let str2 = "World";
let combined = std.str.concat(str1, str2);
let combinedLen = std.str.length(combined);
```

## Benefits

This standard library provides:
- **Convenience**: Common operations are now easy to use
- **Performance**: Builtins are faster than user-defined functions
- **Foundation**: We can build more complex programs on top of these primitives

## What's Next?

In the next episode, we'll add optimizations to our compiler, including peephole optimization, dead code elimination, and function inlining. These will make our programs run even faster!

## Summary

We've built a complete standard library system with:
- Builtin function registry
- Native implementations for math, arrays, strings, and I/O
- Compiler support for qualified names and builtin calls
- VM support for executing builtins

This gives our language a solid foundation of useful operations that every program can use. The builtin system is extensible, so we can easily add more functions in the future.

Thanks for watching, and I'll see you in the next episode!

