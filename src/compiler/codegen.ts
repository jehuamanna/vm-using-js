/**
 * Episode 11: Code Generator
 * Converts AST to bytecode
 */

import { ASTNode, Program, Statement, Expression } from './parser'
import { OPCODES } from '../core/vm'

export class CodeGenerator {
  private bytecode: number[] = []
  private variableMap: Map<string, number> = new Map()
  private functionMap: Map<string, number> = new Map() // Function name -> address
  private nextVariableAddress: number = 0
  private labelCounter: number = 0
  private functionBodies: Array<{ name: string; body: Statement[]; parameters: string[] }> = []

  generate(ast: Program): number[] {
    this.bytecode = []
    this.variableMap.clear()
    this.functionMap.clear()
    this.functionBodies = []
    this.nextVariableAddress = 0
    this.labelCounter = 0

    // First pass: collect function definitions
    for (const stmt of ast.statements) {
      if (stmt.type === 'FunctionDefinition') {
        this.functionBodies.push({
          name: stmt.name,
          body: stmt.body,
          parameters: stmt.parameters,
        })
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
      
      // Generate function body
      for (const stmt of func.body) {
        this.generateStatement(stmt)
      }
      
      // Add return if not already present
      // (Check if last statement is return - for now, assume explicit return)
      this.bytecode.push(OPCODES.RET)
    }

    // Generate main code
    const mainCodeStart = this.bytecode.length
    this.patchJump(mainCodeStartLabel, mainCodeStart)

    for (const stmt of ast.statements) {
      if (stmt.type !== 'FunctionDefinition') {
        this.generateStatement(stmt)
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
    }
  }

  private generateLetStatement(stmt: { name: string; value: Expression }): void {
    // Allocate variable address if not exists
    if (!this.variableMap.has(stmt.name)) {
      this.variableMap.set(stmt.name, this.nextVariableAddress++)
    }

    // Generate code for value expression
    this.generateExpression(stmt.value)

    // Store in variable
    const address = this.variableMap.get(stmt.name)!
    this.bytecode.push(OPCODES.STORE)
    this.bytecode.push(address)
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

    // Jump to end if condition is false (zero or negative)
    // Similar to if statement
    this.bytecode.push(OPCODES.JMP_IF_ZERO)
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
        // For now, we'll just push the string length
        // In a real implementation, we'd store strings in memory
        this.bytecode.push(OPCODES.PUSH)
        this.bytecode.push(expr.value.length)
        break

      case 'Identifier':
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
            // Store left temporarily
            const tempAddr2 = 251
            this.bytecode.push(OPCODES.STORE)
            this.bytecode.push(tempAddr2)
            // Stack now has: right
            // Load left and compute: right - left
            this.bytecode.push(OPCODES.LOAD)
            this.bytecode.push(tempAddr2)
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
        const varAddress = this.variableMap.get(expr.name)
        if (varAddress === undefined) {
          throw new Error(`Undefined variable: ${expr.name}`)
        }
        this.generateExpression(expr.value)
        this.bytecode.push(OPCODES.STORE)
        this.bytecode.push(varAddress)
        // Also load it back onto stack for chaining
        this.bytecode.push(OPCODES.LOAD)
        this.bytecode.push(varAddress)
        break

      case 'FunctionCall':
        this.generateFunctionCall(expr)
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

  private newLabel(): number {
    return this.labelCounter++
  }

  private patchJump(label: number, address: number): void {
    // Find the JMP or JMP_IF_ZERO instruction that references this label
    // and replace the label with the actual address
    for (let i = 0; i < this.bytecode.length; i++) {
      if (
        (this.bytecode[i] === OPCODES.JMP || this.bytecode[i] === OPCODES.JMP_IF_ZERO || this.bytecode[i] === OPCODES.JMP_IF_NEG) &&
        i + 1 < this.bytecode.length &&
        this.bytecode[i + 1] === label
      ) {
        this.bytecode[i + 1] = address
      }
    }
  }

  private patchFunctionCalls(): void {
    // We need to track which CALL instructions need patching
    // For now, function addresses are set correctly during generation
    // This method is a placeholder for future optimization
  }
}

