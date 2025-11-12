# Episode 11: Complete Mini Language Compiler

## Overview
In this episode, we're building a complete compiler for a mini programming language! We'll create a full compiler pipeline: Lexer → Parser → Code Generator. This will let us write programs in a high-level language instead of assembly, making programming much more convenient and powerful.

**Duration:** ~30-35 minutes  
**Learning Goals:**
- Understand the compiler pipeline (lexer, parser, code generator)
- Implement a lexer to tokenize source code
- Build a parser to create an Abstract Syntax Tree (AST)
- Create a code generator to produce bytecode from AST
- Support variables, arithmetic, conditionals, loops, and I/O
- See the complete compilation process in action

---

## Script Outline

### [00:00 - 03:00] Recap & Introduction

**On Screen:** Title card, Episode 10 recap, Episode 11 title

**Narration:**
"Hey everyone! Welcome to Episode 11. This is a big one - we're building a complete compiler!

So far, we've been writing programs in assembly:
```
PUSH 5
STORE 0
LOAD 0
PUSH 1
ADD
STORE 0
```

That works, but it's tedious! Today, we're building a compiler that lets us write:
```
let x = 5;
x = x + 1;
print x;
```

Much better! We'll build a complete compiler pipeline:
1. **Lexer** - Breaks source code into tokens
2. **Parser** - Builds an Abstract Syntax Tree (AST)
3. **Code Generator** - Converts AST to bytecode

This is how real compilers work! We'll support:
- Variables with `let`
- Arithmetic operations
- Conditionals with `if/else`
- Loops with `while`
- Input/output with `print` and `read`

Let's build a compiler!"

---

### [03:00 - 12:00] Part 1: Lexer (Tokenization)

**On Screen:** Code walkthrough of lexer implementation

**Narration:**
"The first step in compilation is **lexical analysis**, or tokenization. The lexer breaks source code into tokens - the smallest meaningful units.

### What are Tokens?

Tokens are like words in a sentence. For example:
```
let x = 5;
```

Becomes tokens:
- `let` (keyword)
- `x` (identifier)
- `=` (operator)
- `5` (number)
- `;` (delimiter)

### Token Types

We need different token types:
- **Keywords**: `let`, `if`, `else`, `while`, `print`, `read`
- **Identifiers**: Variable names like `x`, `count`, `sum`
- **Literals**: Numbers like `5`, `42`, strings like `"hello"`
- **Operators**: `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`
- **Delimiters**: `;`, `(`, `)`, `{`, `}`

### Implementing the Lexer

Here's the basic structure:

```typescript
class Lexer {
  private source: string
  private position: number = 0
  private line: number = 1
  private column: number = 1

  tokenize(): Token[] {
    const tokens: Token[] = []
    
    while (this.position < this.source.length) {
      const token = this.readToken()
      tokens.push(token)
    }
    
    return tokens
  }
}
```

### Reading Different Token Types

**Numbers:**
```typescript
private readNumber(): Token {
  let value = ''
  while (char >= '0' && char <= '9') {
    value += this.advance()
  }
  return { type: 'NUMBER', value: parseInt(value) }
}
```

**Identifiers and Keywords:**
```typescript
private readIdentifier(): Token {
  let value = ''
  while (isLetterOrDigit(char)) {
    value += this.advance()
  }
  
  // Check if it's a keyword
  if (KEYWORDS.has(value)) {
    return { type: KEYWORDS.get(value), value }
  }
  
  return { type: 'IDENTIFIER', value }
}
```

**Operators:**
```typescript
case '+':
  return { type: 'PLUS', value: '+' }
case '=':
  if (this.peek() === '=') {
    // It's ==, not =
    this.advance()
    return { type: 'EQUALS', value: '==' }
  }
  return { type: 'ASSIGN', value: '=' }
```

### Handling Whitespace and Comments

