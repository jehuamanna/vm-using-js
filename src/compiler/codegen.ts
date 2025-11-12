/**
 * Episode 11: Code Generator
 * Converts AST to bytecode
 */

import { Program, Statement, Expression } from './parser'
import { OPCODES } from '../core/vm'

export class CodeGenerator {
  private bytecode: number[] = []
  private variableMap: Map<string, number> = new Map()
  private functionMap: Map<string, number> = new Map() // Function name -> address
  private exportMap: Map<string, number> = new Map() // Exported symbol name -> address
  private importedFunctions: Set<string> = new Set() // Functions imported from other modules
  private relocationTable: Array<{ offset: number; functionName: string }> = [] // Track imported function call sites
  
  // Get variable map for debugging
  getVariableMap(): Map<string, number> {
    return new Map(this.variableMap)
  }
  
  // Get function map
  getFunctionMap(): Map<string, number> {
    return new Map(this.functionMap)
  }
  
  // Get export map
  getExportMap(): Map<string, number> {
    return new Map(this.exportMap)
  }
  
  // Get relocation table
  getRelocationTable(): Array<{ offset: number; functionName: string }> {
    return [...this.relocationTable]
  }
  
  private nextVariableAddress: number = 0
  private labelCounter: number = 0
  private functionBodies: Array<{ name: string; body: Statement[]; parameters: string[]; exported?: boolean }> = []
  private exportedVariables: Set<string> = new Set()
  private currentFunctionParams: Map<string, number> = new Map() // Parameter name -> local offset
  private currentFunctionLocals: Map<string, number> = new Map() // Local variable name -> local offset
  private nextLocalOffset: number = 0
  private isInFunction: boolean = false

  generate(ast: Program): number[] {
    this.bytecode = []
    this.variableMap.clear()
    this.functionMap.clear()
    this.exportMap.clear()
    this.functionBodies = []
    this.exportedVariables.clear()
    this.importedFunctions.clear()
    this.relocationTable = []
    this.nextVariableAddress = 0
    this.labelCounter = 0

    // First pass: collect function definitions and imports
    for (const stmt of ast.statements) {
      if (stmt.type === 'FunctionDefinition') {
        this.functionBodies.push({
          name: stmt.name,
          body: stmt.body,
          parameters: stmt.parameters,
          exported: stmt.exported || false,
        })
      } else if (stmt.type === 'LetStatement' && stmt.exported) {
        this.exportedVariables.add(stmt.name)
      } else if (stmt.type === 'ImportStatement') {
        // Track imported function names (we assume all imports are functions for now)
        for (const name of stmt.names) {
          this.importedFunctions.add(name)
        }
      }
    }

    // Generate functions first (so we know their addresses)
    const mainCodeStartLabel = this.newLabel()
    // Jump to main code (will be patched later)
    this.bytecode.push(OPCODES.JMP)
    this.bytecode.push(mainCodeStartLabel)

    // Generate function bodies
    for (const func of this.functionBodies) {
      const funcAddress = this.bytecode.length
      this.functionMap.set(func.name, funcAddress)
      
      // If exported, add to export map
      if (func.exported) {
        this.exportMap.set(func.name, funcAddress)
      }
      
      // Set up function context
      this.isInFunction = true
      this.currentFunctionParams.clear()
      this.currentFunctionLocals.clear()
      this.nextLocalOffset = func.parameters.length // Start locals after parameters
      
      // Map parameters to local offsets (0, 1, 2, ...)
      // Arguments are pushed in order: arg0, arg1, arg2, ...
      // Stack top has last argument, so we pop in reverse
      for (let i = 0; i < func.parameters.length; i++) {
        this.currentFunctionParams.set(func.parameters[i], i)
      }
      
      // Pop arguments from stack into local variables
      // Stack: [arg0, arg1, arg2] with arg2 on top
      // We pop from top to bottom and store in reverse order
      for (let i = func.parameters.length - 1; i >= 0; i--) {
        const localOffset = i
        // Pop from stack and store in local
        this.bytecode.push(OPCODES.STORE_LOCAL)
        this.bytecode.push(localOffset)
      }
      
      // Generate function body
      for (const stmt of func.body) {
        this.generateStatement(stmt)
      }
      
      // Add return if not already present
      // Check if last statement is a return statement
      const lastStmt = func.body.length > 0 ? func.body[func.body.length - 1] : null
      if (!lastStmt || lastStmt.type !== 'ReturnStatement') {
        // No explicit return - push 0 and return
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(0)
      }
      this.bytecode.push(OPCODES.RET)
      
      // Clear function context
      this.isInFunction = false
      this.currentFunctionParams.clear()
      this.currentFunctionLocals.clear()
      this.nextLocalOffset = 0
    }

    // Generate main code
    const mainCodeStart = this.bytecode.length
    console.log(`[CODEGEN] Main code starts at: ${mainCodeStart}, label=${mainCodeStartLabel}, current bytecode length=${this.bytecode.length}`)
    console.log(`[CODEGEN] Bytecode before patching: [${this.bytecode.slice(0, 5).join(', ')}...]`)
    this.patchJump(mainCodeStartLabel, mainCodeStart)
    console.log(`[CODEGEN] Bytecode after patching: [${this.bytecode.slice(0, 5).join(', ')}...]`)
    console.log(`[CODEGEN] JMP target at bytecode[1] is now: ${this.bytecode[1]}`)

    for (const stmt of ast.statements) {
      if (stmt.type !== 'FunctionDefinition' && stmt.type !== 'ExportStatement' && stmt.type !== 'ImportStatement') {
        console.log(`[CODEGEN] Generating statement: ${stmt.type}`)
        this.generateStatement(stmt)
        
        // If this is an exported variable, add to export map
        if (stmt.type === 'LetStatement' && this.exportedVariables.has(stmt.name)) {
          const varAddress = this.variableMap.get(stmt.name)
          if (varAddress !== undefined) {
            this.exportMap.set(stmt.name, varAddress)
          }
        }
      }
    }

    // Add HALT at the end
    this.bytecode.push(OPCODES.HALT)

    return this.bytecode
  }

