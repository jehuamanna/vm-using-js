/**
 * Episode 7: Enhanced Bytecode Compiler
 * Converts human-readable opcodes to bytecode with macro support
 */

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
  { name: 'ENTER_TRY', value: 0x10, description: 'Enter try block (address of catch handler)', operands: 1, example: 'ENTER_TRY 20' },
  { name: 'LEAVE_TRY', value: 0x11, description: 'Leave try block', operands: 0, example: 'LEAVE_TRY' },
  { name: 'THROW', value: 0x12, description: 'Throw exception (error code on stack)', operands: 0, example: 'THROW' },
  { name: 'MALLOC', value: 0x13, description: 'Allocate heap memory (size on stack, returns address)', operands: 0, example: 'MALLOC' },
  { name: 'LOAD8', value: 0x14, description: 'Load 8-bit value from heap address', operands: 1, example: 'LOAD8 100' },
  { name: 'LOAD32', value: 0x15, description: 'Load 32-bit value from heap address', operands: 1, example: 'LOAD32 100' },
  { name: 'STORE8', value: 0x16, description: 'Store 8-bit value to heap address', operands: 1, example: 'STORE8 100' },
  { name: 'STORE32', value: 0x17, description: 'Store 32-bit value to heap address', operands: 1, example: 'STORE32 100' },
  { name: 'LOAD32_STACK', value: 0x18, description: 'Load 32-bit value from heap (address on stack)', operands: 0, example: 'LOAD32_STACK' },
  { name: 'STORE32_STACK', value: 0x19, description: 'Store 32-bit value to heap (address on stack)', operands: 0, example: 'STORE32_STACK' },
  { name: 'STORE8_STACK', value: 0x1A, description: 'Store 8-bit value to heap (address on stack)', operands: 0, example: 'STORE8_STACK' },
]

// Reverse lookup: opcode name to value
const OPCODE_MAP: Map<string, number> = new Map(
  OPCODE_REFERENCE.map(op => [op.name.toUpperCase(), op.value])
)

// Episode 7: Macro definitions
export interface Macro {
  name: string
  description: string
  expand: (operands: string[]) => string[]
}

export const MACROS: Macro[] = [
  {
    name: 'INC',
    description: 'Increment value on stack (add 1)',
    expand: () => ['PUSH 1', 'ADD']
  },
  {
    name: 'DEC',
    description: 'Decrement value on stack (subtract 1)',
    expand: () => ['PUSH -1', 'ADD']
  },
  {
    name: 'DUP',
    description: 'Duplicate top of stack',
    expand: () => ['LOAD 0', 'LOAD 0'] // This is a simplified version - real DUP would need stack manipulation
  },
  {
    name: 'NEG',
    description: 'Negate value on stack (multiply by -1)',
    expand: () => ['PUSH -1', 'MUL']
  },
  {
    name: 'SWAP',
    description: 'Swap top two stack values',
    expand: () => [
      'STORE 0',  // Store first value
      'STORE 1',  // Store second value
      'LOAD 1',   // Load second value first
      'LOAD 0'    // Load first value second
    ]
  },
  {
    name: 'POP',
    description: 'Pop and discard top of stack',
    expand: () => ['STORE 255'] // Store to unused memory address (discard)
  },
  {
    name: 'CLEAR',
    description: 'Clear stack (pop all values)',
    expand: () => [] // Would need loop - simplified for now
  }
]

const MACRO_MAP: Map<string, Macro> = new Map(
  MACROS.map(macro => [macro.name.toUpperCase(), macro])
)

/**
 * Episode 7: Expand macros in source code
 */
function expandMacros(source: string): { expanded: string, errors: string[] } {
  const lines = source.split('\n')
  const expanded: string[] = []
  const errors: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Preserve comments and empty lines
    if (!trimmed || trimmed.startsWith('//')) {
      expanded.push(line)
      continue
    }
    
    // Preserve labels
    if (trimmed.endsWith(':')) {
      expanded.push(line)
      continue
    }
    
    const parts = trimmed.split(/\s+/)
    const name = parts[0].toUpperCase()
    
    // Check if it's a macro
    if (MACRO_MAP.has(name)) {
      const macro = MACRO_MAP.get(name)!
      const operands = parts.slice(1)
      const expandedLines = macro.expand(operands)
      
      // Add expanded macro with comment showing original
      expanded.push(`// Macro: ${line.trim()}`)
      expandedLines.forEach(expandedLine => {
        expanded.push(expandedLine)
      })
    } else {
      // Not a macro, keep as-is
      expanded.push(line)
    }
  }
  
  return { expanded: expanded.join('\n'), errors }
}

/**
 * Episode 7: Enhanced assemble function with macro support
 */
export function assemble(source: string): { bytecode: number[], errors: string[], expandedSource?: string } {
  // First, expand macros
  const { expanded, errors: macroErrors } = expandMacros(source)
  const errors: string[] = [...macroErrors]
  
  const lines = expanded.split('\n')
  const bytecode: number[] = []
  const labels: Map<string, number> = new Map()
  
  // First pass: collect labels
  let address = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//')) continue
    
    // Check for label (ends with :)
    if (line.endsWith(':')) {
      const label = line.slice(0, -1).trim()
      if (labels.has(label)) {
        errors.push(`Line ${i + 1}: Duplicate label "${label}"`)
      } else {
        labels.set(label, address)
      }
      continue
    }
    
    const parts = line.split(/\s+/)
    const opcodeName = parts[0].toUpperCase()
    
    if (!OPCODE_MAP.has(opcodeName)) {
      // Check if it's a macro that wasn't expanded (shouldn't happen, but just in case)
      if (!MACRO_MAP.has(opcodeName)) {
        errors.push(`Line ${i + 1}: Unknown opcode or macro "${opcodeName}"`)
      }
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
  
  return { bytecode, errors, expandedSource: expanded }
}

