# Episode 10: Bytecode Disassembler & Pretty Printer

## Overview
In this episode, we're building the reverse of our assembler: a disassembler that converts bytecode back to human-readable mnemonics. We'll also create a pretty printer for formatted output and add macro pattern detection. This is incredibly useful for debugging, understanding compiled code, and verifying our compiler works correctly.

**Duration:** ~22-27 minutes  
**Learning Goals:**
- Understand what a disassembler is and why it's useful
- Implement bytecode-to-mnemonics conversion
- Create a pretty printer for formatted disassembly
- Detect macro patterns in disassembled code
- Perform round-trip testing (assemble → disassemble → assemble)
- Understand the relationship between assemblers and disassemblers

---

## Script Outline

### [00:00 - 02:00] Recap & Introduction

**On Screen:** Title card, Episode 9 recap, Episode 10 title

**Narration:**
"Hey everyone! Welcome to Episode 10. Last time, we explored real-world virtual machines and compared JVM, CLR, WebAssembly, and CHIP-8.

Today, we're building something really useful: a **bytecode disassembler and pretty printer**. 

So far, we've been going in one direction: source code → bytecode. But what if we have bytecode and want to see what it does? That's where a disassembler comes in!

A disassembler converts bytecode back to human-readable mnemonics. It's the reverse of an assembler. This is incredibly useful for:
- **Debugging**: Understanding what bytecode does
- **Verification**: Checking that our compiler works correctly
- **Learning**: Seeing how source code maps to bytecode
- **Reverse engineering**: Understanding compiled programs

We'll build:
- A disassembler that converts bytecode to mnemonics
- A pretty printer for formatted output
- Macro pattern detection
- Round-trip testing

Let's build it!"

---

### [02:00 - 08:00] What is a Disassembler?

**On Screen:** Diagram showing assembler vs disassembler

**Narration:**
"First, let's understand what a disassembler is and why we need it.

### The Compilation Pipeline

We've been building this pipeline:
```
Source Code → Assembler → Bytecode → VM → Execution
```

But sometimes we need to go backwards:
```
Bytecode → Disassembler → Mnemonics
```

### Why Do We Need a Disassembler?

**1. Debugging**

When debugging, you might have bytecode but want to see what it does. A disassembler shows you the human-readable instructions.

**2. Verification**

We can test our assembler by:
1. Assembling source code to bytecode
2. Disassembling the bytecode back to mnemonics
3. Comparing the result

This is called **round-trip testing**.

**3. Learning**

Seeing how source code compiles to bytecode helps you understand the compilation process.

**4. Reverse Engineering**

In real systems, disassemblers are used to understand compiled programs when source code isn't available.

### Real-World Examples

- **objdump**: Disassembles machine code on Linux
- **javap**: Disassembles Java bytecode
- **ildasm**: Disassembles .NET IL code
- **wasm-objdump**: Disassembles WebAssembly

All of these do the same thing: convert binary/bytecode back to human-readable form.

### The Challenge

Disassembling is trickier than assembling because:
- We need to know which bytes are opcodes vs operands
- We need to handle variable-length instructions
- We need to detect patterns (like macros)

But it's totally doable! Let's build it."

---

### [08:00 - 15:00] Implementing the Disassembler

**On Screen:** Code walkthrough of disassembler implementation

**Narration:**
"Let's implement our disassembler. The core idea is simple: read bytecode sequentially and convert each opcode to its mnemonic.

### Basic Structure

We'll create a `disassemble` function that takes a bytecode array and returns disassembly lines:

```typescript
interface DisassemblyLine {
  address: number      // Where in bytecode
  opcode: number       // The opcode value
  mnemonic: string     // Human-readable name
  operands: number[]   // Any operands
  rawBytes: number[]   // All bytes for this instruction
}
```

### The Algorithm

1. **Create opcode lookup**: Map opcode values to opcode info
2. **Read sequentially**: Go through bytecode byte by byte
3. **Identify opcodes**: Look up each byte in our opcode map
4. **Read operands**: If opcode needs operands, read them
5. **Build mnemonic**: Combine opcode name with operands

Here's the core loop:

```typescript
while (i < bytecode.length) {
  const address = i
  const opcode = bytecode[i]
  const opcodeInfo = opcodeMap.get(opcode)
  
  if (!opcodeInfo) {
    // Unknown opcode - error!
    continue
  }
  
  const operands: number[] = []
  
  // Read operands if needed
  if (opcodeInfo.operands > 0) {
    for (let j = 0; j < opcodeInfo.operands; j++) {
      i++
      operands.push(bytecode[i])
    }
  }
  
  // Build mnemonic
  let mnemonic = opcodeInfo.name
  if (operands.length > 0) {
    mnemonic += ' ' + operands.join(' ')
  }
  
  // Store disassembly line
  lines.push({ address, opcode, mnemonic, operands, rawBytes })
  
  i++
}
```

