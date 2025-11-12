# Episode 12: Functions in the Language

## Overview
In this episode, we're adding functions to our mini language! We'll extend the compiler to support function definitions, function calls, parameters, and return values. This brings our language much closer to a real programming language.

**Duration:** ~25-30 minutes  
**Learning Goals:**
- Extend the lexer to recognize function keywords (`fn`, `return`)
- Add function definition and call syntax to the parser
- Generate bytecode for function calls and returns
- Understand function address resolution
- See how functions integrate with the existing VM call stack

---

## Script Outline

### [00:00 - 03:00] Recap & Introduction

**On Screen:** Title card, Episode 11 recap, Episode 12 title

**Narration:**
"Hey everyone! Welcome to Episode 12. Today we're adding functions to our mini language!

In Episode 11, we built a complete compiler that supports variables, conditionals, loops, and I/O. But we're missing one crucial feature: functions! Functions let us:
- Reuse code
- Organize programs into logical units
- Build more complex programs

Today, we'll extend our compiler to support:
- Function definitions: `fn add(a, b) { return a + b; }`
- Function calls: `let result = add(5, 3);`
- Parameters and return values
- Integration with our existing VM call stack

Let's dive in!"

---

### [03:00 - 08:00] Extending the Lexer

**On Screen:** `src/compiler/lexer.ts` - Adding `FN` and `RETURN` tokens

**Narration:**
"First, we need to extend our lexer to recognize function-related keywords. We'll add two new token types: `FN` for function definitions and `RETURN` for return statements.

Let's open the lexer and add these tokens to our `TokenType` enum:

```typescript
FN = 'FN',
RETURN = 'RETURN',
```

And we need to add them to our keywords map:

```typescript
const KEYWORDS: Record<string, TokenType> = {
  // ... existing keywords
  'fn': TokenType.FN,
  'return': TokenType.RETURN,
}
```

We also need to add a `COMMA` token for function parameters:

```typescript
COMMA = 'COMMA',
```

And handle it in the lexer's character matching:

```typescript
case ',':
  this.advance()
  return { type: TokenType.COMMA, value: ',', line: startLine, column: startColumn }
```

That's it for the lexer! Now it can tokenize function syntax."

---

### [08:00 - 18:00] Extending the Parser

**On Screen:** `src/compiler/parser.ts` - Adding function AST nodes and parsing logic

**Narration:**
"Now let's extend the parser to handle function definitions and calls. We need to add three new AST node types:

1. `FunctionDefinition` - for function declarations
2. `ReturnStatement` - for return statements
3. `FunctionCall` - for function invocations

Let's add these to our AST types:

```typescript
export interface FunctionDefinition {
  type: 'FunctionDefinition'
  name: string
  parameters: string[]
  body: Statement[]
}

export interface ReturnStatement {
  type: 'ReturnStatement'
  value: Expression | null
}

export interface FunctionCall {
  type: 'FunctionCall'
  name: string
  arguments: Expression[]
}
```

Now, let's add parsing logic. First, we'll update `parseStatement()` to handle function definitions and return statements:

```typescript
case TokenType.FN:
  return this.parseFunctionDefinition()
case TokenType.RETURN:
  return this.parseReturnStatement()
```

Now let's implement `parseFunctionDefinition()`:

```typescript
private parseFunctionDefinition(): FunctionDefinition {
  this.expect(TokenType.FN)
  const name = this.expect(TokenType.IDENTIFIER).value as string
  this.expect(TokenType.LEFT_PAREN)
  
  // Parse parameters
  const parameters: string[] = []
  if (this.current().type !== TokenType.RIGHT_PAREN) {
    parameters.push(this.expect(TokenType.IDENTIFIER).value as string)
    while (this.current().type === TokenType.COMMA) {
      this.advance() // consume comma
      parameters.push(this.expect(TokenType.IDENTIFIER).value as string)
    }
  }
  
  this.expect(TokenType.RIGHT_PAREN)
  this.expect(TokenType.LEFT_BRACE)
  const body = this.parseBlock()
  this.expect(TokenType.RIGHT_BRACE)

  return {
    type: 'FunctionDefinition',
    name,
    parameters,
    body,
  }
}
```

