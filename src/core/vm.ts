/**
 * Episode 1-3: Tiny VM with Control Flow and Memory
 * A minimal stack-based virtual machine implementation
 */

// Opcodes
export const OPCODES = {
  PUSH: 0x01,
  ADD: 0x02,
  SUB: 0x03,
  MUL: 0x04,
  PRINT: 0x05,
  JMP: 0x06,        // Episode 2: Unconditional jump
  JMP_IF_ZERO: 0x07, // Episode 2: Jump if top of stack is zero
  JMP_IF_NEG: 0x08,  // Episode 2: Jump if top of stack is negative
  LOAD: 0x09,        // Episode 3: Load value from memory address
  STORE: 0x0A,       // Episode 3: Store value to memory address
  HALT: 0x00
} as const;

export type Opcode = typeof OPCODES[keyof typeof OPCODES];

export class TinyVM {
  stack: number[] = [];
  memory: number[];
  pc: number = 0;
  running: boolean = false;
  output: number[] = [];

  constructor(memorySize: number = 256) {
    this.memory = new Array(memorySize).fill(0);
  }

  /**
   * Push a value onto the stack
   */
  push(value: number): void {
    this.stack.push(value);
  }

  /**
   * Pop a value from the stack
   */
  pop(): number {
    if (this.stack.length === 0) {
      throw new Error('Stack underflow');
    }
    return this.stack.pop()!;
  }

  /**
   * Execute a bytecode program
   */
  execute(bytecode: number[]): number[] {
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

        case OPCODES.LOAD:
          // Load value from memory address onto stack
          this.pc++;
          const loadAddr = bytecode[this.pc];
          if (loadAddr < 0 || loadAddr >= this.memory.length) {
            throw new Error(`Invalid memory address: ${loadAddr}`);
          }
          this.push(this.memory[loadAddr]);
          this.pc++;
          break;

        case OPCODES.STORE:
          // Store value from stack to memory address
          this.pc++;
          const storeAddr = bytecode[this.pc];
          if (storeAddr < 0 || storeAddr >= this.memory.length) {
            throw new Error(`Invalid memory address: ${storeAddr}`);
          }
          const valueToStore = this.pop();
          this.memory[storeAddr] = valueToStore;
          this.pc++;
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
  reset(): void {
    this.stack = [];
    this.memory.fill(0);
    this.pc = 0;
    this.running = false;
    this.output = [];
  }
}