We skip whitespace and handle comments:
```typescript
private skipWhitespace(): void {
  while (char === ' ' || char === '\t' || char === '\r') {
    this.advance()
  }
}

private skipComment(): void {
  if (char === '/' && this.peek() === '/') {
    while (char !== '\n') {
      this.advance()
    }
  }
}
```

The lexer is the foundation - it converts raw text into structured tokens that the parser can understand!"

---

### [12:00 - 22:00] Part 2: Parser (AST Construction)

**On Screen:** Code walkthrough of parser implementation

**Narration:**
"Now that we have tokens, we need to build an **Abstract Syntax Tree** (AST). The parser takes tokens and builds a tree structure representing the program's syntax.

### What is an AST?

An AST is a tree where:
- **Leaves** are literals and identifiers
- **Nodes** are operations and statements
- **Structure** represents the program's meaning

For example, `x + 5` becomes:
```
    +
   / \
  x   5
```

### Grammar Rules

We define our language with grammar rules:

```
Program → Statement*
Statement → LetStatement | IfStatement | WhileStatement | PrintStatement | ExpressionStatement
LetStatement → 'let' Identifier '=' Expression ';'
IfStatement → 'if' '(' Expression ')' '{' Statement* '}' ['else' '{' Statement* '}']
Expression → Assignment | Equality
Equality → Comparison (('==' | '!=') Comparison)*
Comparison → Term (('<' | '>' | '<=' | '>=') Term)*
Term → Factor (('+' | '-') Factor)*
Factor → Unary (('*' | '/') Unary)*
Unary → ('-')? Primary
Primary → Number | Identifier | '(' Expression ')'
```

### Implementing the Parser

We use **recursive descent parsing** - each grammar rule becomes a function:

```typescript
class Parser {
  parse(): Program {
    const statements: Statement[] = []
    while (this.current().type !== 'EOF') {
      statements.push(this.parseStatement())
    }
    return { type: 'Program', statements }
  }

  private parseStatement(): Statement {
    switch (this.current().type) {
      case 'LET':
        return this.parseLetStatement()
      case 'IF':
        return this.parseIfStatement()
      // ... more cases
    }
  }
}
```

### Parsing Expressions

Expressions need to handle operator precedence. We parse from lowest to highest precedence:

```typescript
private parseExpression(): Expression {
  return this.parseAssignment()
}

private parseAssignment(): Expression {
  const expr = this.parseEquality()
  if (this.current().type === 'ASSIGN') {
    this.advance()
    const value = this.parseAssignment()
    return { type: 'AssignmentExpression', name: expr.name, value }
  }
  return expr
}

private parseEquality(): Expression {
  let expr = this.parseComparison()
  while (this.current().type === 'EQUALS' || this.current().type === 'NOT_EQUALS') {
    const operator = this.advance().value
    const right = this.parseComparison()
    expr = { type: 'BinaryExpression', operator, left: expr, right }
  }
  return expr
}
```

### Parsing Control Flow

For `if` statements:
```typescript
private parseIfStatement(): IfStatement {
  this.expect('IF')
  this.expect('LEFT_PAREN')
  const condition = this.parseExpression()
  this.expect('RIGHT_PAREN')
  this.expect('LEFT_BRACE')
  const thenBranch = this.parseBlock()
  this.expect('RIGHT_BRACE')
  
  let elseBranch = null
  if (this.current().type === 'ELSE') {
    this.advance()
    this.expect('LEFT_BRACE')
    elseBranch = this.parseBlock()
    this.expect('RIGHT_BRACE')
  }
  
  return { type: 'IfStatement', condition, thenBranch, elseBranch }
}
```

The parser builds a complete AST representing the program's structure!"

---

### [22:00 - 30:00] Part 3: Code Generator

**On Screen:** Code walkthrough of code generator

**Narration:**
"Finally, we need to convert the AST to bytecode. The code generator walks the AST and emits bytecode instructions.

### Code Generation Strategy

We traverse the AST and generate bytecode for each node:
- **Literals** → `PUSH` instruction
- **Identifiers** → `LOAD` instruction
- **Binary operations** → Generate left, generate right, emit operator
- **Statements** → Generate code for each statement

