/**
 * Episode 10: Bytecode Disassembler & Pretty Printer
 * Converts bytecode arrays back to human-readable mnemonics
 */

import { OPCODE_REFERENCE, MACROS } from './assembler'

export interface DisassemblyLine {
  address: number
  opcode: number
  mnemonic: string
  operands: number[]
  rawBytes: number[]
  comment?: string
}

export interface DisassemblyResult {
  lines: DisassemblyLine[]
  errors: string[]
  formatted: string
}

/**
 * Disassemble bytecode array into human-readable mnemonics
 */
export function disassemble(bytecode: number[]): DisassemblyResult {
  const lines: DisassemblyLine[] = []
  const errors: string[] = []
  let i = 0

  // Create reverse lookup: opcode value -> OpcodeInfo
  const opcodeMap = new Map<number, typeof OPCODE_REFERENCE[0]>()
  for (const op of OPCODE_REFERENCE) {
    opcodeMap.set(op.value, op)
  }

  while (i < bytecode.length) {
    const address = i
    const opcode = bytecode[i]
    const opcodeInfo = opcodeMap.get(opcode)

    if (!opcodeInfo) {
      errors.push(`Unknown opcode 0x${opcode.toString(16).padStart(2, '0')} at address ${address}`)
      lines.push({
        address,
        opcode,
        mnemonic: `UNKNOWN(0x${opcode.toString(16).padStart(2, '0')})`,
        operands: [],
        rawBytes: [opcode]
      })
      i++
      continue
    }

    const rawBytes: number[] = [opcode]
    const operands: number[] = []

    // Read operands if needed
    if (opcodeInfo.operands > 0) {
      for (let j = 0; j < opcodeInfo.operands; j++) {
        i++
        if (i >= bytecode.length) {
          errors.push(`Incomplete instruction at address ${address}: expected ${opcodeInfo.operands} operand(s)`)
          break
        }
        rawBytes.push(bytecode[i])
        operands.push(bytecode[i])
      }
    }

    // Build mnemonic string
    let mnemonic = opcodeInfo.name
    if (operands.length > 0) {
      mnemonic += ' ' + operands.join(' ')
    }

    lines.push({
      address,
      opcode,
      mnemonic,
      operands,
      rawBytes
    })

    i++
  }

  // Format the disassembly
  const formatted = formatDisassembly(lines)

  return { lines, errors, formatted }
}

/**
 * Format disassembly lines into a pretty-printed string
 */
export function formatDisassembly(lines: DisassemblyLine[], options?: {
  showAddresses?: boolean
  showRawBytes?: boolean
  showComments?: boolean
  indent?: number
}): string {
  const {
    showAddresses = true,
    showRawBytes = false,
    showComments = true,
    indent = 0
  } = options || {}

  const indentStr = ' '.repeat(indent)
  const formatted: string[] = []

  for (const line of lines) {
    const parts: string[] = []

    // Address (hex)
    if (showAddresses) {
      parts.push(`0x${line.address.toString(16).padStart(4, '0')}:`)
    }

    // Raw bytes (hex)
    if (showRawBytes) {
      const bytesStr = line.rawBytes
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' ')
      parts.push(`[${bytesStr.padEnd(20)}]`)
    }

    // Mnemonic
    parts.push(line.mnemonic.padEnd(20))

    // Comment
    if (showComments) {
      const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === line.opcode)
      if (opcodeInfo) {
        parts.push(`// ${opcodeInfo.description}`)
      }
    }

    formatted.push(indentStr + parts.join(' '))
  }

  return formatted.join('\n')
}

/**
 * Detect macro patterns in disassembly and suggest macro usage
 */
export function detectMacroPatterns(lines: DisassemblyLine[]): Map<number, string> {
  const suggestions = new Map<number, string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for INC pattern: PUSH 1, ADD
    if (line.mnemonic === 'PUSH 1' && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.mnemonic === 'ADD') {
        suggestions.set(i, 'INC')
        suggestions.set(i + 1, '// (part of INC macro)')
      }
    }

    // Check for DEC pattern: PUSH -1, ADD
    if (line.mnemonic === 'PUSH -1' && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.mnemonic === 'ADD') {
        suggestions.set(i, 'DEC')
        suggestions.set(i + 1, '// (part of DEC macro)')
      }
    }

    // Check for NEG pattern: PUSH -1, MUL
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

/**
 * Format disassembly with macro suggestions
 */
export function formatDisassemblyWithMacros(lines: DisassemblyLine[]): string {
  const suggestions = detectMacroPatterns(lines)
  const formatted: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const suggestion = suggestions.get(i)

    if (suggestion) {
      if (suggestion.startsWith('//')) {
        // This is a comment for a macro part
        formatted.push(`0x${line.address.toString(16).padStart(4, '0')}: ${line.mnemonic.padEnd(20)} ${suggestion}`)
      } else {
        // This is a macro suggestion
        formatted.push(`0x${line.address.toString(16).padStart(4, '0')}: ${suggestion.padEnd(20)} // Macro: ${line.mnemonic} + ${lines[i + 1]?.mnemonic || ''}`)
        i++ // Skip next line as it's part of the macro
        continue
      }
    } else {
      const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === line.opcode)
      const comment = opcodeInfo ? `// ${opcodeInfo.description}` : ''
      formatted.push(`0x${line.address.toString(16).padStart(4, '0')}: ${line.mnemonic.padEnd(20)} ${comment}`)
    }
  }

  return formatted.join('\n')
}

/**
 * Convert disassembly back to source code format (for round-trip testing)
 */
export function disassemblyToSource(lines: DisassemblyLine[]): string {
  return lines.map(line => line.mnemonic).join('\n')
}

/**
 * Pretty print bytecode array in multiple formats
 */
export function prettyPrintBytecode(bytecode: number[], format: 'hex' | 'decimal' | 'mixed' = 'mixed'): string {
  if (format === 'hex') {
    return '[' + bytecode.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ') + ']'
  } else if (format === 'decimal') {
    return '[' + bytecode.join(', ') + ']'
  } else {
    // Mixed: show opcodes as hex, operands as decimal
    const parts: string[] = []
    let i = 0
    const opcodeMap = new Map<number, typeof OPCODE_REFERENCE[0]>()
    for (const op of OPCODE_REFERENCE) {
      opcodeMap.set(op.value, op)
    }

    while (i < bytecode.length) {
      const opcode = bytecode[i]
      const opcodeInfo = opcodeMap.get(opcode)
      parts.push(`0x${opcode.toString(16).padStart(2, '0')}`)
      i++

      if (opcodeInfo && opcodeInfo.operands > 0) {
        for (let j = 0; j < opcodeInfo.operands; j++) {
          if (i < bytecode.length) {
            parts.push(bytecode[i].toString())
            i++
          }
        }
      }
    }

    return '[' + parts.join(', ') + ']'
  }
}

