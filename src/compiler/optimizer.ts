/**
 * Episode 18: Optimizations II
 * Peephole optimizer, dead-code elimination, and function inlining
 */

import { OPCODES } from '../core/vm'

export interface OptimizationResult {
  bytecode: number[]
  optimizations: OptimizationInfo[]
  stats: {
    originalSize: number
    optimizedSize: number
    reduction: number
    reductionPercent: number
  }
}

export interface OptimizationInfo {
  type: 'peephole' | 'dead-code' | 'inlining'
  description: string
  location: number
  before: number[]
  after: number[]
}

/**
 * Apply all optimizations to bytecode
 */
export function optimize(bytecode: number[], functionMap?: Map<string, number>): OptimizationResult {
  let optimized = [...bytecode]
  const optimizations: OptimizationInfo[] = []
  
  // Apply optimizations in order
  const peepholeResult = peepholeOptimize(optimized)
  optimized = peepholeResult.bytecode
  optimizations.push(...peepholeResult.optimizations)
  
  const deadCodeResult = eliminateDeadCode(optimized)
  optimized = deadCodeResult.bytecode
  optimizations.push(...deadCodeResult.optimizations)
  
  if (functionMap) {
    const inliningResult = inlineFunctions(optimized, functionMap)
    optimized = inliningResult.bytecode
    optimizations.push(...inliningResult.optimizations)
  }
  
  const originalSize = bytecode.length
  const optimizedSize = optimized.length
  const reduction = originalSize - optimizedSize
  const reductionPercent = originalSize > 0 ? (reduction / originalSize) * 100 : 0
  
  return {
    bytecode: optimized,
    optimizations,
    stats: {
      originalSize,
      optimizedSize,
      reduction,
      reductionPercent
    }
  }
}

/**
 * Peephole optimizer - optimizes small instruction sequences
 */