### Handling Different Opcodes

Some opcodes have no operands:
- `HALT` → just `0x00`
- `ADD` → just `0x02`

Some opcodes have one operand:
- `PUSH 5` → `0x01` followed by `5`
- `JMP 10` → `0x06` followed by `10`
- `LOAD 0` → `0x09` followed by `0`

The opcode info tells us how many operands to read!

### Error Handling

We need to handle:
- **Unknown opcodes**: Bytes that aren't valid opcodes
- **Incomplete instructions**: End of bytecode in middle of instruction
- **Invalid operands**: Operands that don't make sense

Let's add error handling:

```typescript
if (!opcodeInfo) {
  errors.push(`Unknown opcode 0x${opcode.toString(16)} at address ${address}`)
  // Continue with unknown opcode
}

if (opcodeInfo.operands > 0 && i + opcodeInfo.operands >= bytecode.length) {
  errors.push(`Incomplete instruction at address ${address}`)
  // Handle gracefully
}
```

This gives us a robust disassembler that handles errors gracefully!"

---

### [15:00 - 20:00] Pretty Printing

**On Screen:** Code walkthrough of pretty printer

**Narration:**
"Now let's make the disassembly look nice with a pretty printer. We want to format it like:

```
0x0000: PUSH 5              // Push value onto stack
0x0002: PUSH 1              // Push value onto stack
0x0004: ADD                 // Pop two values, push their sum
0x0005: PRINT               // Pop value and print it
0x0006: HALT                // Stop execution
```

### Formatting Options

We'll support different formatting options:

1. **Show addresses**: Display bytecode addresses (hex)
2. **Show raw bytes**: Display the actual byte values
3. **Show comments**: Display opcode descriptions
4. **Indentation**: Support indentation for readability

Here's the pretty printer:

```typescript
function formatDisassembly(lines, options) {
  const formatted = []
  
  for (const line of lines) {
    const parts = []
    
    // Address (hex)
    if (options.showAddresses) {
      parts.push(`0x${line.address.toString(16).padStart(4, '0')}:`)
    }
    
    // Raw bytes (hex)
    if (options.showRawBytes) {
      const bytesStr = line.rawBytes
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' ')
      parts.push(`[${bytesStr}]`)
    }
    
    // Mnemonic
    parts.push(line.mnemonic.padEnd(20))
    
    // Comment
    if (options.showComments) {
      const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === line.opcode)
      if (opcodeInfo) {
        parts.push(`// ${opcodeInfo.description}`)
      }
    }
    
    formatted.push(parts.join(' '))
  }
  
  return formatted.join('\n')
}
```

### Bytecode Formatting

We also want to format the raw bytecode array in different ways:

- **Hex**: `[0x01, 0x05, 0x01, 0x01, 0x02, 0x05, 0x00]`
- **Decimal**: `[1, 5, 1, 1, 2, 5, 0]`
- **Mixed**: `[0x01, 5, 0x01, 1, 0x02, 0x05, 0x00]` (opcodes as hex, operands as decimal)

This makes it easier to read and understand the bytecode!"

---

### [20:00 - 25:00] Macro Pattern Detection

**On Screen:** Demo showing macro detection

**Narration:**
"One cool feature we can add is **macro pattern detection**. Remember from Episode 7, we have macros like `INC`, `DEC`, and `NEG` that expand to multiple opcodes.

When we disassemble bytecode, we can detect these patterns and suggest the macro!

### Detecting Patterns

For example, `INC` expands to:
```
PUSH 1
ADD
```

So if we see this pattern in disassembly, we can suggest:
```
INC  // Macro: PUSH 1 + ADD
```

Here's how we detect it:

```typescript
function detectMacroPatterns(lines) {
  const suggestions = new Map()
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check for INC: PUSH 1, ADD
    if (line.mnemonic === 'PUSH 1' && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.mnemonic === 'ADD') {
        suggestions.set(i, 'INC')
        suggestions.set(i + 1, '// (part of INC macro)')
      }
    }
    
    // Check for DEC: PUSH -1, ADD
    if (line.mnemonic === 'PUSH -1' && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.mnemonic === 'ADD') {
        suggestions.set(i, 'DEC')
        suggestions.set(i + 1, '// (part of DEC macro)')
      }
    }
    
    // Check for NEG: PUSH -1, MUL
    if (line.mnemonic === 'PUSH -1' && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.mnemonic === 'MUL') {
        suggestions.set(i, 'NEG')
        suggestions.set(i + 1, '// (part of NEG macro)')
      }
    }
  }
  
  return suggestions
}
```

### Formatting with Macros

We can create a special formatter that shows macro suggestions:

```typescript
function formatDisassemblyWithMacros(lines) {
  const suggestions = detectMacroPatterns(lines)
  const formatted = []
  
  for (let i = 0; i < lines.length; i++) {
    const suggestion = suggestions.get(i)
    
    if (suggestion && !suggestion.startsWith('//')) {
      // This is a macro
      formatted.push(`INC  // Macro: ${lines[i].mnemonic} + ${lines[i+1].mnemonic}`)
      i++ // Skip next line
    } else {
      // Regular instruction
      formatted.push(formatLine(lines[i]))
    }
  }
  
  return formatted.join('\n')
}
```

This makes it much easier to understand disassembled code that came from macros!"

---

### [25:00 - 27:00] Round-Trip Testing

**On Screen:** Demo of round-trip test

**Narration:**
"One of the most powerful uses of a disassembler is **round-trip testing**. This verifies that our assembler and disassembler work correctly together.

### The Round-Trip Test

1. Start with source code
2. Assemble it to bytecode
3. Disassemble the bytecode back to mnemonics
4. Assemble the mnemonics again
5. Compare the bytecode - it should match!

Here's the test:

```typescript
function roundTripTest(sourceCode) {
  // Step 1: Assemble
  const { bytecode } = assemble(sourceCode)
  
  // Step 2: Disassemble
  const { lines } = disassemble(bytecode)
  
  // Step 3: Convert back to source
  const reconstructedSource = lines.map(l => l.mnemonic).join('\n')
  
  // Step 4: Assemble again
  const { bytecode: bytecode2 } = assemble(reconstructedSource)
  
  // Step 5: Compare
  const matches = bytecode.length === bytecode2.length &&
    bytecode.every((b, i) => b === bytecode2[i])
  
  return matches
}
```

### Why This Matters

Round-trip testing catches bugs in:
- **Assembler**: Wrong bytecode generation
- **Disassembler**: Wrong mnemonic conversion
- **Opcode definitions**: Mismatched opcode values

If the round-trip fails, we know something is wrong!

### Limitations

Round-trip testing works perfectly for:
- Simple opcodes
- Direct bytecode-to-mnemonics conversion

But it might not preserve:
- Comments (they're lost in bytecode)
- Labels (they become addresses)
- Macros (they're expanded)

That's okay - the important thing is that the **execution behavior** is preserved!"

---

### [27:00 - 28:00] Demo: Using the Disassembler

**On Screen:** Live demo of disassembler

**Narration:**
"Let's see the disassembler in action!

### Demo 1: Simple Program

Let's start with a simple program:
```
PUSH 5
INC
PRINT
HALT
```

After assembling, we get bytecode: `[1, 5, 1, 1, 2, 5, 0]`

Now let's disassemble it:
```
0x0000: PUSH 5              // Push value onto stack
0x0002: PUSH 1              // Push value onto stack
0x0004: ADD                 // Pop two values, push their sum
0x0005: PRINT               // Pop value and print it
0x0006: HALT                // Stop execution
```

Perfect! And with macro detection:
```
0x0000: PUSH 5              // Push value onto stack
0x0002: INC                 // Macro: PUSH 1 + ADD
0x0005: PRINT               // Pop value and print it
0x0006: HALT                // Stop execution
```

Much cleaner!

### Demo 2: Round-Trip Test

Let's test round-trip with a more complex program:
```
PUSH 10
STORE 0
LOAD 0
PUSH 1
ADD
STORE 0
LOAD 0
PRINT
HALT
```

[Run the test]

✅ Round-trip test passed! The bytecode matches perfectly.

### Demo 3: Disassemble Raw Bytecode

We can also disassemble bytecode directly. Let's paste some bytecode:
```
[6, 10, 7, 15, 1, 1, 2, 9, 0, 10, 0, 6, 0]
```

After disassembling:
```
0x0000: JMP 10              // Jump to address
0x0002: JMP_IF_ZERO 15      // Jump if top of stack is zero
0x0004: PUSH 1              // Push value onto stack
0x0006: ADD                 // Pop two values, push their sum
0x0007: LOAD 0              // Load value from memory address
0x0009: STORE 0             // Store value to memory address
0x000B: JMP 0               // Jump to address
```

Perfect! We can see exactly what the bytecode does."

---

### [28:00 - 30:00] Summary & What's Next?

**On Screen:** Summary slide, preview of Episode 11

**Narration:**
"Today we built a complete disassembler and pretty printer! Here's what we accomplished:

- ✅ Built a disassembler that converts bytecode to mnemonics
- ✅ Created a pretty printer with formatting options
- ✅ Added macro pattern detection
- ✅ Implemented round-trip testing
- ✅ Handled errors gracefully

### Key Takeaways

1. **Disassemblers are the reverse of assemblers**
   - They convert bytecode back to human-readable form
   - Essential for debugging and verification

2. **Pretty printing makes disassembly readable**
   - Show addresses, raw bytes, and comments
   - Format options for different use cases

3. **Pattern detection is powerful**
   - Can detect macro patterns
   - Makes disassembly more understandable

4. **Round-trip testing verifies correctness**
   - Assemble → Disassemble → Assemble
   - Catches bugs in both directions

### What's Next?

In the next episode, we'll start building a **complete mini language compiler**! We'll create:
- A lexer to tokenize source code
- A parser to build an abstract syntax tree
- A code generator to produce bytecode

This will let us write programs in a high-level language instead of assembly!

But for now, we have a complete toolchain:
- ✅ Assembler (source → bytecode)
- ✅ Disassembler (bytecode → source)
- ✅ VM (bytecode → execution)
- ✅ Debugger (step-by-step execution)

That's a complete development environment!

Thanks for watching! Don't forget to like, subscribe, and hit the bell for notifications. See you in the next episode!"

---

## Demo Notes

### Visual Elements

**Disassembler Interface:**
- Source code input area
- Bytecode input area
- Disassembly output with formatting options
- Macro detection display
- Round-trip test button

**Formatting Options:**
- Toggle addresses on/off
- Toggle raw bytes on/off
- Toggle comments on/off
- Switch between hex/decimal/mixed bytecode format

**Examples:**
- Simple program with macros
- Complex program with loops and functions
- Raw bytecode disassembly
- Round-trip test demonstration

### Code Walkthrough

1. **Show disassembler algorithm**
   - Sequential bytecode reading
   - Opcode lookup
   - Operand reading
   - Mnemonic building

2. **Demonstrate pretty printing**
   - Different format options
   - Address formatting
   - Comment addition
   - Bytecode formatting

3. **Show macro detection**
   - Pattern matching
   - Macro suggestion
   - Formatted output

4. **Walk through round-trip test**
   - Assemble source
   - Disassemble bytecode
   - Reassemble mnemonics
   - Compare results

### Teaching Tips

1. **Emphasize the reverse process**
   - Disassembler is assembler in reverse
   - Same opcode table, different direction
   - Useful for debugging

2. **Show real-world parallels**
   - Real disassemblers (objdump, javap)
   - Same principles apply
   - Used in debugging tools

3. **Demonstrate round-trip testing**
   - Powerful verification technique
   - Catches bugs in both directions
   - Essential for compiler development

4. **Explain pattern detection**
   - Makes disassembly more readable
   - Shows macro usage
   - Helps understand compiled code

---

## Technical Details

### Disassembly Algorithm

```
1. Create opcode value → OpcodeInfo map
2. Initialize address counter
3. While not at end of bytecode:
   a. Read opcode byte
   b. Look up opcode info
   c. If opcode needs operands, read them
   d. Build mnemonic string
   e. Store disassembly line
   f. Advance address counter
4. Return disassembly lines
```

### Pattern Detection

**INC Pattern:**
- `PUSH 1` followed by `ADD`
- Replace with `INC` macro

**DEC Pattern:**
- `PUSH -1` followed by `ADD`
- Replace with `DEC` macro

**NEG Pattern:**
- `PUSH -1` followed by `MUL`
- Replace with `NEG` macro

### Round-Trip Testing

```
Source Code
  ↓ (assemble)
Bytecode
  ↓ (disassemble)
Mnemonics
  ↓ (assemble)
Bytecode'
  ↓ (compare)
Bytecode === Bytecode'?
```

---

## Episode Checklist

- [x] Implement disassembler core algorithm
- [x] Add pretty printing with formatting options
- [x] Implement macro pattern detection
- [x] Add round-trip testing
- [x] Create interactive UI for disassembler
- [x] Handle errors gracefully
- [x] Write comprehensive lesson script
- [x] Test with various bytecode examples

---

**End of Episode 10 Script**

