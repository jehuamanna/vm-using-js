/**
 * Episode 1-5: Tiny VM with Control Flow, Memory, I/O, and Functions
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
  READ: 0x0B,        // Episode 4: Read value from input
  CALL: 0x0C,        // Episode 5: Call function at address
  RET: 0x0D,         // Episode 5: Return from function
  LOAD_LOCAL: 0x0E,  // Episode 5: Load from frame-relative local variable
  STORE_LOCAL: 0x0F, // Episode 5: Store to frame-relative local variable
  HALT: 0x00
} as const;

export type Opcode = typeof OPCODES[keyof typeof OPCODES];

interface CallFrame {
  returnAddress: number;
  stackPointer: number; // Stack size when function was called
  frameBase: number;    // Base address in memory for local variables
}

export class TinyVM {
  stack: number[] = [];
  memory: number[];
  pc: number = 0;
  running: boolean = false;
  output: number[] = [];
  inputQueue: number[] = []; // Episode 4: Queue for input values
  callStack: CallFrame[] = []; // Episode 5: Call stack for function calls

  constructor(memorySize: number = 256) {
    this.memory = new Array(memorySize).fill(0);
  }

  /**
   * Add input value to the input queue
   */
  addInput(value: number): void {
    this.inputQueue.push(value);
  }

  /**
   * Clear the input queue
   */
  clearInput(): void {
    this.inputQueue = [];
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

        case OPCODES.READ:
          // Read value from input queue and push onto stack
          if (this.inputQueue.length === 0) {
            throw new Error('No input available. Use addInput() to provide input values.');
          }
          const inputValue = this.inputQueue.shift()!;
          this.push(inputValue);
          this.pc++;
          break;

        case OPCODES.CALL:
          // Call function at address: save return address and jump
          this.pc++;
          const callAddr = bytecode[this.pc];
          if (callAddr < 0 || callAddr >= bytecode.length) {
            throw new Error(`Invalid call address: ${callAddr}`);
          }
          // Save return address (next instruction after CALL and its operand)
          const returnAddr = this.pc + 1;
          // Calculate frame base: use call stack depth * 16 to avoid conflicts
          // Each frame gets 16 local variable slots (0-15)
          const frameBase = this.callStack.length * 16;
          // Save current stack pointer and frame base (for frame management)
          this.callStack.push({
            returnAddress: returnAddr,
            stackPointer: this.stack.length,
            frameBase: frameBase
          });
          // Jump to function
          this.pc = callAddr;
          break;

        case OPCODES.RET:
          // Return from function: restore return address
          if (this.callStack.length === 0) {
            throw new Error('RET called but call stack is empty');
          }
          const frame = this.callStack.pop()!;
          // Clear local variables for this frame (optional, for cleanup)
          // In a real VM, we might want to zero out the frame
          // Restore program counter to return address
          this.pc = frame.returnAddress;
          break;

        case OPCODES.LOAD_LOCAL:
          // Load from frame-relative local variable
          this.pc++;
          const localOffset = bytecode[this.pc];
          if (this.callStack.length === 0) {
            throw new Error('LOAD_LOCAL called but no active function frame');
          }
          const currentFrame = this.callStack[this.callStack.length - 1];
          const localAddr = currentFrame.frameBase + localOffset;
          if (localAddr < 0 || localAddr >= this.memory.length) {
            throw new Error(`Invalid local variable address: ${localAddr}`);
          }
          this.push(this.memory[localAddr]);
          this.pc++;
          break;

        case OPCODES.STORE_LOCAL:
          // Store to frame-relative local variable
          this.pc++;
          const storeLocalOffset = bytecode[this.pc];
          if (this.callStack.length === 0) {
            throw new Error('STORE_LOCAL called but no active function frame');
          }
          const currentFrame2 = this.callStack[this.callStack.length - 1];
          const storeLocalAddr = currentFrame2.frameBase + storeLocalOffset;
          if (storeLocalAddr < 0 || storeLocalAddr >= this.memory.length) {
            throw new Error(`Invalid local variable address: ${storeLocalAddr}`);
          }
          const valueToStoreLocal = this.pop();
          this.memory[storeLocalAddr] = valueToStoreLocal;
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
    this.inputQueue = [];
    this.callStack = [];
  }
}

