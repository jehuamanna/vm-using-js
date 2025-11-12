# Episode 7: Bytecode Compiler - Line-by-Line YouTube Script

## [00:00 - 02:00] INTRO

Hey everyone! Welcome to Episode 7.

Last time, we added error handling and debugging tools.

Today, we're taking our assembler to the next level by adding macros.

Right now, to increment a value, you have to write:

PUSH 1
ADD

That's two instructions for something so simple!

Macros let us write just INC instead.

The compiler automatically expands it into the full sequence.

We'll cover:

What macros are and why they're useful.

Implementing macro expansion.

Common macros like INC, DEC, NEG, SWAP, and more.

And how the compilation process works.

Let's build a better compiler!

---

## [02:00 - 07:00] WHAT ARE MACROS?

Macros are text substitutions that happen during compilation.

Think of them as shortcuts or abbreviations.

For example, instead of writing:

PUSH 1
ADD

We can write:

INC

The compiler sees INC, looks up its definition, and replaces it with the expanded code before assembling.

### Why Use Macros?

Number one: Readability.

INC is clearer than PUSH 1 semicolon ADD.

Number two: Conciseness.

Fewer lines of code.

Number three: Consistency.

Everyone uses the same pattern.

Number four: Maintainability.

Change the macro definition once, and it affects all uses.

### Common Macro Patterns

Let's look at some useful macros:

INC: Increment, which means add 1.

It expands to PUSH 1 semicolon ADD.

DEC: Decrement, which means subtract 1.

It expands to PUSH negative 1 semicolon ADD.

NEG: Negate, which means multiply by negative 1.

It expands to PUSH negative 1 semicolon MUL.

DUP: Duplicate top of stack.

SWAP: Swap top two stack values.

POP: Pop and discard value.

These are operations we do all the time, so having macros makes programming much easier!

---

## [07:00 - 14:00] IMPLEMENTING MACRO EXPANSION

Let's implement macro expansion in our assembler.

We'll add a macro system that expands macros before assembling.

### Macro Definition

First, we define our macros.

We create an interface called Macro.

It has three properties:

Name: a string, which is the macro identifier.

Description: a string, which explains what it does.

And expand: a function that takes operands and returns an array of strings.

The expand function returns the expanded opcodes.

Here's our MACROS array:

We have INC.

Name: 'INC'.

Description: 'Increment value on stack, add 1'.

Expand function returns: 'PUSH 1' and 'ADD'.

Next, we have DEC.

Name: 'DEC'.

Description: 'Decrement value on stack, subtract 1'.

Expand function returns: 'PUSH negative 1' and 'ADD'.

Then NEG.

Name: 'NEG'.

Description: 'Negate value on stack, multiply by negative 1'.

Expand function returns: 'PUSH negative 1' and 'MUL'.

And we have more macros like DUP, SWAP, and POP.

Each macro has a name, description, and expand function.

### Expansion Process

The expansion happens in two phases:

Phase one: Preprocessing. Expand all macros.

Phase two: Assembly. Convert expanded code to bytecode.

Here's the expandMacros function:

We split the source into lines.

We create an empty array called expanded.

Then we loop through each line.

For each line, we trim it and split by whitespace.

We get the first part, which is the name, and convert it to uppercase.

We check if this name exists in our MACRO_MAP.

If it does, we get the macro.

We call the expand function with any operands.

We add a comment showing the original line.

Then we add all the expanded lines.

If it's not a macro, we just keep the line as-is.

Finally, we join all the expanded lines and return them.

This function scans each line, checks if it's a macro, expands it if yes, and keeps it as-is if no.

### Integration

We integrate macro expansion into our assemble function.

Step one: Expand macros.

We call expandMacros with the source code.

Step two: Assemble the expanded code.

We call assembleExpanded with the expanded source.

We return the bytecode, errors, and the expanded source.

Now we can see both the original source and the expanded code!

---

## [14:00 - 20:00] DEMO: USING MACROS

Let's see macros in action!

We'll write a simple program using macros and watch them expand.

### Example 1: Increment and Decrement

Here's our original code:

PUSH 5
INC
PRINT
PUSH 10
DEC
PRINT
HALT

After macro expansion, it becomes:

PUSH 5
Comment: Macro: INC
PUSH 1
ADD
PRINT
PUSH 10
Comment: Macro: DEC
PUSH negative 1
ADD
PRINT
HALT

See how INC expanded to PUSH 1 semicolon ADD?

And DEC expanded to PUSH negative 1 semicolon ADD?

The compiler automatically:

Number one: Recognizes the macros.

Number two: Expands them.

Number three: Assembles the result.

Number four: Runs the program.

### Example 2: Negation

Here's another example.

Original code:

PUSH 42
NEG
PRINT
HALT

After expansion:

PUSH 42
Comment: Macro: NEG
PUSH negative 1
MUL
PRINT
HALT

Much cleaner!

The macro makes the intent clear: we're negating the value.

### Benefits

Notice how:

The code is more readable.

We write less code.

The intent is clearer.

And we can see the expansion if needed.

This is exactly how real assemblers work—they have macros for common patterns!

---

## [20:00 - 24:00] MACRO EXAMPLES & PATTERNS

Let's look at more macro patterns and how they're useful.

### Common Macros

INC and DEC: Increment and decrement.

These are used constantly in loops and counters.

They make code much cleaner.

NEG: Negate.

This is a common operation.

It's clearer than PUSH negative 1 semicolon MUL.

SWAP: Swap top two stack values.

This is useful for reordering operands.

It expands to multiple STORE and LOAD operations.

POP: Pop and discard.

Sometimes you just want to remove a value.

It expands to STORE to an unused memory address.

### When to Use Macros

Use macros when:

You repeat the same opcode sequence often.

The sequence has a clear semantic meaning.

Or you want to make code more readable.

Don't use macros when:

The sequence is only used once.

The macro would be confusing.

Or you need fine-grained control.

### Real-World Parallels

Real assemblers have tons of macros.

In x86, we have MOV, PUSH, POP.

These are actually instructions, but many are macros.

ARM has various convenience macros.

LLVM has intrinsic functions that expand to multiple instructions.

The principle is the same: make common patterns easier to write!

---

## [24:00 - 26:00] COMPILATION PROCESS RECAP

Let's recap the complete compilation process:

Step one: Source Code.

Human-readable opcodes and macros.

For example:

PUSH 5
INC
PRINT

Step two: Macro Expansion.

Expand all macros.

It becomes:

PUSH 5
PUSH 1
ADD
PRINT

Step three: Label Resolution.

Resolve all labels to addresses.

First pass: collect labels.

Second pass: replace label references with addresses.

Step four: Assembly.

Convert to bytecode.

The result is an array of numbers.

Step five: Execution.

Run on the VM.

This is a simplified version of what real compilers do, but the principles are the same!

---

## [26:00 - 27:00] WHAT'S NEXT?

We've built a complete compiler with macro support!

But there's still more to explore:

Optimizations: Make programs run faster.

JIT Compilation: Just-In-Time compilation techniques.

Better error messages: More helpful compiler errors.

More macros: Add your own custom macros.

In the next episode, we'll explore optimizations and JIT basics.

We'll learn different interpreter styles and how modern VMs make programs run faster.

But for now, we have a fully functional compiler that can:

Assemble opcodes.

Expand macros.

Resolve labels.

Generate bytecode.

And show expanded source.

That's a complete compilation pipeline!

---

## [27:00 - 28:00] SUMMARY & OUTRO

Today we:

Learned what macros are and why they're useful.

Implemented macro expansion in our assembler.

Added common macros: INC, DEC, NEG, SWAP, and POP.

Saw how macros make code more readable.

And understood the complete compilation process.

Macros are a powerful tool that makes programming easier.

They're used in every real assembler and compiler.

Thanks for watching!

Don't forget to like, subscribe, and hit the bell for notifications.

Try writing your own programs with macros.

See you in the next episode!

---

## VISUAL CUES & DEMO NOTES

[Show title card with Episode 7: Bytecode Compiler]

[Show code comparison: with macros vs without macros]

[Show macro definitions in code editor]

[Show expandMacros function implementation]

[Show live demo: write code with INC macro]

[Show expanded source code side-by-side]

[Show program execution and output]

[Show multiple macro examples]

[Show compilation pipeline diagram]

[Show summary checklist]

[Show subscribe reminder]

---

END OF SCRIPT

