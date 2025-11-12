# TinyVM Opcodes Reference

Complete list of all available opcodes for the TinyVM.

## Stack Operations

### `PUSH <value>` (0x01)
Push a value onto the stack.
- **Operands:** 1 (the value to push)
- **Example:** `PUSH 5` - Pushes 5 onto the stack
- **Stack effect:** `[] -> [value]`

### `ADD` (0x02)
Pop two values, add them, push the result.
- **Operands:** 0
- **Example:** `ADD` - Adds top two stack values
- **Stack effect:** `[a, b] -> [a+b]`

### `SUB` (0x03)
Pop two values, subtract (a - b), push the result.
- **Operands:** 0
- **Example:** `SUB` - Subtracts top two stack values
- **Stack effect:** `[a, b] -> [a-b]`

### `MUL` (0x04)
Pop two values, multiply them, push the result.
- **Operands:** 0
- **Example:** `MUL` - Multiplies top two stack values
- **Stack effect:** `[a, b] -> [a*b]`

## Control Flow

### `JMP <address>` (0x06)
Unconditionally jump to an address.
- **Operands:** 1 (target address)
- **Example:** `JMP 10` - Jumps to bytecode address 10
- **Stack effect:** None

### `JMP_IF_ZERO <address>` (0x07)
Jump if top of stack is zero (pops the value).
- **Operands:** 1 (target address)
- **Example:** `JMP_IF_ZERO 10` - Jumps to address 10 if top of stack is 0
- **Stack effect:** `[value] -> []` (if zero, jumps; otherwise continues)

### `JMP_IF_NEG <address>` (0x08)
Jump if top of stack is negative (pops the value).
- **Operands:** 1 (target address)
- **Example:** `JMP_IF_NEG 10` - Jumps to address 10 if top of stack is negative
- **Stack effect:** `[value] -> []` (if negative, jumps; otherwise continues)

## Memory Operations

### `LOAD <address>` (0x09)
Load value from memory address and push onto stack.
- **Operands:** 1 (memory address)
- **Example:** `LOAD 0` - Loads value from memory[0] onto stack
- **Stack effect:** `[] -> [memory[address]]`

### `STORE <address>` (0x0A)
Pop value from stack and store in memory address.
- **Operands:** 1 (memory address)
- **Example:** `STORE 0` - Stores top of stack to memory[0]
- **Stack effect:** `[value] -> []`

## Input/Output

### `READ` (0x0B)
Read value from input queue and push onto stack.
- **Operands:** 0
- **Example:** `READ` - Reads next value from input queue
- **Stack effect:** `[] -> [input_value]`
- **Note:** Use `vm.addInput(value)` to provide input values

### `PRINT` (0x05)
Pop value from stack and print it.
- **Operands:** 0
- **Example:** `PRINT` - Prints top of stack value
- **Stack effect:** `[value] -> []`
- **Output:** Value is added to VM output array

## Functions

### `CALL <address>` (0x0C)
Call function at address (pushes return address onto call stack).
- **Operands:** 1 (function address)
- **Example:** `CALL 10` - Calls function starting at address 10
- **Stack effect:** None (but creates new call frame)
- **Call stack:** Pushes new frame with return address

### `RET` (0x0D)
Return from function (pops call stack and jumps to return address).
- **Operands:** 0
- **Example:** `RET` - Returns to caller
- **Stack effect:** None (but pops call frame)
- **Call stack:** Pops frame and jumps to return address

### `LOAD_LOCAL <offset>` (0x0E)
Load from frame-relative local variable.
- **Operands:** 1 (local variable offset)
- **Example:** `LOAD_LOCAL 0` - Loads local[0] from current frame
- **Stack effect:** `[] -> [local[offset]]`
- **Note:** Only works inside a function (call stack must not be empty)

### `STORE_LOCAL <offset>` (0x0F)
Store to frame-relative local variable.
- **Operands:** 1 (local variable offset)
- **Example:** `STORE_LOCAL 0` - Stores top of stack to local[0]
- **Stack effect:** `[value] -> []`
- **Note:** Only works inside a function (call stack must not be empty)

## Control

### `HALT` (0x00)
Stop execution.
- **Operands:** 0
- **Example:** `HALT` - Stops the VM
- **Stack effect:** None

## Example Programs

### Simple Addition
```
PUSH 5
PUSH 3
ADD
PRINT
HALT
```
Output: `8`

### Loop (using labels)
```
loop:
PUSH 1
PRINT
JMP loop
HALT
```
Note: This will loop forever. In practice, you'd add a counter.

### Conditional
```
PUSH 5
PUSH 0
SUB
JMP_IF_NEG negative
PUSH 1
PRINT
JMP end
negative:
PUSH -1
PRINT
end:
HALT
```
Output: `1` (if positive) or `-1` (if negative)

### Function Call
```
PUSH 5
CALL 4    // Call function at address 4
PRINT
HALT
PUSH 2    // Function starts here (address 4)
MUL
RET
```
Output: `10`

## Notes

- All addresses are bytecode indices (0-based)
- Labels can be used in assembly (e.g., `loop:`) and will be resolved to addresses
- Comments start with `//`
- Stack operations are LIFO (Last In, First Out)
- Memory addresses are 0-based indices into the memory array
- Local variables are frame-relative (0-15 per frame)
- Each function call gets its own frame with 16 local variable slots