This parses the function name, parameters (comma-separated), and body.

For return statements:

```typescript
private parseReturnStatement(): ReturnStatement {
  this.expect(TokenType.RETURN)
  
  let value: Expression | null = null
  if (this.current().type !== TokenType.SEMICOLON) {
    value = this.parseExpression()
  }
  
  this.expect(TokenType.SEMICOLON)
  return {
    type: 'ReturnStatement',
    value,
  }
}
```

Return statements can have an optional value.

Now for function calls. We need to detect when an identifier is followed by parentheses. Let's update `parsePrimary()`:

```typescript
case TokenType.IDENTIFIER:
  this.advance()
  const name = token.value as string
  
  // Check if it's a function call (identifier followed by '(')
  if (this.current().type === TokenType.LEFT_PAREN) {
    return this.parseFunctionCall(name)
  }
  
  return {
    type: 'Identifier',
    name,
  }
```

And implement `parseFunctionCall()`:

```typescript
private parseFunctionCall(name: string): FunctionCall {
  this.expect(TokenType.LEFT_PAREN)
  
  const args: Expression[] = []
  if (this.current().type !== TokenType.RIGHT_PAREN) {
    args.push(this.parseExpression())
    while (this.current().type === TokenType.COMMA) {
      this.advance() // consume comma
      args.push(this.parseExpression())
    }
  }
  
  this.expect(TokenType.RIGHT_PAREN)
  
  return {
    type: 'FunctionCall',
    name,
    arguments: args,
  }
}
```

Perfect! Our parser can now handle functions."

---

### [18:00 - 28:00] Code Generation for Functions

**On Screen:** `src/compiler/codegen.ts` - Adding function code generation

**Narration:**
"Now for the fun part - generating bytecode for functions! We need to:

1. Track function addresses
2. Generate function bodies
3. Generate function calls
4. Generate return statements

Let's start by adding a function map to track function addresses:

```typescript
private functionMap: Map<string, number> = new Map()
private functionBodies: Array<{ name: string; body: Statement[]; parameters: string[] }> = []
```

In our `generate()` method, we'll use a three-pass approach:

1. **First pass**: Collect function definitions
2. **Second pass**: Generate functions first (so we know their addresses)
3. **Third pass**: Generate main code (which can call functions)

Here's the strategy:

```typescript
// First pass: collect function definitions
for (const stmt of ast.statements) {
  if (stmt.type === 'FunctionDefinition') {
    this.functionBodies.push({
      name: stmt.name,
      body: stmt.body,
      parameters: stmt.parameters,
    })
  }
}

// Generate functions first (so we know their addresses)
const mainCodeStartLabel = this.newLabel()
// Jump to main code (will be patched later)
this.bytecode.push(OPCODES.JMP)
this.bytecode.push(mainCodeStartLabel)

// Generate function bodies
for (const func of this.functionBodies) {
  const funcAddress = this.bytecode.length
  this.functionMap.set(func.name, funcAddress)
  
  // Generate function body
  for (const stmt of func.body) {
    this.generateStatement(stmt)
  }
  
  this.bytecode.push(OPCODES.RET)
}

// Generate main code
const mainCodeStart = this.bytecode.length
this.patchJump(mainCodeStartLabel, mainCodeStart)
```

We generate functions first, then jump to main code. This way, function addresses are known when we generate calls.

Now let's implement `generateFunctionCall()`:

```typescript
private generateFunctionCall(expr: { name: string; arguments: Expression[] }): void {
  // Push arguments in order (left to right)
  for (const arg of expr.arguments) {
    this.generateExpression(arg)
  }

  // Get function address
  const funcAddress = this.functionMap.get(expr.name)
  if (funcAddress === undefined) {
    throw new Error(`Undefined function: ${expr.name}`)
  }

  // Call function
  this.bytecode.push(OPCODES.CALL)
  this.bytecode.push(funcAddress)
  // Result is left on stack
}
```

We push arguments onto the stack, then call the function. The VM's CALL instruction handles the rest!

For return statements:

```typescript
private generateReturnStatement(stmt: { value: Expression | null }): void {
  if (stmt.value) {
    this.generateExpression(stmt.value)
  } else {
    // Push 0 for void return
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(0)
  }
  this.bytecode.push(OPCODES.RET)
}
```

We evaluate the return value (if any), then return. The VM's RET instruction pops the return address and returns control to the caller.

That's it! Our code generator can now handle functions."

---

### [28:00 - 30:00] Demo & Testing

**On Screen:** Episode 12 demo UI with function examples

**Narration:**
"Let's test it! Here's a simple example:

```javascript
fn add(a, b) {
    return a + b;
}

let result = add(5, 3);
print result;
```

This defines a function `add` that takes two parameters and returns their sum. Then we call it with arguments 5 and 3, and print the result.

Let's compile and run it... Perfect! It works!

Here's a more complex example with nested function calls:

```javascript
fn multiply(x, y) {
    return x * y;
}

fn square(n) {
    return multiply(n, n);
}

let result = square(6);
print result;
```

This defines `multiply`, then `square` which calls `multiply`. When we call `square(6)`, it calls `multiply(6, 6)`, which returns 36.

The call stack handles all of this automatically - our VM's CALL and RET instructions manage the stack frames, return addresses, and local variables.

Functions are now fully integrated into our language!"

---

### [30:00 - 32:00] Summary & Next Steps

**On Screen:** Summary slide, Episode 12 recap

**Narration:**
"Great work! In this episode, we:

1. Extended the lexer to recognize `fn` and `return` keywords
2. Added function definition, call, and return parsing to the parser
3. Implemented code generation for functions, calls, and returns
4. Integrated functions with our existing VM call stack

Our mini language now supports:
- Variables
- Arithmetic operations
- Conditionals and loops
- I/O operations
- **Functions!**

This is a huge milestone! We've built a complete, functional programming language with a compiler and virtual machine.

In the next episode, we'll explore more advanced features. But for now, you have everything you need to write real programs in our mini language!

Thanks for watching, and I'll see you in the next episode!"

---

## Key Code Changes

### Lexer (`src/compiler/lexer.ts`)
- Added `FN` and `RETURN` token types
- Added `COMMA` token type
- Added keywords: `'fn'` and `'return'`
- Added comma character handling

### Parser (`src/compiler/parser.ts`)
- Added `FunctionDefinition`, `ReturnStatement`, and `FunctionCall` AST nodes
- Implemented `parseFunctionDefinition()` method
- Implemented `parseReturnStatement()` method
- Implemented `parseFunctionCall()` method
- Updated `parsePrimary()` to detect function calls
- Updated `parseStatement()` to handle function definitions and returns

### Code Generator (`src/compiler/codegen.ts`)
- Added `functionMap` to track function addresses
- Added `functionBodies` array to store function definitions
- Modified `generate()` to use three-pass approach:
  1. Collect function definitions
  2. Generate functions first
  3. Generate main code
- Implemented `generateFunctionCall()` method
- Implemented `generateReturnStatement()` method
- Updated `generateStatement()` to handle function definitions and returns

### UI (`src/pages/Episode12.tsx`)
- Created Episode 12 component with function examples
- Updated default source code to demonstrate functions

---

## Testing Examples

### Example 1: Simple Function
```javascript
fn add(a, b) {
    return a + b;
}

let result = add(5, 3);
print result;
```
**Expected Output:** `8`

### Example 2: Nested Function Calls
```javascript
fn multiply(x, y) {
    return x * y;
}

fn square(n) {
    return multiply(n, n);
}

let result = square(6);
print result;
```
**Expected Output:** `36`

### Example 3: Multiple Functions
```javascript
fn add(a, b) {
    return a + b;
}

fn multiply(x, y) {
    return x * y;
}

let result1 = add(5, 3);
print result1;

let result2 = multiply(4, 7);
print result2;
```
**Expected Output:** 
```
8
28
```

---

## Notes for Presenter

- Emphasize the three-pass code generation strategy
- Explain why we generate functions before main code (address resolution)
- Show how the VM's existing CALL/RET instructions handle everything
- Mention that parameter handling uses the existing stack (frame-relative locals can be added later)
- Point out that this is a major milestone - we now have a complete language!

