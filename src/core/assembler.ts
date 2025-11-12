/**
 * Episode 6: Simple Assembler
 * Converts human-readable opcodes to bytecode
 */

import { OPCODES } from './vm'

export interface OpcodeInfo {
  name: string
  value: number
  description: string
  operands: number
  example: string
}

export const OPCODE_REFERENCE: OpcodeInfo[] = [
  { name: 'HALT', value: 0x00, description: 'Stop execution', operands: 0, example: 'HALT' },
  { name: 'PUSH', value: 0x01, description: 'Push value onto stack', operands: 1, example: 'PUSH 5' },
  { name: 'ADD', value: 0x02, description: 'Pop two values, push their sum', operands: 0, example: 'ADD' },
  { name: 'SUB', value: 0x03, description: 'Pop two values, push their difference (a - b)', operands: 0, example: 'SUB' },
  { name: 'MUL', value: 0x04, description: 'Pop two values, push their product', operands: 0, example: 'MUL' },
  { name: 'PRINT', value: 0x05, description: 'Pop value and print it', operands: 0, example: 'PRINT' },
  { name: 'JMP', value: 0x06, description: 'Jump to address', operands: 1, example: 'JMP 10' },
  { name: 'JMP_IF_ZERO', value: 0x07, description: 'Jump if top of stack is zero', operands: 1, example: 'JMP_IF_ZERO 10' },
  { name: 'JMP_IF_NEG', value: 0x08, description: 'Jump if top of stack is negative', operands: 1, example: 'JMP_IF_NEG 10' },
  { name: 'LOAD', value: 0x09, description: 'Load value from memory address', operands: 1, example: 'LOAD 0' },
  { name: 'STORE', value: 0x0A, description: 'Store value to memory address', operands: 1, example: 'STORE 0' },
  { name: 'READ', value: 0x0B, description: 'Read value from input queue', operands: 0, example: 'READ' },
  { name: 'CALL', value: 0x0C, description: 'Call function at address', operands: 1, example: 'CALL 10' },
  { name: 'RET', value: 0x0D, description: 'Return from function', operands: 0, example: 'RET' },
  { name: 'LOAD_LOCAL', value: 0x0E, description: 'Load from frame-relative local variable', operands: 1, example: 'LOAD_LOCAL 0' },
  { name: 'STORE_LOCAL', value: 0x0F, description: 'Store to frame-relative local variable', operands: 1, example: 'STORE_LOCAL 0' },
]

// Reverse lookup: opcode name to value
const OPCODE_MAP: Map<string, number> = new Map(
  OPCODE_REFERENCE.map(op => [op.name.toUpperCase(), op.value])
)

/**
 * Assemble text opcodes into bytecode array
 */
export function assemble(source: string): { bytecode: number[], errors: string[] } {
  const lines = source.split('\n')
  const bytecode: number[] = []
  const errors: string[] = []
  const labels: Map<string, number> = new Map()
  
  // First pass: collect labels
  let address = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//')) continue
    
    // Check for label (ends with :)
    if (line.endsWith(':')) {
      const label = line.slice(0, -1).trim()
      labels.set(label, address)
      continue
    }
    
    const parts = line.split(/\s+/)
    const opcodeName = parts[0].toUpperCase()
    
    if (!OPCODE_MAP.has(opcodeName)) {
      errors.push(`Line ${i + 1}: Unknown opcode "${opcodeName}"`)
      continue
    }
    
    const opcode = OPCODE_MAP.get(opcodeName)!
    const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === opcode)!
    
    address++ // Opcode
    if (opcodeInfo.operands > 0) {
      address += opcodeInfo.operands
    }
  }
  
  // Second pass: assemble
  address = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//')) continue
    
    // Skip labels (already processed)
    if (line.endsWith(':')) continue
    
    const parts = line.split(/\s+/)
    const opcodeName = parts[0].toUpperCase()
    
    if (!OPCODE_MAP.has(opcodeName)) {
      continue // Error already reported
    }
    
    const opcode = OPCODE_MAP.get(opcodeName)!
    const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === opcode)!
    
    bytecode.push(opcode)
    address++
    
    // Handle operands
    if (opcodeInfo.operands > 0) {
      if (parts.length < 2) {
        errors.push(`Line ${i + 1}: ${opcodeName} requires ${opcodeInfo.operands} operand(s)`)
        continue
      }
      
      const operandStr = parts[1]
      
      // Check if it's a label
      if (labels.has(operandStr)) {
        bytecode.push(labels.get(operandStr)!)
      } else {
        // Try to parse as number
        const operand = parseFloat(operandStr)
        if (isNaN(operand)) {
          errors.push(`Line ${i + 1}: Invalid operand "${operandStr}"`)
          continue
        }
        bytecode.push(operand)
      }
      address++
    }
  }
  
  return { bytecode, errors }
}

