# Episode 16: Arrays & Strings

## Introduction

Welcome back! In this episode, we're adding two fundamental data structures to our virtual machine: arrays and strings. These are essential for building real programs, and they'll require us to implement heap memory management.

## What We're Building

Today we'll add:
1. **Heap Memory**: A separate memory space for dynamically allocated data
2. **Arrays**: Fixed-size collections of values
3. **Strings**: Null-terminated sequences of characters

## Heap Memory

Up until now, we've been using a fixed-size memory array for variables. But for arrays and strings, we need dynamic allocation. That's where the heap comes in.

The heap is a large memory space (we'll use 1MB) that grows as we allocate memory. Unlike the stack, which is organized in frames, the heap is a flat address space.

### New Opcodes

Let's add the opcodes we need:

```typescript
MALLOC: 0x13,      // Allocate heap memory (size on stack, returns address)
LOAD8: 0x14,       // Load 8-bit value from heap address
LOAD32: 0x15,      // Load 32-bit value from heap address
STORE8: 0x16,      // Store 8-bit value to heap address
STORE32: 0x17,     // Store 32-bit value to heap address
LOAD32_STACK: 0x18, // Load 32-bit value from heap (address on stack)
STORE32_STACK: 0x19, // Store 32-bit value to heap (address on stack)
STORE8_STACK: 0x1A, // Store 8-bit value to heap (address on stack)
```

### MALLOC Implementation

MALLOC takes the size from the stack and returns a heap address:

```typescript
case OPCODES.MALLOC:
  const size = this.pop()
  if (size < 0) {
    throw new Error(`Invalid allocation size: ${size}`)
  }
  if (this.heapNext + size > this.heapSize) {
    throw new Error(`Heap overflow`)
  }
  const heapAddr = this.heapNext
  this.heapNext += size
  this.heap.fill(0, heapAddr, heapAddr + size) // Zero out memory
  this.push(heapAddr)
  break
```

This is a simple bump allocator - we just keep track of the next free address and increment it. In a real VM, you'd want a more sophisticated allocator with free lists, but this works for our purposes.

### Load/Store Operations

We have two variants:
- Immediate address: `LOAD32 100` - address is in the bytecode
- Stack address: `LOAD32_STACK` - address is on the stack (needed for dynamic indexing)

The stack variants are essential for array access where we calculate the address at runtime.

## Arrays

Arrays in our language will be heap-allocated with this layout:
- First 4 bytes: length (32-bit integer)
- Remaining bytes: elements (each 4 bytes for 32-bit integers)

### Array Literal Code Generation

When we see `[1, 2, 3]`, we need to:
1. Calculate size: 4 (length) + 3 * 4 (elements) = 16 bytes
2. Allocate heap memory
3. Store length
4. Store each element

```typescript
private generateArrayLiteral(expr: { elements: Expression[] }): void {
  const arrayLength = expr.elements.length
  const arraySize = 4 + (arrayLength * 4)
  
  // Allocate
  this.bytecode.push(OPCODES.PUSH)
  this.bytecode.push(arraySize)
  this.bytecode.push(OPCODES.MALLOC)
  
  // Store length
  // ... (store length at offset 0)
  
  // Store each element
  for (let i = 0; i < elements.length; i++) {
    this.generateExpression(elements[i])
    // Calculate address: base + 4 + i * 4
    // Store using STORE32_STACK
  }
}
```

### Array Access

For `arr[index]`, we need to:
1. Get array base address
2. Calculate offset: 4 (skip length) + index * 4
3. Load value using LOAD32_STACK

```typescript
private generateArrayAccess(expr: { array: Expression; index: Expression }): void {
  this.generateExpression(expr.array)  // Base address
  this.generateExpression(expr.index)  // Index
  
  // Calculate: base + 4 + index * 4
  // ... arithmetic ...
  
  this.bytecode.push(OPCODES.LOAD32_STACK)
}
```

### Array Assignment

For `arr[index] = value`, we do similar address calculation but use STORE32_STACK instead.

## Strings

Strings are stored as:
- First 4 bytes: length (32-bit integer)
- Next N bytes: characters (each 1 byte, ASCII)
- Final byte: null terminator (0)

### String Literal Code Generation

When we see `"Hello"`, we:
1. Calculate size: 4 (length) + 5 (chars) + 1 (null) = 10 bytes
2. Allocate heap memory
3. Store length
4. Store each character as 8-bit value
5. Store null terminator

```typescript
case 'StringLiteral':
  const strValue = expr.value
  const strLength = strValue.length
  const strSize = 4 + strLength + 1
  
  // Allocate
  this.bytecode.push(OPCODES.PUSH)
  this.bytecode.push(strSize)
  this.bytecode.push(OPCODES.MALLOC)
  
  // Store length (32-bit)
  // Store each character (8-bit)
  // Store null terminator
```

## Language Syntax

We need to add array syntax to our parser:

```typescript
// Array literal
[1, 2, 3]

// Array access
arr[0]
arr[i + 1]

// Array assignment
arr[0] = 5
```

The lexer needs to recognize `[` and `]` tokens, and the parser needs to handle:
- Array literals in expressions
- Array access (postfix operator)
- Array assignment (left-hand side of `=`)

## Example Program

Here's a complete example:

```javascript
let arr = [10, 20, 30, 40, 50];
let i = 0;

while (i < 5) {
    print arr[i];
    i = i + 1;
}
```

This allocates an array on the heap, then iterates through it printing each element.

## Challenges

1. **Bounds Checking**: We don't currently check if array indices are valid. In a real VM, you'd want to verify `0 <= index < length`.

2. **String Operations**: Right now, strings just return heap addresses. To be useful, we'd need functions to:
   - Print strings (iterate through characters)
   - Concatenate strings
   - Compare strings

3. **Garbage Collection**: We allocate memory but never free it. In Episode 21, we'll add garbage collection to reclaim unused memory.

## Summary

In this episode, we've added:
- Heap memory with MALLOC
- Array support with heap allocation
- String support with null termination
- New opcodes for heap operations

Arrays and strings are now first-class citizens in our language! In the next episode, we'll build a standard library with useful functions for working with these data structures.

Thanks for watching, and I'll see you in the next episode!

