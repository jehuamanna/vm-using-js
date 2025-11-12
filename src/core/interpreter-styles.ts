/**
 * Episode 8: Different Interpreter Styles
 * Comparing switch-based, dispatch table, and direct threading approaches
 */

import { TinyVM, OPCODES } from './vm'

export interface InterpreterResult {
  output: number[]
  executionTime: number
  instructionsExecuted: number
}

/**
 * Switch-based interpreter (current implementation)
 * Simple but slower due to switch overhead
 */
export class SwitchInterpreter extends TinyVM {
  execute(bytecode: number[], debugMode: boolean = false): number[] {
    this.pc = 0
    this.running = true
    this.output = []
    this.debugMode = debugMode
    this.executionTrace = []

    while (this.running && this.pc < bytecode.length) {
      const opcode = bytecode[this.pc]

      if (this.debugMode) {
        const step = this.createExecutionStep(opcode)
        this.executionTrace.push(step)
        if (this.stepCallback) {
          this.stepCallback(step)
        }
      }

      try {
        switch (opcode) {
          case OPCODES.PUSH:
            this.pc++
            this.push(bytecode[this.pc])
            this.pc++
            break
          case OPCODES.ADD:
            this.push(this.pop() + this.pop())
            this.pc++
            break
          case OPCODES.SUB:
            const subB = this.pop()
            const subA = this.pop()
            this.push(subA - subB)
            this.pc++
            break
          case OPCODES.MUL:
            this.push(this.pop() * this.pop())
            this.pc++
            break
          case OPCODES.PRINT:
            this.output.push(this.pop())
            this.pc++
            break
          case OPCODES.JMP:
            this.pc++
            this.pc = bytecode[this.pc]
            break
          case OPCODES.JMP_IF_ZERO:
            this.pc++
            const zeroAddr = bytecode[this.pc]
            if (this.pop() === 0) {
              this.pc = zeroAddr
            } else {
              this.pc++
            }
            break
          case OPCODES.JMP_IF_NEG:
            this.pc++
            const negAddr = bytecode[this.pc]
            if (this.pop() < 0) {
              this.pc = negAddr
            } else {
              this.pc++
            }
            break
          case OPCODES.LOAD:
            this.pc++
            this.push(this.memory[bytecode[this.pc]])
            this.pc++
            break
          case OPCODES.STORE:
            this.pc++
            this.memory[bytecode[this.pc]] = this.pop()
            this.pc++
            break
          case OPCODES.READ:
            if (this.inputQueue.length === 0) {
              throw new Error('No input available')
            }
            this.push(this.inputQueue.shift()!)
            this.pc++
            break
          case OPCODES.CALL:
            this.pc++
            const callAddr = bytecode[this.pc]
            const returnAddr = this.pc + 1
            const frameBase = this.callStack.length * 16
            this.callStack.push({
              returnAddress: returnAddr,
              stackPointer: this.stack.length,
              frameBase: frameBase
            })
            this.pc = callAddr
            break
          case OPCODES.RET:
            if (this.callStack.length === 0) {
              throw new Error('RET called but call stack is empty')
            }
            const frame = this.callStack.pop()!
            this.pc = frame.returnAddress
            break
          case OPCODES.LOAD_LOCAL:
            this.pc++
            const localOffset = bytecode[this.pc]
            if (this.callStack.length === 0) {
              throw new Error('LOAD_LOCAL called but no active function frame')
            }
            const currentFrame = this.callStack[this.callStack.length - 1]
            const localAddr = currentFrame.frameBase + localOffset
            this.push(this.memory[localAddr])
            this.pc++
            break
          case OPCODES.STORE_LOCAL:
            this.pc++
            const storeLocalOffset = bytecode[this.pc]
            if (this.callStack.length === 0) {
              throw new Error('STORE_LOCAL called but no active function frame')
            }
            const currentFrame2 = this.callStack[this.callStack.length - 1]
            const storeLocalAddr = currentFrame2.frameBase + storeLocalOffset
            this.memory[storeLocalAddr] = this.pop()
            this.pc++
            break
          case OPCODES.HALT:
            this.running = false
            this.pc++
            break
          default:
            throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const opcodeName = this.getOpcodeName(opcode)
        throw new Error(`Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`)
      }
    }

    const endTime = performance.now()
    return this.output
  }
}

/**
 * Dispatch table interpreter
 * Uses function pointers for faster dispatch
 */
export class DispatchTableInterpreter extends TinyVM {
  private handlers: Map<number, () => void> = new Map()

  constructor(memorySize: number = 256) {
    super(memorySize)
    this.setupHandlers()
  }

