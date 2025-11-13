# Episode 18: Optimizations II

## Introduction

Welcome back! In this episode, we're adding compiler optimizations to make our programs run faster and use less memory. We'll implement three key optimization techniques: peephole optimization, dead-code elimination, and function inlining. These are the same techniques used in real-world compilers!

## What We're Building

Today we'll add:
1. **Peephole Optimizer**: Optimizes small sequences of instructions
2. **Dead-Code Elimination**: Removes unreachable code
3. **Function Inlining**: Inlines small functions at call sites (foundation)
4. **Before/After Comparison**: Visual comparison of optimized vs unoptimized bytecode
5. **Performance Metrics**: Statistics showing optimization impact

## Why Optimize?

Optimizations can:
- **Reduce code size**: Smaller bytecode means less memory usage
- **Improve performance**: Fewer instructions means faster execution
- **Enable further optimizations**: Some optimizations create opportunities for others

## Peephole Optimizer

Peephole optimization looks at small windows (2-5 instructions) and replaces them with more efficient sequences.

### Pattern 1: Constant Folding

Instead of computing constants at runtime, we compute them at compile time:

```
Before: PUSH 5, PUSH 3, ADD
After:  PUSH 8
```

This eliminates two instructions and a runtime computation!

### Pattern 2: Identity Operations

Operations that don't change the value can be removed:

```
Before: PUSH x, PUSH 0, ADD    (x + 0 = x)
After:  PUSH x

Before: PUSH x, PUSH 1, MUL    (x * 1 = x)
After:  PUSH x
```

### Pattern 3: Zero Operations

Multiplying by zero always gives zero:

```
Before: PUSH x, PUSH 0, MUL    (x * 0 = 0)
After:  PUSH 0
```

### Implementation

```typescript
function peepholeOptimize(bytecode: number[]): number[] {
  const optimized: number[] = []
  let i = 0
  
  while (i < bytecode.length) {
    const opcode = bytecode[i]
    
    // Pattern: PUSH n, PUSH m, ADD -> PUSH (n+m)
    if (opcode === OPCODES.PUSH && 
        bytecode[i + 2] === OPCODES.PUSH && 
        bytecode[i + 4] === OPCODES.ADD) {
      const n = bytecode[i + 1]
      const m = bytecode[i + 3]
      optimized.push(OPCODES.PUSH, n + m)
      i += 5
      continue
    }
    
    // Pattern: PUSH x, PUSH 0, ADD -> PUSH x
    if (opcode === OPCODES.PUSH && 
        bytecode[i + 2] === OPCODES.PUSH &&
        bytecode[i + 3] === 0 &&
        bytecode[i + 4] === OPCODES.ADD) {
      optimized.push(OPCODES.PUSH, bytecode[i + 1])
      i += 5
      continue
    }
    
    // ... more patterns
    
    // No optimization matched, keep instruction
    optimized.push(opcode)
    i++
  }
  
  return optimized
}
```

## Dead-Code Elimination

Dead code is code that can never be executed. Common sources:
- Code after `return` statements
- Code after unconditional jumps
- Unreachable branches

### Algorithm

1. **Mark reachable code**: Start from entry point (address 0)
2. **Follow control flow**: Add jump targets and fall-through addresses
3. **Remove unreachable**: Delete all unmarked instructions
4. **Update addresses**: Fix jump targets to point to new addresses

```typescript
function eliminateDeadCode(bytecode: number[]): number[] {
  const reachable = new Set<number>()
  const worklist = [0] // Start from entry point
  reachable.add(0)
  
  // Mark all reachable addresses
  while (worklist.length > 0) {
    const addr = worklist.shift()!
    const opcode = bytecode[addr]
    
    // Add next instruction (fall-through)
    const nextAddr = addr + getInstructionSize(opcode)
    if (!reachable.has(nextAddr)) {
      reachable.add(nextAddr)
      worklist.push(nextAddr)
    }
    
    // Add jump targets
    if (isJump(opcode)) {
      const target = bytecode[addr + 1]
      if (!reachable.has(target)) {
        reachable.add(target)
        worklist.push(target)
      }
    }
  }
  
  // Build optimized bytecode with only reachable instructions
  // Update jump targets to new addresses
  // ...
}
```

### Example

```javascript
fn test() {
    return 42;
    print 100;  // Dead code - never executed
}
```

The `print 100` instruction is unreachable and gets removed.

## Function Inlining

Function inlining replaces function calls with the function body. This eliminates call overhead and enables further optimizations.

### Benefits

- **Eliminates call overhead**: No CALL/RET instructions
- **Enables optimizations**: Can optimize across function boundaries
- **Better register allocation**: More context for optimization

### Challenges

- **Code size**: Inlining can increase code size
- **Complexity**: Need to handle parameters, locals, and return values
- **Heuristics**: When to inline? (size, call frequency, etc.)

For this episode, we'll lay the foundation for inlining. Full implementation would require:
1. Function boundary detection
2. Parameter substitution
3. Local variable renaming
4. Return value handling

## Implementation Strategy

We'll add an optimizer module that:
1. Takes unoptimized bytecode
2. Applies optimizations in sequence
3. Returns optimized bytecode and statistics

```typescript
export function optimize(bytecode: number[]): OptimizationResult {
  let optimized = bytecode
  
  // Apply optimizations in order
  optimized = peepholeOptimize(optimized)
  optimized = eliminateDeadCode(optimized)
  optimized = inlineFunctions(optimized) // Future work
  
  return {
    bytecode: optimized,
    stats: {
      originalSize: bytecode.length,
      optimizedSize: optimized.length,
      reduction: bytecode.length - optimized.length
    }
  }
}
```

## Integration with Compiler

We'll add an optional optimization pass to the compiler:

```typescript
export function compile(source: string, enableOptimizations: boolean = false) {
  // ... lex, parse, generate ...
  
  let bytecode = generator.generate(ast)
  
  if (enableOptimizations) {
    const result = optimize(bytecode)
    bytecode = result.bytecode
  }
  
  return { bytecode, optimized: result }
}
```

## Before/After Comparison

The UI will show:
- **Side-by-side bytecode**: Unoptimized vs optimized
- **Statistics**: Size reduction, optimization count
- **Optimization list**: Detailed list of each optimization applied
- **Disassembly**: Human-readable view of both versions

## Performance Impact

Optimizations can significantly improve performance:
- **Constant folding**: Eliminates runtime computations
- **Dead-code elimination**: Reduces code size and execution time
- **Function inlining**: Eliminates call overhead

In real compilers, optimizations can improve performance by 2-10x or more!

## What's Next?

In the next episode, we'll add packaging and distribution, allowing us to bundle programs into `.tvm` files that can be shared and executed.

## Summary

We've implemented:
- **Peephole optimizer**: Constant folding, identity operations, zero operations
- **Dead-code elimination**: Removes unreachable code
- **Function inlining foundation**: Ready for future implementation
- **Visual comparison tools**: See optimizations in action

These are the same optimization techniques used in production compilers like GCC, Clang, and V8!

Thanks for watching, and I'll see you in the next episode!