function peepholeOptimize(bytecode: number[]): { bytecode: number[], optimizations: OptimizationInfo[] } {
  const optimized: number[] = []
  const optimizations: OptimizationInfo[] = []
  let i = 0
  
  while (i < bytecode.length) {
    const opcode = bytecode[i]
    let optimizedSequence = false
    
    // Pattern 1: PUSH 0, ADD -> no-op (x + 0 = x)
    if (opcode === OPCODES.PUSH && i + 2 < bytecode.length) {
      const value = bytecode[i + 1]
      const nextOpcode = bytecode[i + 2]
      
      if (value === 0 && nextOpcode === OPCODES.ADD) {
        optimizations.push({
          type: 'peephole',
          description: 'Removed PUSH 0, ADD (x + 0 = x)',
          location: i,
          before: [opcode, value, nextOpcode],
          after: []
        })
        i += 3 // Skip PUSH 0, ADD
        optimizedSequence = true
      }
    }
    
    // Pattern 2: PUSH 0, SUB -> NEG (x - 0 = x, but 0 - x = -x)
    // Actually, this is more complex, skip for now
    
    // Pattern 3: PUSH 1, MUL -> no-op (x * 1 = x)
    if (!optimizedSequence && opcode === OPCODES.PUSH && i + 2 < bytecode.length) {
      const value = bytecode[i + 1]
      const nextOpcode = bytecode[i + 2]
      
      if (value === 1 && nextOpcode === OPCODES.MUL) {
        optimizations.push({
          type: 'peephole',
          description: 'Removed PUSH 1, MUL (x * 1 = x)',
          location: i,
          before: [opcode, value, nextOpcode],
          after: []
        })
        i += 3 // Skip PUSH 1, MUL
        optimizedSequence = true
      }
    }
    
    // Pattern 4: PUSH 0, MUL -> PUSH 0 (x * 0 = 0)
    if (!optimizedSequence && opcode === OPCODES.PUSH && i + 2 < bytecode.length) {
      const value = bytecode[i + 1]
      const nextOpcode = bytecode[i + 2]
      
      if (value === 0 && nextOpcode === OPCODES.MUL) {
        optimizations.push({
          type: 'peephole',
          description: 'Replaced PUSH 0, MUL with PUSH 0 (x * 0 = 0)',
          location: i,
          before: [opcode, value, nextOpcode],
          after: [OPCODES.PUSH, 0]
        })
        optimized.push(OPCODES.PUSH, 0)
        i += 3
        optimizedSequence = true
      }
    }
    
    // Pattern 5: PUSH n, PUSH m, ADD -> PUSH (n+m) (constant folding)
    if (!optimizedSequence && opcode === OPCODES.PUSH && i + 4 < bytecode.length) {
      const value1 = bytecode[i + 1]
      const opcode2 = bytecode[i + 2]
      const value2 = bytecode[i + 3]
      const opcode3 = bytecode[i + 4]
      
      if (opcode2 === OPCODES.PUSH && opcode3 === OPCODES.ADD) {
        const result = value1 + value2
        optimizations.push({
          type: 'peephole',
          description: `Constant folding: PUSH ${value1}, PUSH ${value2}, ADD -> PUSH ${result}`,
          location: i,
          before: [opcode, value1, opcode2, value2, opcode3],
          after: [OPCODES.PUSH, result]
        })
        optimized.push(OPCODES.PUSH, result)
        i += 5
        optimizedSequence = true
      }
    }
    
    // Pattern 6: PUSH n, PUSH m, MUL -> PUSH (n*m) (constant folding)
    if (!optimizedSequence && opcode === OPCODES.PUSH && i + 4 < bytecode.length) {
      const value1 = bytecode[i + 1]
      const opcode2 = bytecode[i + 2]
      const value2 = bytecode[i + 3]
      const opcode3 = bytecode[i + 4]
      
      if (opcode2 === OPCODES.PUSH && opcode3 === OPCODES.MUL) {
        const result = value1 * value2
        optimizations.push({
          type: 'peephole',
          description: `Constant folding: PUSH ${value1}, PUSH ${value2}, MUL -> PUSH ${result}`,
          location: i,
          before: [opcode, value1, opcode2, value2, opcode3],
          after: [OPCODES.PUSH, result]
        })
        optimized.push(OPCODES.PUSH, result)
        i += 5
        optimizedSequence = true
      }
    }
    
    // Pattern 7: PUSH n, PUSH m, SUB -> PUSH (n-m) (constant folding)
    if (!optimizedSequence && opcode === OPCODES.PUSH && i + 4 < bytecode.length) {
      const value1 = bytecode[i + 1]
      const opcode2 = bytecode[i + 2]
      const value2 = bytecode[i + 3]
      const opcode3 = bytecode[i + 4]
      
      if (opcode2 === OPCODES.PUSH && opcode3 === OPCODES.SUB) {
        const result = value1 - value2
        optimizations.push({
          type: 'peephole',
          description: `Constant folding: PUSH ${value1}, PUSH ${value2}, SUB -> PUSH ${result}`,
          location: i,
          before: [opcode, value1, opcode2, value2, opcode3],
          after: [OPCODES.PUSH, result]
        })
        optimized.push(OPCODES.PUSH, result)
        i += 5
        optimizedSequence = true
      }
    }
    
    // Pattern 8: STORE addr, LOAD addr -> no-op (if no side effects between)
    // This is more complex and requires data flow analysis, skip for now
    
    if (!optimizedSequence) {
      // No optimization matched, keep the instruction
      optimized.push(opcode)
      if (opcode === OPCODES.PUSH || opcode === OPCODES.JMP || opcode === OPCODES.JMP_IF_ZERO || 
          opcode === OPCODES.JMP_IF_NEG || opcode === OPCODES.CALL || opcode === OPCODES.LOAD ||
          opcode === OPCODES.STORE || opcode === OPCODES.LOAD_LOCAL || opcode === OPCODES.STORE_LOCAL ||
          opcode === OPCODES.ENTER_TRY || opcode === OPCODES.LOAD8 || opcode === OPCODES.LOAD32 ||
          opcode === OPCODES.STORE8 || opcode === OPCODES.STORE32) {
        optimized.push(bytecode[i + 1])
        i += 2
      } else {
        i++
      }
    }
  }
  
  return { bytecode: optimized, optimizations }
}

/**
 * Dead-code elimination - removes unreachable code
 */