  private generateStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'LetStatement':
        this.generateLetStatement(stmt)
        break
      case 'ExpressionStatement':
        this.generateExpression(stmt.expression)
        // Pop result if expression leaves value on stack
        // But only if there's actually a value - check if it's a function call or other expression
        // For function calls, they always leave a value, so we need to discard it
        // For other expressions, we also need to discard the result
        // Use POP if available, or STORE to a safe address
        // Since we don't have POP, we'll use STORE to address 255 (unused)
        // But we need to ensure the stack has a value first
        // Actually, all expressions leave a value, so this should be safe
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(255) // Discard to unused address
        break
      case 'IfStatement':
        this.generateIfStatement(stmt)
        break
      case 'WhileStatement':
        this.generateWhileStatement(stmt)
        break
      case 'PrintStatement':
        this.generatePrintStatement(stmt)
        break
      case 'ReadStatement':
        this.generateReadStatement(stmt)
        break
      case 'FunctionDefinition':
        // Functions are handled in generate() method
        break
      case 'ReturnStatement':
        this.generateReturnStatement(stmt)
        break
      case 'TryStatement':
        this.generateTryStatement(stmt)
        break
      case 'ThrowStatement':
        this.generateThrowStatement(stmt)
        break
      case 'ImportStatement':
        // Imports are handled by the linker, skip here
        break
      case 'ExportStatement':
        // Exports are handled in generate(), skip here
        break
    }
  }

  private generateLetStatement(stmt: { name: string; value: Expression }): void {
    // Generate code for value expression
    this.generateExpression(stmt.value)

    // Check if we're in a function and this is a parameter or local
    if (this.isInFunction && (this.currentFunctionParams.has(stmt.name) || this.currentFunctionLocals.has(stmt.name))) {
      // It's a parameter or local variable
      let localOffset: number
      if (this.currentFunctionParams.has(stmt.name)) {
        localOffset = this.currentFunctionParams.get(stmt.name)!
      } else {
        localOffset = this.currentFunctionLocals.get(stmt.name)!
      }
      this.bytecode.push(OPCODES.STORE_LOCAL)
      this.bytecode.push(localOffset)
    } else if (this.isInFunction) {
      // New local variable in function
      const localOffset = this.nextLocalOffset++
      this.currentFunctionLocals.set(stmt.name, localOffset)
      this.bytecode.push(OPCODES.STORE_LOCAL)
      this.bytecode.push(localOffset)
    } else {
      // Global variable
      if (!this.variableMap.has(stmt.name)) {
        this.variableMap.set(stmt.name, this.nextVariableAddress++)
      }
      const address = this.variableMap.get(stmt.name)!
      this.bytecode.push(OPCODES.STORE)
      this.bytecode.push(address)
    }
  }

  private generateIfStatement(stmt: {
    condition: Expression
    thenBranch: Statement[]
    elseBranch: Statement[] | null
  }): void {
    // Generate condition
    this.generateExpression(stmt.condition)

    const elseLabel = this.newLabel()
    const endLabel = this.newLabel()

    // For comparisons, the result is on the stack:
    // - == : 0 if equal (true), non-zero if not equal (false)
    // - != : 0 if equal (false), non-zero if not equal (true)
    // - <, >, <=, >= : positive/zero if true, negative if false

    // Check if condition is false (zero or negative)
    // For ==, zero means true, so we need to invert
    // For !=, non-zero means true
    // For <, >, <=, >=, negative means false

    // Jump to else if condition is false
    // We'll use JMP_IF_ZERO for == (zero means true, so jump if non-zero)
    // For other comparisons, we'll use JMP_IF_NEG (negative means false)
    // This is simplified - in a real implementation, we'd track the comparison type
    this.bytecode.push(OPCODES.JMP_IF_ZERO)
    this.bytecode.push(elseLabel) // Will be patched

    // Generate then branch
    for (const thenStmt of stmt.thenBranch) {
      this.generateStatement(thenStmt)
    }

    // Jump to end
    this.bytecode.push(OPCODES.JMP)
    this.bytecode.push(endLabel) // Will be patched

    // Patch else jump
    this.patchJump(elseLabel, this.bytecode.length)

    // Generate else branch if exists
    if (stmt.elseBranch) {
      for (const elseStmt of stmt.elseBranch) {
        this.generateStatement(elseStmt)
      }
    }

    // Patch end jump
    this.patchJump(endLabel, this.bytecode.length)
  }

  private generateWhileStatement(stmt: {
    condition: Expression
    body: Statement[]
  }): void {
    const loopStart = this.bytecode.length
    const endLabel = this.newLabel()

    // Generate condition
    this.generateExpression(stmt.condition)

    // Jump to end if condition is false
    // For comparisons like <: result is positive if true, zero/negative if false
    // We need to jump if result is <= 0
    // We can do this by: duplicate value, check if negative OR zero
    // Simpler: push 0, subtract, if result is negative or zero, jump
    // Actually, we can use: push 1, add, then JMP_IF_NEG
    // If result is 0 or negative, adding 1 makes it <= 1, which is still <= 0 after subtracting 1
    // Better: push 0, subtract, then JMP_IF_NEG (if result <= 0, then 0 - result >= 0, so don't jump)
    // Actually, simplest: duplicate, push 0, subtract, JMP_IF_NEG
    // If original is <= 0, then 0 - original >= 0, so JMP_IF_NEG won't jump... that's wrong
    // Let's use: duplicate, push -1, add, JMP_IF_NEG
    // If original is <= 0, then original + (-1) <= -1, so JMP_IF_NEG will jump ✓
    const tempWhile = 254
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(tempWhile) // Save condition result
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(tempWhile) // Load condition result
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(-1)
    this.bytecode.push(OPCODES.ADD) // result - 1
    // If result was <= 0, then result - 1 <= -1, so JMP_IF_NEG will jump
    // If result was > 0, then result - 1 >= 0, so JMP_IF_NEG won't jump
    this.bytecode.push(OPCODES.JMP_IF_NEG)
    this.bytecode.push(endLabel) // Will be patched

    // Generate body
    for (const bodyStmt of stmt.body) {
      this.generateStatement(bodyStmt)
    }

    // Jump back to loop start
    this.bytecode.push(OPCODES.JMP)
    this.bytecode.push(loopStart)

    // Patch end jump
    this.patchJump(endLabel, this.bytecode.length)
  }

  private generatePrintStatement(stmt: { expression: Expression }): void {
    this.generateExpression(stmt.expression)
    this.bytecode.push(OPCODES.PRINT)
  }

  private generateReadStatement(stmt: { variable: string }): void {
    // Allocate variable address if not exists
    if (!this.variableMap.has(stmt.variable)) {
      this.variableMap.set(stmt.variable, this.nextVariableAddress++)
    }

    // Read from input
    this.bytecode.push(OPCODES.READ)

    // Store in variable
    const address = this.variableMap.get(stmt.variable)!
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(address)
  }

  private generateExpression(expr: Expression): void {
    switch (expr.type) {
      case 'NumberLiteral':
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(expr.value)
        break

      case 'StringLiteral':
        // Episode 16: Allocate heap memory for string (null-terminated)
        // String format: [length (4 bytes), chars..., null terminator]
        const strValue = expr.value
        const strLength = strValue.length
        const strSize = 4 + strLength + 1 // 4 bytes for length + chars + null terminator
        
        // Allocate heap memory
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(strSize)
        this.bytecode.push(OPCODES.MALLOC) // Returns heap address on stack
        
        // Store string length at the beginning (4 bytes)
        // Duplicate address for storing length
        const tempAddr = 250
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(tempAddr)
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(strLength)
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(tempAddr)
        // Stack: [strLength, address]
        // STORE32_STACK pops: value first, then address
        // Swap to get [address, value]
        const swapStrLen = 246
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(swapStrLen) // Store address
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(swapStrLen + 1) // Store length
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(swapStrLen) // Load address
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(swapStrLen + 1) // Load length
        // Stack: [address, length] - correct order
        this.bytecode.push(OPCODES.STORE32_STACK) // Store length as 32-bit
        
        // Store each character as 8-bit value
        for (let i = 0; i < strLength; i++) {
          const charCode = strValue.charCodeAt(i)
          // Load address, add offset, store character
          this.bytecode.push(OPCODES.LOAD)
          this.bytecode.push(tempAddr)
          this.bytecode.push(OPCODES.PUSH)
          this.bytecode.push(4 + i) // Offset: 4 (length) + i
          this.bytecode.push(OPCODES.ADD) // Calculate address
          // Stack: [address]
          this.bytecode.push(OPCODES.PUSH)
          this.bytecode.push(charCode)
          // Stack: [address, charCode] - correct order for STORE8_STACK
          this.bytecode.push(OPCODES.STORE8_STACK) // Store character
        }
        
        // Store null terminator
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(tempAddr)
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(4 + strLength) // Offset for null terminator
        this.bytecode.push(OPCODES.ADD)
        // Stack: [address]
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(0) // Null terminator
        // Stack: [address, 0] - correct order for STORE8_STACK
        this.bytecode.push(OPCODES.STORE8_STACK)
        
        // Leave heap address on stack
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(tempAddr)
        break

      case 'Identifier':
        // Check if it's a function parameter or local variable first
        if (this.isInFunction) {
          if (this.currentFunctionParams.has(expr.name)) {
            const localOffset = this.currentFunctionParams.get(expr.name)!
            this.bytecode.push(OPCODES.LOAD_LOCAL)
            this.bytecode.push(localOffset)
            break
          } else if (this.currentFunctionLocals.has(expr.name)) {
            const localOffset = this.currentFunctionLocals.get(expr.name)!
            this.bytecode.push(OPCODES.LOAD_LOCAL)
            this.bytecode.push(localOffset)
            break
          }
        }
        // Check global variables
        const address = this.variableMap.get(expr.name)
        if (address === undefined) {
          throw new Error(`Undefined variable: ${expr.name}`)
        }
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(address)
        break

      case 'BinaryExpression':
        this.generateExpression(expr.left)
        this.generateExpression(expr.right)

        switch (expr.operator) {
          case '+':
            this.bytecode.push(OPCODES.ADD)
            break
          case '-':
            this.bytecode.push(OPCODES.SUB)
            break
          case '*':
            this.bytecode.push(OPCODES.MUL)
            break
          case '/':
            // Division not implemented in VM yet, use subtraction as placeholder
            // In real implementation, we'd add DIV opcode
            throw new Error('Division not yet implemented')
          case '==':
            // Compare: subtract, result is 0 if equal, non-zero if not equal
            // For if/while, we'll use JMP_IF_ZERO which checks if result is 0
            // But for while loops with JMP_IF_NEG, we need to normalize
            // For now, keep as is - == comparisons in while loops will need special handling
            this.bytecode.push(OPCODES.SUB)
            // Stack now has: 0 if equal, non-zero if not equal
            break
          case '!=':
            // Compare: subtract, result is 0 if equal, non-zero if not equal
            // For !=, we want non-zero to be true, so we'll handle in control flow
            this.bytecode.push(OPCODES.SUB)
            // Stack now has: 0 if equal (false), non-zero if not equal (true)
            break
          case '<':
            // left < right: compute right - left, if positive then true
            // Stack: [left, right] with right on top
            // SUB pops: right (top) first, then left, computes left - right (wrong!)
            // We need right - left, so swap them
            // Store right temporarily
            const tempAddr2 = 251
            this.bytecode.push(OPCODES.STORE)
            this.bytecode.push(tempAddr2) // Store right
            // Stack: [left]
            // Store left temporarily
            this.bytecode.push(OPCODES.STORE)
            this.bytecode.push(tempAddr2 + 1) // Store left
            // Stack: []
            // Load right, then left
            this.bytecode.push(OPCODES.LOAD)
            this.bytecode.push(tempAddr2) // Load right
            this.bytecode.push(OPCODES.LOAD)
            this.bytecode.push(tempAddr2 + 1) // Load left
            // Stack: [right, left] with left on top
            // SUB: pops left (top), then right, computes right - left ✓
            this.bytecode.push(OPCODES.SUB)
            // Result: positive if right > left (i.e., left < right)
            // For if/while, we'll use JMP_IF_NEG to check if result is negative
            break
          case '>':
            // left > right: compute left - right, if positive then true
            this.bytecode.push(OPCODES.SUB)
            // Result: positive if left > right
            // For if/while, we'll use JMP_IF_NEG to check if result is negative
            break
          case '<=':
            // left <= right: compute right - left, if >= 0 then true
            // Similar to < but includes equality
            const tempAddr3 = 252
            this.bytecode.push(OPCODES.STORE)
            this.bytecode.push(tempAddr3)
            this.bytecode.push(OPCODES.LOAD)
            this.bytecode.push(tempAddr3)
            this.bytecode.push(OPCODES.SUB)
            // Result: positive or zero if left <= right
            // For if/while, we'll use JMP_IF_NEG to check if result is negative
            break
          case '>=':
            // left >= right: compute left - right, if >= 0 then true
            this.bytecode.push(OPCODES.SUB)
            // Result: positive or zero if left >= right
            // For if/while, we'll use JMP_IF_NEG to check if result is negative
            break
          default:
            throw new Error(`Unknown operator: ${expr.operator}`)
        }
        break

      case 'UnaryExpression':
        this.generateExpression(expr.operand)
        if (expr.operator === '-') {
          // Negate: multiply by -1
          this.bytecode.push(OPCODES.PUSH)
          this.bytecode.push(-1)
          this.bytecode.push(OPCODES.MUL)
        } else {
          throw new Error(`Unknown unary operator: ${expr.operator}`)
        }
        break

      case 'AssignmentExpression':
        // Episode 16: Handle array assignment: arr[index] = value
        if (expr.arrayAccess) {
          // Generate value
          this.generateExpression(expr.value)
          
          // Generate array address and index
          this.generateExpression(expr.arrayAccess.array)
          this.generateExpression(expr.arrayAccess.index)
          
          // Calculate element address: arrayAddr + 4 + index * 4
          // Stack: [value, arrayAddr, index]
          const tempAddr = 246
          this.bytecode.push(OPCODES.STORE)
          this.bytecode.push(tempAddr) // Store index
          this.bytecode.push(OPCODES.STORE)
          this.bytecode.push(tempAddr + 1) // Store array address
          this.bytecode.push(OPCODES.STORE)
          this.bytecode.push(tempAddr + 2) // Store value
          
          // Calculate offset: 4 + index * 4
          this.bytecode.push(OPCODES.LOAD)
          this.bytecode.push(tempAddr) // Load index
          this.bytecode.push(OPCODES.PUSH)
          this.bytecode.push(4)
          this.bytecode.push(OPCODES.MUL) // index * 4
          this.bytecode.push(OPCODES.PUSH)
          this.bytecode.push(4) // length field size
          this.bytecode.push(OPCODES.ADD) // 4 + index * 4
          
          // Add to array address
          this.bytecode.push(OPCODES.LOAD)
          this.bytecode.push(tempAddr + 1) // Load array address
          this.bytecode.push(OPCODES.ADD) // arrayAddr + offset
          
          // Load value and store
          this.bytecode.push(OPCODES.LOAD)
          this.bytecode.push(tempAddr + 2) // Load value
          // Stack: [value, address]
          this.bytecode.push(OPCODES.STORE32_STACK)
          
          // Load value back for chaining
          this.bytecode.push(OPCODES.LOAD)
          this.bytecode.push(tempAddr + 2)
          break
        }
        
        // Regular variable assignment
        this.generateExpression(expr.value)
        
        // Check if it's a function parameter or local variable
        if (this.isInFunction) {
          if (this.currentFunctionParams.has(expr.name)) {
            const localOffset = this.currentFunctionParams.get(expr.name)!
            this.bytecode.push(OPCODES.STORE_LOCAL)
            this.bytecode.push(localOffset)
            // Also load it back onto stack for chaining
            this.bytecode.push(OPCODES.LOAD_LOCAL)
            this.bytecode.push(localOffset)
            break
          } else if (this.currentFunctionLocals.has(expr.name)) {
            const localOffset = this.currentFunctionLocals.get(expr.name)!
            this.bytecode.push(OPCODES.STORE_LOCAL)
            this.bytecode.push(localOffset)
            // Also load it back onto stack for chaining
            this.bytecode.push(OPCODES.LOAD_LOCAL)
            this.bytecode.push(localOffset)
            break
          }
        }
        
        // Global variable
        const varAddress = this.variableMap.get(expr.name)
        if (varAddress === undefined) {
          throw new Error(`Undefined variable: ${expr.name}`)
        }
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(varAddress)
        // Also load it back onto stack for chaining
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(varAddress)
        break

      case 'FunctionCall':
        this.generateFunctionCall(expr)
        break

      case 'ArrayLiteral':
        this.generateArrayLiteral(expr)
        break

      case 'ArrayAccess':
        this.generateArrayAccess(expr)
        break

      default:
        throw new Error(`Unknown expression type: ${(expr as any).type}`)
    }
  }

  private generateFunctionCall(expr: { name: string; arguments: Expression[] }): void {
    // Push arguments in order (left to right)
    for (const arg of expr.arguments) {
      this.generateExpression(arg)
    }

    // Get function address
    const funcAddress = this.functionMap.get(expr.name)
    if (funcAddress === undefined) {
      // Check if it's an imported function - if so, we'll resolve it during linking
      if (this.importedFunctions.has(expr.name)) {
        // Record this call site in the relocation table
        const callOffset = this.bytecode.length
        this.bytecode.push(OPCODES.CALL)
        this.bytecode.push(0) // Placeholder - will be patched by linker
        this.relocationTable.push({ offset: callOffset + 1, functionName: expr.name })
        return
      }
      throw new Error(`Undefined function: ${expr.name}`)
    }

    // Call function
    this.bytecode.push(OPCODES.CALL)
    this.bytecode.push(funcAddress)
    // Result is left on stack
  }

  private generateReturnStatement(stmt: { value: Expression | null }): void {
    if (stmt.value) {
      this.generateExpression(stmt.value)
    } else {
      // Push 0 for void return
      this.bytecode.push(OPCODES.PUSH)
      this.bytecode.push(0)
    }
    this.bytecode.push(OPCODES.RET)
  }

  private generateArrayLiteral(expr: { elements: Expression[] }): void {
    // Episode 16: Allocate heap memory for array
    // Array format: [length (4 bytes), elements...]
    const elements = expr.elements
    const arrayLength = elements.length
    const arraySize = 4 + (arrayLength * 4) // 4 bytes for length + 4 bytes per element
    
    // Allocate heap memory
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(arraySize)
    this.bytecode.push(OPCODES.MALLOC) // Returns heap address on stack
    
    // Store array length at the beginning
    const tempAddr = 249
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(tempAddr) // Save address
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(arrayLength)
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(tempAddr)
    // Stack: [arrayLength, address]
    // STORE32_STACK pops: value first, then address
    // So we need: [address, value] on stack - swap them
    const swapTempLen = 247
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(swapTempLen) // Store address
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(swapTempLen + 1) // Store length
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(swapTempLen) // Load address
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(swapTempLen + 1) // Load length
    // Stack: [address, length] - correct order
    this.bytecode.push(OPCODES.STORE32_STACK) // Store length as 32-bit
    
    // Store each element as 32-bit value
    for (let i = 0; i < elements.length; i++) {
      // Generate element value
      this.generateExpression(elements[i])
      
      // Calculate address: base + 4 (length) + i * 4
      // Stack: [elementValue]
      this.bytecode.push(OPCODES.LOAD)
      this.bytecode.push(tempAddr) // Load base address
      this.bytecode.push(OPCODES.PUSH)
      this.bytecode.push(4 + (i * 4)) // Offset
      this.bytecode.push(OPCODES.ADD) // base + offset
      
      // Stack: [elementValue, address]
      // STORE32_STACK pops: value first, then address
      // So we need: [address, value] on stack
      // Swap them: store address temporarily, then push it back
      const swapTemp = 248
      this.bytecode.push(OPCODES.STORE)
      this.bytecode.push(swapTemp) // Store address
      this.bytecode.push(OPCODES.STORE)
      this.bytecode.push(swapTemp + 1) // Store value
      this.bytecode.push(OPCODES.LOAD)
      this.bytecode.push(swapTemp) // Load address
      this.bytecode.push(OPCODES.LOAD)
      this.bytecode.push(swapTemp + 1) // Load value
      // Stack: [address, value] - correct order for STORE32_STACK
      this.bytecode.push(OPCODES.STORE32_STACK)
    }
    
    // Leave heap address on stack
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(tempAddr)
  }

  private generateArrayAccess(expr: { array: Expression; index: Expression }): void {
    // Episode 16: Calculate array element address and load value
    // Array format: [length (4 bytes), elements...]
    // Each element is 4 bytes (32-bit)
    
    // Generate array address (heap address)
    this.generateExpression(expr.array)
    
    // Generate index
    this.generateExpression(expr.index)
    
    // Calculate element address: arrayAddr + 4 (skip length) + index * 4
    // Stack: [arrayAddr, index] with index on top
    const tempAddr = 253 // Use different temp address to avoid conflicts
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(tempAddr) // Store index (top of stack)
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(tempAddr + 1) // Store array address
    
    // Calculate offset: 4 + index * 4
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(tempAddr) // Load index
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(4)
    this.bytecode.push(OPCODES.MUL) // index * 4
    this.bytecode.push(OPCODES.PUSH)
    this.bytecode.push(4) // length field size
    this.bytecode.push(OPCODES.ADD) // 4 + index * 4
    
    // Add to array address
    this.bytecode.push(OPCODES.LOAD)
    this.bytecode.push(tempAddr + 1) // Load array address
    this.bytecode.push(OPCODES.ADD) // arrayAddr + offset
    
    // Load 32-bit value from calculated address
    this.bytecode.push(OPCODES.LOAD32_STACK)
  }

  private generateTryStatement(stmt: { tryBlock: Statement[]; catchBlock: Statement[]; catchVariable?: string }): void {
    // Generate ENTER_TRY with placeholder for catch handler address
    const catchHandlerLabel = this.newLabel()
    const enterTryAddress = this.bytecode.length
    this.bytecode.push(OPCODES.ENTER_TRY)
    this.bytecode.push(catchHandlerLabel) // Will be patched later
    
    // Generate try block
    for (const tryStmt of stmt.tryBlock) {
      this.generateStatement(tryStmt)
    }
    
    // Generate LEAVE_TRY (if we reach here, no exception was thrown)
    this.bytecode.push(OPCODES.LEAVE_TRY)
    
    // Jump over catch handler
    const endLabel = this.newLabel()
    this.bytecode.push(OPCODES.JMP)
    this.bytecode.push(endLabel)
    
    // Generate catch handler
    const catchHandlerAddress = this.bytecode.length
    this.patchJump(catchHandlerLabel, catchHandlerAddress)
    
    // If catch variable is specified, store exception value in it
    if (stmt.catchVariable) {
      // Exception value is already on stack from THROW
      if (this.isInFunction) {
        // Store in local variable
        if (!this.currentFunctionLocals.has(stmt.catchVariable)) {
          const localOffset = this.nextLocalOffset++
          this.currentFunctionLocals.set(stmt.catchVariable, localOffset)
        }
        const localOffset = this.currentFunctionLocals.get(stmt.catchVariable)!
        this.bytecode.push(OPCODES.STORE_LOCAL)
        this.bytecode.push(localOffset)
      } else {
        // Store in global variable
        if (!this.variableMap.has(stmt.catchVariable)) {
          this.variableMap.set(stmt.catchVariable, this.nextVariableAddress++)
        }
        const address = this.variableMap.get(stmt.catchVariable)!
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(address)
      }
    } else {
      // Pop exception value if no catch variable
      this.bytecode.push(OPCODES.STORE)
      this.bytecode.push(255) // Discard
    }
    
    // Generate catch block
    for (const catchStmt of stmt.catchBlock) {
      this.generateStatement(catchStmt)
    }
    
    // Patch end jump
    const endAddress = this.bytecode.length
    this.patchJump(endLabel, endAddress)
  }

  private generateThrowStatement(stmt: { value: Expression }): void {
    // Generate code for exception value
    this.generateExpression(stmt.value)
    // Throw exception
    this.bytecode.push(OPCODES.THROW)
  }

  private newLabel(): number {
    return this.labelCounter++
  }

  private patchJump(label: number, address: number): void {
    // Find the JMP, JMP_IF_ZERO, JMP_IF_NEG, or ENTER_TRY instruction that references this label
    // and replace the label with the actual address
    let patched = false
    for (let i = 0; i < this.bytecode.length; i++) {
      if (
        (this.bytecode[i] === OPCODES.JMP || 
         this.bytecode[i] === OPCODES.JMP_IF_ZERO || 
         this.bytecode[i] === OPCODES.JMP_IF_NEG ||
         this.bytecode[i] === OPCODES.ENTER_TRY) &&
        i + 1 < this.bytecode.length &&
        this.bytecode[i + 1] === label
      ) {
        console.log(`[CODEGEN] Patching jump at position ${i}: label ${label} -> address ${address}`)
        this.bytecode[i + 1] = address
        patched = true
      }
    }
    if (!patched) {
      console.warn(`[CODEGEN] WARNING: Could not find label ${label} to patch!`)
    }
  }
}

