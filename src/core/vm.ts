/**
 * Episode 1-6: Tiny VM with Control Flow, Memory, I/O, Functions, and Debugging
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
  ENTER_TRY: 0x10,   // Episode 13: Enter try block (address of catch handler)
  LEAVE_TRY: 0x11,   // Episode 13: Leave try block
  THROW: 0x12,       // Episode 13: Throw exception (error code on stack)
  MALLOC: 0x13,      // Episode 16: Allocate heap memory (size on stack, returns address)
  LOAD8: 0x14,       // Episode 16: Load 8-bit value from heap address
  LOAD32: 0x15,      // Episode 16: Load 32-bit value from heap address
  STORE8: 0x16,      // Episode 16: Store 8-bit value to heap address
  STORE32: 0x17,     // Episode 16: Store 32-bit value to heap address
  LOAD32_STACK: 0x18, // Episode 16: Load 32-bit value from heap (address on stack)
  STORE32_STACK: 0x19, // Episode 16: Store 32-bit value to heap (address on stack)
  STORE8_STACK: 0x1A, // Episode 16: Store 8-bit value to heap (address on stack)
  HALT: 0x00
} as const;

export type Opcode = typeof OPCODES[keyof typeof OPCODES];

interface CallFrame {
  returnAddress: number;
  stackPointer: number; // Stack size when function was called
  frameBase: number;    // Base address in memory for local variables
}

interface TryBlock {
  tryStart: number;     // Address where try block starts
  catchHandler: number; // Address of catch handler
  stackPointer: number; // Stack size when try block was entered
}

export interface ExecutionStep {
  pc: number;
  opcode: number;
  opcodeName: string;
  stack: number[];
  memory?: number[];
  callStackDepth: number;
  error?: string;
}

export interface Breakpoint {
  address: number;
  enabled: boolean;
}

export interface Watch {
  name: string;
  type: 'variable' | 'memory' | 'expression';
  address?: number;
  expression?: string;
}

export type StepMode = 'run' | 'step-into' | 'step-over' | 'step-out' | 'paused';

export class TinyVM {
  stack: number[] = [];
  memory: number[];
  heap: Uint8Array; // Episode 16: Heap memory for arrays and strings
  heapSize: number = 1024 * 1024; // 1MB heap
  heapNext: number = 0; // Next free heap address
  pc: number = 0;
  running: boolean = false;
  output: number[] = [];
  inputQueue: number[] = []; // Episode 4: Queue for input values
  callStack: CallFrame[] = []; // Episode 5: Call stack for function calls
  tryStack: TryBlock[] = []; // Episode 13: Stack of active try blocks
  
  // Episode 6: Debugging support
  debugMode: boolean = false;
  executionTrace: ExecutionStep[] = [];
  maxStackSize: number = 1000; // Episode 6: Stack overflow protection
  stepCallback?: (step: ExecutionStep) => void; // Episode 6: Step callback for debugging
  
  // Episode 13: Exception handling
  exceptionThrown: boolean = false;
  exceptionValue: number = 0;
  stackTrace: Array<{ address: number; functionName?: string }> = [];
  
  // Episode 14: Debugger Pro
  breakpoints: Map<number, Breakpoint> = new Map();
  watches: Watch[] = [];
  stepMode: StepMode = 'run';
  paused: boolean = false;
  stepOverDepth: number = -1; // Call stack depth to step over to
  stepOutDepth: number = -1; // Call stack depth to step out to
  pauseOnException: boolean = true;
  currentBytecode: number[] = [];

  constructor(memorySize: number = 256) {
    this.memory = new Array(memorySize).fill(0);
    this.heap = new Uint8Array(this.heapSize);
    this.heapNext = 0;
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
   * Get opcode name for debugging
   */
  protected getOpcodeName(opcode: number): string {
    const entries = Object.entries(OPCODES);
    const entry = entries.find(([_, value]) => value === opcode);
    return entry ? entry[0] : `UNKNOWN(0x${opcode.toString(16)})`;
  }

  /**
   * Create execution step for debugging
   */
  protected createExecutionStep(opcode: number, error?: string): ExecutionStep {
    return {
      pc: this.pc,
      opcode,
      opcodeName: this.getOpcodeName(opcode),
      stack: [...this.stack],
      callStackDepth: this.callStack.length,
      error
    };
  }

  /**
   * Push a value onto the stack
   */
  push(value: number): void {
    if (this.stack.length >= this.maxStackSize) {
      throw new Error(`Stack overflow: stack size (${this.stack.length}) exceeds maximum (${this.maxStackSize})`);
    }
    this.stack.push(value);
  }

  /**
   * Pop a value from the stack
   */
  pop(): number {
    if (this.stack.length === 0) {
      throw new Error('Stack underflow: attempted to pop from empty stack');
    }
    return this.stack.pop()!;
  }

  /**
   * Execute a bytecode program
   */
  execute(bytecode: number[], debugMode: boolean = false, resume: boolean = false): number[] {
    if (!resume) {
      // Only reset if not resuming
      this.pc = 0;
      this.running = true;
      this.output = [];
      this.executionTrace = [];
      this.paused = false;
      this.stepMode = debugMode ? 'step-into' : 'run';
    } else {
      // When resuming, make sure we're not paused
      if (this.paused) {
        this.paused = false;
      }
    }
    this.debugMode = debugMode;
    this.currentBytecode = bytecode;

    // Safety: prevent infinite loops
    let instructionCount = 0;
    const maxInstructions = 100000; // Safety limit

    while (this.running && this.pc < bytecode.length) {
      instructionCount++;
      if (instructionCount > maxInstructions) {
        throw new Error(`Execution exceeded maximum instruction limit (${maxInstructions}). Possible infinite loop at PC=${this.pc}`);
      }
      
      const opcode = bytecode[this.pc];
      
      // Debug: log first 50 instructions to track execution flow
      if (this.debugMode && instructionCount <= 50) {
        console.log(`[VM] PC=${this.pc}, opcode=${opcode} (${this.getOpcodeName(opcode)}), stack=[${this.stack.slice(-5).join(',')}]`);
      }
      
      // Debug: log every 100 instructions to track progress
      if (this.debugMode && instructionCount > 50 && instructionCount % 100 === 0) {
        console.log(`[VM] Executed ${instructionCount} instructions, PC=${this.pc}, opcode=${opcode} (${this.getOpcodeName(opcode)})`);
      }
      
      // Episode 14: Check for breakpoints (before executing)
      if (this.debugMode && this.breakpoints.has(this.pc)) {
        const bp = this.breakpoints.get(this.pc)!;
        if (bp.enabled) {
          this.paused = true;
          this.stepMode = 'paused';
          const step = this.createExecutionStep(opcode);
          this.executionTrace.push(step);
          if (this.stepCallback) {
            this.stepCallback(step);
          }
          // Wait for user to continue
          return this.output;
        }
      }
      
      // Episode 6: Debug mode - record execution step (before executing)
      if (this.debugMode) {
        const step = this.createExecutionStep(opcode);
        this.executionTrace.push(step);
        if (this.stepCallback) {
          this.stepCallback(step);
        }
      }
      
      try {
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
          if (this.debugMode) {
            console.log(`[PRINT] Outputting value: ${val}`);
          }
          this.pc++;
          break;

        case OPCODES.JMP:
          // Unconditional jump: read address and set PC
          this.pc++;
          const jumpAddr = bytecode[this.pc];
          if (jumpAddr < 0 || jumpAddr >= bytecode.length) {
            throw new Error(`Invalid jump address: ${jumpAddr}`);
          }
          if (this.debugMode) {
            console.log(`[JMP] Jumping from PC=${this.pc-1} to ${jumpAddr}`);
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
          if (this.debugMode) {
            console.log(`[JMP_IF_NEG] PC=${this.pc-1}, value=${checkValue}, target=${negAddr}, will jump: ${checkValue < 0}`);
          }
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
          
          // Episode 14: Handle step-over - if stepping over, remember the depth before the call
          if (this.debugMode && this.stepMode === 'step-over' && this.stepOverDepth === -1) {
            // We're about to call a function, remember the depth before the call
            // We'll pause when we return to this depth
            this.stepOverDepth = this.callStack.length;
          }
          
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

        case OPCODES.ENTER_TRY:
          // Enter try block: push try block info onto try stack
          this.pc++;
          const catchHandler = bytecode[this.pc];
          if (catchHandler < 0 || catchHandler >= bytecode.length) {
            throw new Error(`Invalid catch handler address: ${catchHandler}`);
          }
          this.tryStack.push({
            tryStart: this.pc - 1, // Address of ENTER_TRY instruction
            catchHandler: catchHandler,
            stackPointer: this.stack.length
          });
          this.pc++;
          break;

        case OPCODES.LEAVE_TRY:
          // Leave try block: pop from try stack
          if (this.tryStack.length === 0) {
            throw new Error('LEAVE_TRY called but no active try block');
          }
          this.tryStack.pop();
          this.pc++;
          break;

        case OPCODES.THROW:
          // Throw exception: unwind stack and jump to catch handler
          if (this.stack.length === 0) {
            throw new Error('THROW called but stack is empty');
          }
          this.exceptionValue = this.pop();
          this.exceptionThrown = true;
          
          // Build stack trace
          this.stackTrace = [];
          for (const frame of this.callStack) {
            this.stackTrace.push({ address: frame.returnAddress });
          }
          this.stackTrace.push({ address: this.pc });
          
          // Unwind stack to try block's stack pointer
          // Find the innermost try block
          if (this.tryStack.length === 0) {
            // No try block to catch exception - propagate up
            // Unwind all call frames
            while (this.callStack.length > 0) {
              const frame = this.callStack.pop()!;
              // Restore stack to frame's stack pointer
              while (this.stack.length > frame.stackPointer) {
                this.stack.pop();
              }
            }
            // Unwind try blocks
            this.tryStack = [];
            
            // Episode 14: Pause on exception if enabled
            if (this.debugMode && this.pauseOnException) {
              this.paused = true;
              this.stepMode = 'paused';
              const step = this.createExecutionStep(opcode);
              step.error = `Uncaught exception: ${this.exceptionValue}`;
              this.executionTrace.push(step);
              if (this.stepCallback) {
                this.stepCallback(step);
              }
              return this.output;
            }
            
            throw new Error(`Uncaught exception: ${this.exceptionValue}`);
          }
          
          const tryBlock = this.tryStack.pop()!;
          // Unwind stack to try block's stack pointer
          while (this.stack.length > tryBlock.stackPointer) {
            this.stack.pop();
          }
          
          // Unwind all try blocks that are nested inside this one
          while (this.tryStack.length > 0 && this.tryStack[this.tryStack.length - 1].tryStart > tryBlock.tryStart) {
            this.tryStack.pop();
          }
          
          // Jump to catch handler
          this.pc = tryBlock.catchHandler;
          // Push exception value onto stack for catch handler
          this.push(this.exceptionValue);
          this.exceptionThrown = false;
          break;

        case OPCODES.MALLOC:
          // Episode 16: Allocate heap memory
          // Size is on stack, returns heap address
          const size = this.pop();
          if (size < 0) {
            throw new Error(`Invalid allocation size: ${size}`);
          }
          if (this.heapNext + size > this.heapSize) {
            throw new Error(`Heap overflow: cannot allocate ${size} bytes (heap: ${this.heapNext}/${this.heapSize})`);
          }
          const heapAddr = this.heapNext;
          this.heapNext += size;
          // Zero out the allocated memory
          this.heap.fill(0, heapAddr, heapAddr + size);
          this.push(heapAddr);
          if (this.debugMode) {
            console.log(`[MALLOC] Allocated ${size} bytes at heap address ${heapAddr}`);
          }
          this.pc++;
          break;

        case OPCODES.LOAD8:
          // Episode 16: Load 8-bit value from heap
          this.pc++;
          const load8Addr = bytecode[this.pc];
          if (load8Addr < 0 || load8Addr >= this.heapSize) {
            throw new Error(`Invalid heap address for LOAD8: ${load8Addr}`);
          }
          const value8 = this.heap[load8Addr];
          this.push(value8);
          this.pc++;
          break;

        case OPCODES.LOAD32:
          // Episode 16: Load 32-bit value from heap (little-endian)
          this.pc++;
          const load32Addr = bytecode[this.pc];
          if (load32Addr < 0 || load32Addr + 3 >= this.heapSize) {
            throw new Error(`Invalid heap address for LOAD32: ${load32Addr}`);
          }
          // Read 4 bytes as little-endian 32-bit integer
          const value32 = this.heap[load32Addr] |
                         (this.heap[load32Addr + 1] << 8) |
                         (this.heap[load32Addr + 2] << 16) |
                         (this.heap[load32Addr + 3] << 24);
          // Convert unsigned to signed (two's complement)
          const signedValue32 = value32 | 0; // Sign-extend if needed
          this.push(signedValue32);
          this.pc++;
          break;

        case OPCODES.STORE8:
          // Episode 16: Store 8-bit value to heap
          const store8Value = this.pop();
          this.pc++;
          const store8Addr = bytecode[this.pc];
          if (store8Addr < 0 || store8Addr >= this.heapSize) {
            throw new Error(`Invalid heap address for STORE8: ${store8Addr}`);
          }
          this.heap[store8Addr] = store8Value & 0xFF; // Mask to 8 bits
          this.pc++;
          break;

        case OPCODES.STORE32:
          // Episode 16: Store 32-bit value to heap (little-endian)
          const store32Value = this.pop();
          this.pc++;
          const store32Addr = bytecode[this.pc];
          if (store32Addr < 0 || store32Addr + 3 >= this.heapSize) {
            throw new Error(`Invalid heap address for STORE32: ${store32Addr}`);
          }
          // Write 4 bytes as little-endian 32-bit integer
          this.heap[store32Addr] = store32Value & 0xFF;
          this.heap[store32Addr + 1] = (store32Value >> 8) & 0xFF;
          this.heap[store32Addr + 2] = (store32Value >> 16) & 0xFF;
          this.heap[store32Addr + 3] = (store32Value >> 24) & 0xFF;
          this.pc++;
          break;

        case OPCODES.LOAD32_STACK:
          // Episode 16: Load 32-bit value from heap (address on stack)
          const load32StackAddr = this.pop();
          if (load32StackAddr < 0 || load32StackAddr + 3 >= this.heapSize) {
            throw new Error(`Invalid heap address for LOAD32_STACK: ${load32StackAddr}`);
          }
          // Read 4 bytes as little-endian 32-bit integer
          const value32Stack = this.heap[load32StackAddr] |
                             (this.heap[load32StackAddr + 1] << 8) |
                             (this.heap[load32StackAddr + 2] << 16) |
                             (this.heap[load32StackAddr + 3] << 24);
          // Convert unsigned to signed (two's complement)
          const signedValue32Stack = value32Stack | 0;
          if (this.debugMode) {
            console.log(`[LOAD32_STACK] Loaded value ${signedValue32Stack} from heap address ${load32StackAddr}`);
          }
          this.push(signedValue32Stack);
          this.pc++;
          break;

        case OPCODES.STORE32_STACK:
          // Episode 16: Store 32-bit value to heap (address on stack)
          const store32StackValue = this.pop();
          const store32StackAddr = this.pop();
          if (store32StackAddr < 0 || store32StackAddr + 3 >= this.heapSize) {
            throw new Error(`Invalid heap address for STORE32_STACK: ${store32StackAddr}`);
          }
          // Write 4 bytes as little-endian 32-bit integer
          this.heap[store32StackAddr] = store32StackValue & 0xFF;
          this.heap[store32StackAddr + 1] = (store32StackValue >> 8) & 0xFF;
          this.heap[store32StackAddr + 2] = (store32StackValue >> 16) & 0xFF;
          this.heap[store32StackAddr + 3] = (store32StackValue >> 24) & 0xFF;
          if (this.debugMode) {
            console.log(`[STORE32_STACK] Stored value ${store32StackValue} at heap address ${store32StackAddr}`);
          }
          this.pc++;
          break;

        case OPCODES.STORE8_STACK:
          // Episode 16: Store 8-bit value to heap (address on stack)
          const store8StackValue = this.pop();
          const store8StackAddr = this.pop();
          if (store8StackAddr < 0 || store8StackAddr >= this.heapSize) {
            throw new Error(`Invalid heap address for STORE8_STACK: ${store8StackAddr}`);
          }
          this.heap[store8StackAddr] = store8StackValue & 0xFF;
          this.pc++;
          break;

        case OPCODES.HALT:
          if (this.debugMode) {
            console.log(`[HALT] Execution stopped at PC=${this.pc}`);
          }
          this.running = false;
          this.pc++;
          break;

        default:
          throw new Error(`Unknown opcode: 0x${opcode.toString(16)} at PC=${this.pc}`);
      }
      
      // Episode 14: Handle step modes AFTER executing instruction
      if (this.debugMode && this.stepMode !== 'run') {
        if (this.stepMode === 'step-into') {
          // Always pause after executing one instruction
          this.paused = true;
          this.stepMode = 'paused';
        } else if (this.stepMode === 'step-over') {
          // For step-over:
          // - If stepOverDepth is -1, we just started step-over on a non-CALL instruction, so pause now
          // - If stepOverDepth is set, we're stepping over a function call, pause when back at that depth
          if (this.stepOverDepth === -1) {
            // Just started step-over on a non-CALL instruction, pause after one instruction
            this.paused = true;
            this.stepMode = 'paused';
          } else if (this.callStack.length <= this.stepOverDepth) {
            // We're back at or above the depth we started at, pause
            this.paused = true;
            this.stepMode = 'paused';
            this.stepOverDepth = -1;
          }
        } else if (this.stepMode === 'step-out') {
          // Pause if we've returned to a shallower call stack depth
          if (this.stepOutDepth >= 0 && this.callStack.length < this.stepOutDepth) {
            this.paused = true;
            this.stepMode = 'paused';
            this.stepOutDepth = -1;
          }
        }
        
        if (this.paused) {
          // Wait for user to continue
          return this.output;
        }
      }
      
      } catch (error) {
        // Episode 6: Enhanced error handling with context
        const errorMessage = error instanceof Error ? error.message : String(error);
        const opcodeName = this.getOpcodeName(opcode);
        const enhancedError = `Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`;
        
        if (this.debugMode) {
          const errorStep = this.createExecutionStep(opcode, enhancedError);
          this.executionTrace.push(errorStep);
          if (this.stepCallback) {
            this.stepCallback(errorStep);
          }
        }
        
        throw new Error(enhancedError);
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
    this.heap.fill(0); // Episode 16: Reset heap
    this.heapNext = 0; // Episode 16: Reset heap pointer
    this.pc = 0;
    this.running = false;
    this.output = [];
    this.inputQueue = [];
    this.callStack = [];
    this.tryStack = [];
    this.executionTrace = [];
    this.debugMode = false;
    this.exceptionThrown = false;
    this.exceptionValue = 0;
    this.stackTrace = [];
    // Episode 14: Reset debugger state
    this.breakpoints.clear();
    this.watches = [];
    this.stepMode = 'run';
    this.paused = false;
    this.stepOverDepth = -1;
    this.stepOutDepth = -1;
    this.pauseOnException = true;
    this.currentBytecode = [];
  }
  
  /**
   * Episode 13: Get formatted stack trace
   */
  getStackTrace(): string {
    if (this.stackTrace.length === 0) {
      return 'No stack trace available';
    }
    const lines = ['Stack trace:'];
    for (let i = 0; i < this.stackTrace.length; i++) {
      const entry = this.stackTrace[i];
      lines.push(`  at address ${entry.address}${entry.functionName ? ` (${entry.functionName})` : ''}`);
    }
    return lines.join('\n');
  }

  /**
   * Episode 6: Enable debug mode with step callback
   */
  setDebugMode(enabled: boolean, stepCallback?: (step: ExecutionStep) => void): void {
    this.debugMode = enabled;
    this.stepCallback = stepCallback;
  }
  
  /**
   * Episode 6: Get execution trace
   */
  getExecutionTrace(): ExecutionStep[] {
    return [...this.executionTrace];
  }

  /**
   * Episode 14: Debugger Pro - Breakpoint management
   */
  setBreakpoint(address: number, enabled: boolean = true): void {
    this.breakpoints.set(address, { address, enabled });
  }

  removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
  }

  toggleBreakpoint(address: number): void {
    const bp = this.breakpoints.get(address);
    if (bp) {
      bp.enabled = !bp.enabled;
    } else {
      this.setBreakpoint(address, true);
    }
  }

  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Episode 14: Debugger Pro - Watch management
   */
  addWatch(watch: Watch): void {
    this.watches.push(watch);
  }

  removeWatch(index: number): void {
    this.watches.splice(index, 1);
  }

  getWatches(): Watch[] {
    return [...this.watches];
  }

  /**
   * Episode 14: Debugger Pro - Evaluate watch values
   */
  evaluateWatches(): Array<{ watch: Watch; value: number | string }> {
    const results: Array<{ watch: Watch; value: number | string }> = [];
    
    for (const watch of this.watches) {
      try {
        if (watch.type === 'variable' && watch.address !== undefined) {
          // Variable watch - check if it's a local or global
          if (this.callStack.length > 0) {
            // Check if it's a local variable
            const currentFrame = this.callStack[this.callStack.length - 1];
            const localAddr = currentFrame.frameBase + watch.address;
            if (localAddr >= 0 && localAddr < this.memory.length) {
              results.push({ watch, value: this.memory[localAddr] });
              continue;
            }
          }
          // Global variable
          if (watch.address >= 0 && watch.address < this.memory.length) {
            results.push({ watch, value: this.memory[watch.address] });
          } else {
            results.push({ watch, value: 'Invalid address' });
          }
        } else if (watch.type === 'memory' && watch.address !== undefined) {
          // Memory watch
          if (watch.address >= 0 && watch.address < this.memory.length) {
            results.push({ watch, value: this.memory[watch.address] });
          } else {
            results.push({ watch, value: 'Invalid address' });
          }
        } else {
          results.push({ watch, value: 'Not implemented' });
        }
      } catch (error) {
        results.push({ watch, value: `Error: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
    
    return results;
  }

  /**
   * Episode 14: Debugger Pro - Step controls
   */
  stepInto(): void {
    if (this.paused) {
      this.paused = false;
      this.stepMode = 'step-into';
      this.stepOverDepth = -1;
      this.stepOutDepth = -1;
    }
  }

  stepOver(): void {
    if (this.paused) {
      this.paused = false;
      this.stepMode = 'step-over';
      // Set to -1 initially - if the next instruction is a CALL, it will set stepOverDepth
      // Otherwise, we'll pause after executing one instruction
      this.stepOverDepth = -1;
      this.stepOutDepth = -1;
    }
  }

  stepOut(): void {
    if (this.paused && this.callStack.length > 0) {
      this.paused = false;
      this.stepMode = 'step-out';
      this.stepOutDepth = this.callStack.length;
      this.stepOverDepth = -1;
    }
  }

  continue(): void {
    if (this.paused) {
      this.paused = false;
      this.stepMode = 'run';
      this.stepOverDepth = -1;
      this.stepOutDepth = -1;
    }
  }

}

