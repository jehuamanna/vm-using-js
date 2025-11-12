/**
 * Episode 1-2: Tiny VM with Control Flow
 * A minimal stack-based virtual machine implementation
 */

// Opcodes
const OPCODES = {
  PUSH: 0x01,
  ADD: 0x02,
  SUB: 0x03,
  MUL: 0x04,
  PRINT: 0x05,
  JMP: 0x06,        // Episode 2: Unconditional jump
  JMP_IF_ZERO: 0x07, // Episode 2: Jump if top of stack is zero
  JMP_IF_NEG: 0x08,  // Episode 2: Jump if top of stack is negative
  HALT: 0x00
};

class TinyVM {
  constructor() {
    this.stack = [];
    this.pc = 0; // Program counter
    this.running = false;
    this.output = [];
  }

  /**
   * Push a value onto the stack
   */
  push(value) {
    this.stack.push(value);
  }

  /**
   * Pop a value from the stack
   */
  pop() {
    if (this.stack.length === 0) {
      throw new Error('Stack underflow');
    }
    return this.stack.pop();
  }

  /**
   * Execute a bytecode program
   */
  execute(bytecode) {
    this.pc = 0;
    this.running = true;
    this.output = [];

    while (this.running && this.pc < bytecode.length) {
      const opcode = bytecode[this.pc];

      switch (opcode) {
        case OPCODES.PUSH:
          this.pc++;
          const value = bytecode[this.pc];
          this.push(value);
          this.pc++;
          break;

        case OPCODES.ADD:
          const b = this.pop();
          const a = this.pop();
          this.push(a + b);
          this.pc++;
          break;

        case OPCODES.SUB:
          const subB = this.pop();
          const subA = this.pop();
          this.push(subA - subB);
          this.pc++;
          break;

        case OPCODES.MUL:
          const mulB = this.pop();
          const mulA = this.pop();
          this.push(mulA * mulB);
          this.pc++;
          break;

        case OPCODES.PRINT:
          const val = this.pop();
          this.output.push(val);
          console.log(val);
          this.pc++;
          break;

        case OPCODES.JMP:
          // Unconditional jump: read address and set PC
          this.pc++;
          const jumpAddr = bytecode[this.pc];
          if (jumpAddr < 0 || jumpAddr >= bytecode.length) {
            throw new Error(`Invalid jump address: ${jumpAddr}`);
          }
          this.pc = jumpAddr;
          break;

        case OPCODES.JMP_IF_ZERO:
          // Jump if top of stack is zero
          this.pc++;
          const zeroAddr = bytecode[this.pc];
          const topValue = this.pop();
          if (topValue === 0) {
            if (zeroAddr < 0 || zeroAddr >= bytecode.length) {
              throw new Error(`Invalid jump address: ${zeroAddr}`);
            }
            this.pc = zeroAddr;
          } else {
            this.pc++;
          }
          break;

        case OPCODES.JMP_IF_NEG:
          // Jump if top of stack is negative
          this.pc++;
          const negAddr = bytecode[this.pc];
          const checkValue = this.pop();
          if (checkValue < 0) {
            if (negAddr < 0 || negAddr >= bytecode.length) {
              throw new Error(`Invalid jump address: ${negAddr}`);
            }
            this.pc = negAddr;
          } else {
            this.pc++;
          }
          break;

        case OPCODES.HALT:
          this.running = false;
          this.pc++;
          break;

        default:
          throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`);
      }
    }

    return this.output;
  }

  /**
   * Reset the VM state
   */
  reset() {
    this.stack = [];
    this.pc = 0;
    this.running = false;
    this.output = [];
  }
}

// Export for use in browser (ES modules) or Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TinyVM, OPCODES };
}

// ES module export for browser
export { TinyVM, OPCODES };