### Generating Expressions

```typescript
private generateExpression(expr: Expression): void {
  switch (expr.type) {
    case 'NumberLiteral':
      this.bytecode.push(OPCODES.PUSH)
      this.bytecode.push(expr.value)
      break
    
    case 'Identifier':
      const address = this.variableMap.get(expr.name)
      this.bytecode.push(OPCODES.LOAD)
      this.bytecode.push(address)
      break
    
    case 'BinaryExpression':
      this.generateExpression(expr.left)
      this.generateExpression(expr.right)
      this.bytecode.push(this.getOpcode(expr.operator))
      break
  }
}
```

### Variable Management

We need to track variable addresses:
```typescript
private variableMap: Map<string, number> = new Map()
private nextVariableAddress: number = 0

private allocateVariable(name: string): number {
  if (!this.variableMap.has(name)) {
    this.variableMap.set(name, this.nextVariableAddress++)
  }
  return this.variableMap.get(name)!
}
```

### Generating Control Flow

For `if` statements, we use labels and jumps:
```typescript
private generateIfStatement(stmt: IfStatement): void {
  this.generateExpression(stmt.condition)
  
  const elseLabel = this.newLabel()
  const endLabel = this.newLabel()
  
  // Jump to else if condition is false
  this.bytecode.push(OPCODES.JMP_IF_ZERO)
  this.bytecode.push(elseLabel) // Will be patched later
  
  // Generate then branch
  for (const stmt of stmt.thenBranch) {
    this.generateStatement(stmt)
  }
  
  // Jump to end
  this.bytecode.push(OPCODES.JMP)
  this.bytecode.push(endLabel)
  
  // Patch labels with actual addresses
  this.patchJump(elseLabel, this.bytecode.length)
  
  // Generate else branch if exists
  if (stmt.elseBranch) {
    for (const stmt of stmt.elseBranch) {
      this.generateStatement(stmt)
    }
  }
  
  this.patchJump(endLabel, this.bytecode.length)
}
```

### Label Patching

Since we don't know addresses ahead of time, we use labels and patch them later:
```typescript
private patchJump(label: number, address: number): void {
  // Find JMP instructions with this label and replace with address
  for (let i = 0; i < this.bytecode.length; i++) {
    if (this.bytecode[i] === OPCODES.JMP && this.bytecode[i + 1] === label) {
      this.bytecode[i + 1] = address
    }
  }
}
```

The code generator completes the pipeline - AST to bytecode!"

---

### [30:00 - 33:00] Demo: Complete Compiler in Action

**On Screen:** Live demo showing the compiler

**Narration:**
"Let's see our complete compiler in action!

### Example 1: Simple Program

Source code:
```
let x = 5;
let y = 10;
let sum = x + y;
print sum;
```

After lexing, we get tokens:
```
[LET, IDENTIFIER(x), ASSIGN, NUMBER(5), SEMICOLON, ...]
```

After parsing, we get AST:
```
Program {
  statements: [
    LetStatement { name: 'x', value: NumberLiteral(5) },
    LetStatement { name: 'y', value: NumberLiteral(10) },
    LetStatement { name: 'sum', value: BinaryExpression('+', x, y) },
    PrintStatement { expression: Identifier('sum') }
  ]
}
```

After code generation, we get bytecode:
```
[0x01, 5, 0x0A, 0, 0x01, 10, 0x0A, 1, 0x09, 0, 0x09, 1, 0x02, 0x0A, 2, 0x09, 2, 0x05, 0x00]
```

When we run it, we get output: `15`

Perfect!

### Example 2: Control Flow

Source code:
```
let x = 10;
if (x > 5) {
    print 100;
} else {
    print 200;
}
```

The compiler generates bytecode with jumps, and when we run it, we get: `100`

### Example 3: Loops

Source code:
```
let i = 0;
while (i < 5) {
    print i;
    i = i + 1;
}
```