  private setupHandlers() {
    this.handlers.set(OPCODES.PUSH, () => {
      this.pc++
      this.push(this.bytecode![this.pc])
      this.pc++
    })

    this.handlers.set(OPCODES.ADD, () => {
      this.push(this.pop() + this.pop())
      this.pc++
    })

    this.handlers.set(OPCODES.SUB, () => {
      const b = this.pop()
      const a = this.pop()
      this.push(a - b)
      this.pc++
    })

    this.handlers.set(OPCODES.MUL, () => {
      this.push(this.pop() * this.pop())
      this.pc++
    })

    this.handlers.set(OPCODES.PRINT, () => {
      this.output.push(this.pop())
      this.pc++
    })

    this.handlers.set(OPCODES.JMP, () => {
      this.pc++
      this.pc = this.bytecode![this.pc]
    })

    this.handlers.set(OPCODES.JMP_IF_ZERO, () => {
      this.pc++
      const addr = this.bytecode![this.pc]
      if (this.pop() === 0) {
        this.pc = addr
      } else {
        this.pc++
      }
    })

    this.handlers.set(OPCODES.JMP_IF_NEG, () => {
      this.pc++
      const addr = this.bytecode![this.pc]
      if (this.pop() < 0) {
        this.pc = addr
      } else {
        this.pc++
      }
    })

    this.handlers.set(OPCODES.LOAD, () => {
      this.pc++
      this.push(this.memory[this.bytecode![this.pc]])
      this.pc++
    })

    this.handlers.set(OPCODES.STORE, () => {
      this.pc++
      this.memory[this.bytecode![this.pc]] = this.pop()
      this.pc++
    })

    this.handlers.set(OPCODES.READ, () => {
      if (this.inputQueue.length === 0) {
        throw new Error('No input available')
      }
      this.push(this.inputQueue.shift()!)
      this.pc++
    })

    this.handlers.set(OPCODES.CALL, () => {
      this.pc++
      const callAddr = this.bytecode![this.pc]
      const returnAddr = this.pc + 1
      const frameBase = this.callStack.length * 16
      this.callStack.push({
        returnAddress: returnAddr,
        stackPointer: this.stack.length,
        frameBase: frameBase
      })
      this.pc = callAddr
    })

    this.handlers.set(OPCODES.RET, () => {
      if (this.callStack.length === 0) {
        throw new Error('RET called but call stack is empty')
      }
      const frame = this.callStack.pop()!
      this.pc = frame.returnAddress
    })

    this.handlers.set(OPCODES.LOAD_LOCAL, () => {
      this.pc++
      const offset = this.bytecode![this.pc]
      if (this.callStack.length === 0) {
        throw new Error('LOAD_LOCAL called but no active function frame')
      }
      const frame = this.callStack[this.callStack.length - 1]
      this.push(this.memory[frame.frameBase + offset])
      this.pc++
    })

    this.handlers.set(OPCODES.STORE_LOCAL, () => {
      this.pc++
      const offset = this.bytecode![this.pc]
      if (this.callStack.length === 0) {
        throw new Error('STORE_LOCAL called but no active function frame')
      }
      const frame = this.callStack[this.callStack.length - 1]
      this.memory[frame.frameBase + offset] = this.pop()
      this.pc++
    })

    this.handlers.set(OPCODES.HALT, () => {
      this.running = false
      this.pc++
    })
  }

  private bytecode?: number[]

  execute(bytecode: number[], debugMode: boolean = false): number[] {
    const startTime = performance.now()
    this.bytecode = bytecode
    this.pc = 0
    this.running = true
    this.output = []
    this.debugMode = debugMode
    this.executionTrace = []
    let instructionsExecuted = 0

    while (this.running && this.pc < bytecode.length) {
      const opcode = bytecode[this.pc]
      instructionsExecuted++

      if (this.debugMode) {
        const step = this.createExecutionStep(opcode)
        this.executionTrace.push(step)
        if (this.stepCallback) {
          this.stepCallback(step)
        }
      }

      try {
        const handler = this.handlers.get(opcode)
        if (!handler) {
          throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`)
        }
        handler()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const opcodeName = this.getOpcodeName(opcode)
        throw new Error(`Error at PC=${this.pc} (${opcodeName}): ${errorMessage}`)
      }
    }

    const endTime = performance.now()
    return this.output
  }
}

/**
 * Episode 8: Benchmark different interpreter styles
 */
export function benchmarkInterpreter(
  interpreter: TinyVM,
  bytecode: number[],
  iterations: number = 1000
): InterpreterResult {
  const startTime = performance.now()
  let instructionsExecuted = 0

  for (let i = 0; i < iterations; i++) {
    interpreter.reset()
    try {
      interpreter.execute(bytecode, false)
      instructionsExecuted += bytecode.length
    } catch (error) {
      // Ignore errors for benchmarking
    }
  }

  const endTime = performance.now()
  const executionTime = endTime - startTime

  return {
    output: lastOutput,
    executionTime,
    instructionsExecuted
  }
}