function eliminateDeadCode(bytecode: number[]): { bytecode: number[], optimizations: OptimizationInfo[] } {
  const optimized: number[] = []
  const optimizations: OptimizationInfo[] = []
  const reachable = new Set<number>()
  
  // Mark all reachable addresses starting from 0
  const worklist: number[] = [0]
  reachable.add(0)
  
  while (worklist.length > 0) {
    const addr = worklist.shift()!
    
    if (addr >= bytecode.length) continue
    
    const opcode = bytecode[addr]
    
    // Mark this instruction as reachable
    reachable.add(addr)
    
    // Handle instructions with operands
    let nextAddr = addr + 1
    if (opcode === OPCODES.PUSH || opcode === OPCODES.JMP || opcode === OPCODES.JMP_IF_ZERO || 
        opcode === OPCODES.JMP_IF_NEG || opcode === OPCODES.CALL || opcode === OPCODES.LOAD ||
        opcode === OPCODES.STORE || opcode === OPCODES.LOAD_LOCAL || opcode === OPCODES.STORE_LOCAL ||
        opcode === OPCODES.ENTER_TRY || opcode === OPCODES.LOAD8 || opcode === OPCODES.LOAD32 ||
        opcode === OPCODES.STORE8 || opcode === OPCODES.STORE32) {
      nextAddr = addr + 2
    }
    
    // Add next instruction to worklist
    if (nextAddr < bytecode.length && !reachable.has(nextAddr)) {
      reachable.add(nextAddr)
      worklist.push(nextAddr)
    }
    
    // Handle jumps
    if (opcode === OPCODES.JMP || opcode === OPCODES.CALL) {
      const target = bytecode[addr + 1]
      if (target >= 0 && target < bytecode.length && !reachable.has(target)) {
        reachable.add(target)
        worklist.push(target)
      }
    } else if (opcode === OPCODES.JMP_IF_ZERO || opcode === OPCODES.JMP_IF_NEG) {
      const target = bytecode[addr + 1]
      if (target >= 0 && target < bytecode.length && !reachable.has(target)) {
        reachable.add(target)
        worklist.push(target)
      }
      // Also add fall-through
      const fallThrough = addr + 2
      if (fallThrough < bytecode.length && !reachable.has(fallThrough)) {
        reachable.add(fallThrough)
        worklist.push(fallThrough)
      }
    } else if (opcode === OPCODES.RET) {
      // Return doesn't continue to next instruction
      // (but we've already added it above, so it's fine)
    }
  }
  
  // Build address map: old address -> new address
  const addressMap = new Map<number, number>()
  let newAddr = 0
  
  for (let oldAddr = 0; oldAddr < bytecode.length; oldAddr++) {
    if (reachable.has(oldAddr)) {
      addressMap.set(oldAddr, newAddr)
      const opcode = bytecode[oldAddr]
      if (opcode === OPCODES.PUSH || opcode === OPCODES.JMP || opcode === OPCODES.JMP_IF_ZERO || 
          opcode === OPCODES.JMP_IF_NEG || opcode === OPCODES.CALL || opcode === OPCODES.LOAD ||
          opcode === OPCODES.STORE || opcode === OPCODES.LOAD_LOCAL || opcode === OPCODES.STORE_LOCAL ||
          opcode === OPCODES.ENTER_TRY || opcode === OPCODES.LOAD8 || opcode === OPCODES.LOAD32 ||
          opcode === OPCODES.STORE8 || opcode === OPCODES.STORE32) {
        newAddr += 2
      } else {
        newAddr += 1
      }
    }
  }
  
  // Build optimized bytecode with updated jump targets
  for (let oldAddr = 0; oldAddr < bytecode.length; oldAddr++) {
    if (reachable.has(oldAddr)) {
      const opcode = bytecode[oldAddr]
      optimized.push(opcode)
      
      // Handle operands
      if (opcode === OPCODES.PUSH || opcode === OPCODES.LOAD || opcode === OPCODES.STORE ||
          opcode === OPCODES.LOAD_LOCAL || opcode === OPCODES.STORE_LOCAL ||
          opcode === OPCODES.LOAD8 || opcode === OPCODES.LOAD32 ||
          opcode === OPCODES.STORE8 || opcode === OPCODES.STORE32) {
        optimized.push(bytecode[oldAddr + 1])
      } else if (opcode === OPCODES.JMP || opcode === OPCODES.CALL || 
                 opcode === OPCODES.JMP_IF_ZERO || opcode === OPCODES.JMP_IF_NEG ||
                 opcode === OPCODES.ENTER_TRY) {
        // Update jump target to new address
        const oldTarget = bytecode[oldAddr + 1]
        const newTarget = addressMap.get(oldTarget)
        if (newTarget !== undefined) {
          optimized.push(newTarget)
        } else {
          // Target was unreachable - shouldn't happen, but use old target
          optimized.push(oldTarget)
        }
      }
    }
  }
  
  // Count removed instructions
  const removed = bytecode.length - optimized.length
  if (removed > 0) {
    optimizations.push({
      type: 'dead-code',
      description: `Removed ${removed} bytes of unreachable code`,
      location: -1,
      before: [],
      after: []
    })
  }
  
  return { bytecode: optimized, optimizations }
}

/**
 * Function inlining - inline small functions at call sites
 */
function inlineFunctions(bytecode: number[], functionMap: Map<string, number>): { bytecode: number[], optimizations: OptimizationInfo[] } {
  // For now, this is a placeholder - full inlining requires:
  // 1. Identifying function boundaries
  // 2. Finding call sites
  // 3. Copying function body
  // 4. Adjusting addresses
  // This is complex and would require more context about function structure
  
  // Simple heuristic: if we can identify a CALL followed by a small function,
  // we could inline it, but this requires more analysis
  
  return {
    bytecode,
    optimizations: []
  }
}