The compiler generates a loop with jumps, and we get output:
```
0
1
2
3
4
```

Amazing! We've built a complete compiler!"

---

### [33:00 - 35:00] Summary & What's Next?

**On Screen:** Summary slide, preview of Episode 12

**Narration:**
"Today we built a complete compiler! Here's what we accomplished:

- ✅ Built a lexer that tokenizes source code
- ✅ Created a parser that builds an AST
- ✅ Implemented a code generator that produces bytecode
- ✅ Supported variables, arithmetic, conditionals, and loops
- ✅ Created a complete compilation pipeline

### Key Takeaways

1. **Compiler Pipeline**
   - Lexer → Parser → Code Generator
   - Each stage transforms the program representation
   - This is how real compilers work!

2. **Lexical Analysis**
   - Breaks source into tokens
   - Handles keywords, identifiers, operators, literals
   - Foundation for parsing

3. **Parsing**
   - Builds an AST representing program structure
   - Uses recursive descent parsing
   - Handles operator precedence and associativity

4. **Code Generation**
   - Converts AST to bytecode
   - Manages variables and labels
   - Generates control flow with jumps

### What's Next?

In the next episode, we'll add **functions** to our language! We'll support:
- Function definitions
- Function calls
- Parameters and return values
- Recursive functions

This will make our language much more powerful!

But for now, we have a complete compiler that can:
- ✅ Compile high-level code to bytecode
- ✅ Support variables and expressions
- ✅ Handle control flow
- ✅ Generate working programs

That's a real compiler!

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. See you in the next episode!"

---

## Demo Notes

### Visual Elements

**Compiler Interface:**
- Source code editor
- Compile button
- Display tokens, AST, and bytecode
- Run button to execute compiled code
- Output display

**Compilation Pipeline Visualization:**
- Show source code
- Show tokens after lexing
- Show AST after parsing
- Show bytecode after code generation
- Show disassembly
- Show execution output

**Examples:**
- Simple variable assignment
- Arithmetic expressions
- If/else statements
- While loops
- Complex programs combining all features

### Teaching Tips

1. **Explain the Pipeline**
   - Each stage transforms the program
   - Show intermediate representations
   - Emphasize the separation of concerns

2. **Show Real Examples**
   - Start with simple programs
   - Gradually increase complexity
   - Show how each feature compiles

3. **Connect to Real Compilers**
   - Same principles as GCC, Clang, etc.
   - Just targeting our VM instead of machine code
   - Same pipeline structure

4. **Emphasize the Achievement**
   - We've built a real compiler!
   - Can write high-level code
   - Compiles to bytecode and runs

---

## Technical Details

### Compiler Pipeline

```
Source Code
  ↓ (Lexer)
Tokens
  ↓ (Parser)
AST
  ↓ (Code Generator)
Bytecode
  ↓ (VM)
Execution
```

### Token Types

- Keywords: `let`, `if`, `else`, `while`, `print`, `read`
- Identifiers: Variable names
- Literals: Numbers, strings
- Operators: `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- Delimiters: `;`, `(`, `)`, `{`, `}`

### AST Node Types

- Program, LetStatement, IfStatement, WhileStatement
- PrintStatement, ReadStatement, ExpressionStatement
- BinaryExpression, UnaryExpression
- NumberLiteral, StringLiteral, Identifier
- AssignmentExpression

### Code Generation

- Variables mapped to memory addresses
- Expressions generate stack operations
- Control flow uses labels and jumps
- Labels patched after code generation

---

## Episode Checklist

- [x] Implement lexer with tokenization
- [x] Build parser with AST construction
- [x] Create code generator for bytecode
- [x] Support variables with `let`
- [x] Support arithmetic operations
- [x] Support conditionals with `if/else`
- [x] Support loops with `while`
- [x] Support I/O with `print` and `read`
- [x] Create interactive compiler UI
- [x] Write comprehensive lesson script
- [x] Test with various programs

---

**End of Episode 11 Script**

