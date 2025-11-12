/**
 * Episode 11: Parser
 * Builds an Abstract Syntax Tree (AST) from tokens
 */

import { Token, TokenType, Lexer } from './lexer'

export type ASTNode =
  | Program
  | LetStatement
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | PrintStatement
  | ReadStatement
  | FunctionDefinition
  | ReturnStatement
  | BinaryExpression
  | UnaryExpression
  | NumberLiteral
  | StringLiteral
  | Identifier
  | AssignmentExpression
  | FunctionCall

export interface Program {
  type: 'Program'
  statements: Statement[]
}

export type Statement =
  | LetStatement
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | PrintStatement
  | ReadStatement
  | FunctionDefinition
  | ReturnStatement

export interface LetStatement {
  type: 'LetStatement'
  name: string
  value: Expression
}

export interface ExpressionStatement {
  type: 'ExpressionStatement'
  expression: Expression
}

export interface IfStatement {
  type: 'IfStatement'
  condition: Expression
  thenBranch: Statement[]
  elseBranch: Statement[] | null
}

export interface WhileStatement {
  type: 'WhileStatement'
  condition: Expression
  body: Statement[]
}

export interface PrintStatement {
  type: 'PrintStatement'
  expression: Expression
}

export interface ReadStatement {
  type: 'ReadStatement'
  variable: string
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | NumberLiteral
  | StringLiteral
  | Identifier
  | AssignmentExpression
  | FunctionCall

export interface BinaryExpression {
  type: 'BinaryExpression'
  operator: string
  left: Expression
  right: Expression
}

export interface UnaryExpression {
  type: 'UnaryExpression'
  operator: string
  operand: Expression
}

export interface NumberLiteral {
  type: 'NumberLiteral'
  value: number
}

export interface StringLiteral {
  type: 'StringLiteral'
  value: string
}

export interface Identifier {
  type: 'Identifier'
  name: string
}

export interface AssignmentExpression {
  type: 'AssignmentExpression'
  name: string
  value: Expression
}

export interface FunctionDefinition {
  type: 'FunctionDefinition'
  name: string
  parameters: string[]
  body: Statement[]
}

export interface ReturnStatement {
  type: 'ReturnStatement'
  value: Expression | null
}

export interface FunctionCall {
  type: 'FunctionCall'
  name: string
  arguments: Expression[]
}

export class Parser {
  private tokens: Token[]
  private position: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private current(): Token {
    if (this.position >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1] // Return EOF token
    }
    return this.tokens[this.position]
  }

  private peek(offset: number = 1): Token {
    const pos = this.position + offset
    if (pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1] // Return EOF token
    }
    return this.tokens[pos]
  }

  private advance(): Token {
    const token = this.current()
    if (this.position < this.tokens.length) {
      this.position++
    }
    return token
  }

  private expect(type: TokenType, message?: string): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new Error(
        message ||
          `Expected ${type}, got ${token.type} at line ${token.line}, column ${token.column}`
      )
    }
    return this.advance()
  }

  parse(): Program {
    const statements: Statement[] = []
    let lastPosition = this.position
    let iterations = 0
    const maxIterations = 10000 // Safety limit

    while (this.current().type !== TokenType.EOF) {
      // Safety check to prevent infinite loops
      if (iterations++ > maxIterations) {
        throw new Error(
          `Parser exceeded maximum iterations. Possible infinite loop at token ${this.current().type} at line ${this.current().line}, column ${this.current().column}`
        )
      }

      const stmt = this.parseStatement()
      if (stmt) {
        statements.push(stmt)
      }
      
      // Ensure we're making progress
      if (this.position === lastPosition && this.current().type !== TokenType.EOF) {
        // If we didn't advance and we're not at EOF, check what token we're stuck on
        const currentToken = this.current()
        if (currentToken.type === TokenType.RIGHT_BRACE) {
          throw new Error(
            `Unexpected '}' at line ${currentToken.line}, column ${currentToken.column}. Did you forget to close a block?`
          )
        }
        throw new Error(
          `Unexpected token ${currentToken.type} at line ${currentToken.line}, column ${currentToken.column}`
        )
      }
      lastPosition = this.position
    }

    return {
      type: 'Program',
      statements,
    }
  }

  private parseStatement(): Statement | null {
    const token = this.current()

    // If we hit RIGHT_BRACE, it means we're at the end of a block
    // This shouldn't happen if parseBlock is working correctly, but handle it defensively
    if (token.type === TokenType.RIGHT_BRACE || token.type === TokenType.EOF) {
      return null
    }

    switch (token.type) {
      case TokenType.LET:
        return this.parseLetStatement()
      case TokenType.IF:
        return this.parseIfStatement()
      case TokenType.WHILE:
        return this.parseWhileStatement()
      case TokenType.PRINT:
        return this.parsePrintStatement()
      case TokenType.READ:
        return this.parseReadStatement()
      case TokenType.FN:
        return this.parseFunctionDefinition()
      case TokenType.RETURN:
        return this.parseReturnStatement()
      case TokenType.SEMICOLON:
        this.advance()
        return null
      default:
        // Expression statement
        const expr = this.parseExpression()
        this.expect(TokenType.SEMICOLON, 'Expected semicolon after expression')
        return {
          type: 'ExpressionStatement',
          expression: expr,
        }
    }
  }

  private parseLetStatement(): LetStatement {
    this.expect(TokenType.LET)
    const name = this.expect(TokenType.IDENTIFIER).value as string
    this.expect(TokenType.ASSIGN)
    const value = this.parseExpression()
    this.expect(TokenType.SEMICOLON)
    return {
      type: 'LetStatement',
      name,
      value,
    }
  }

  private parseIfStatement(): IfStatement {
    this.expect(TokenType.IF)
    this.expect(TokenType.LEFT_PAREN)
    const condition = this.parseExpression()
    this.expect(TokenType.RIGHT_PAREN)
    this.expect(TokenType.LEFT_BRACE)
    const thenBranch = this.parseBlock()
    this.expect(TokenType.RIGHT_BRACE)

    let elseBranch: Statement[] | null = null
    if (this.current().type === TokenType.ELSE) {
      this.advance()
      this.expect(TokenType.LEFT_BRACE)
      elseBranch = this.parseBlock()
      this.expect(TokenType.RIGHT_BRACE)
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
    }
  }

  private parseWhileStatement(): WhileStatement {
    this.expect(TokenType.WHILE)
    this.expect(TokenType.LEFT_PAREN)
    const condition = this.parseExpression()
    this.expect(TokenType.RIGHT_PAREN)
    this.expect(TokenType.LEFT_BRACE)
    const body = this.parseBlock()
    
    // parseBlock() stops at RIGHT_BRACE but doesn't consume it, so we consume it here
    // Verify we're at RIGHT_BRACE before consuming
    if (this.current().type !== TokenType.RIGHT_BRACE) {
      throw new Error(
        `Expected '}' to close while loop, but found ${this.current().type} at line ${this.current().line}, column ${this.current().column}`
      )
    }
    this.expect(TokenType.RIGHT_BRACE)

    return {
      type: 'WhileStatement',
      condition,
      body,
    }
  }

  private parsePrintStatement(): PrintStatement {
    this.expect(TokenType.PRINT)
    const expression = this.parseExpression()
    this.expect(TokenType.SEMICOLON)
    return {
      type: 'PrintStatement',
      expression,
    }
  }

  private parseReadStatement(): ReadStatement {
    this.expect(TokenType.READ)
    const variable = this.expect(TokenType.IDENTIFIER).value as string
    this.expect(TokenType.SEMICOLON)
    return {
      type: 'ReadStatement',
      variable,
    }
  }

  private parseFunctionDefinition(): FunctionDefinition {
    this.expect(TokenType.FN)
    const name = this.expect(TokenType.IDENTIFIER).value as string
    this.expect(TokenType.LEFT_PAREN)
    
    // Parse parameters
    const parameters: string[] = []
    if (this.current().type !== TokenType.RIGHT_PAREN) {
      parameters.push(this.expect(TokenType.IDENTIFIER).value as string)
      while (this.current().type === TokenType.COMMA) {
        this.advance() // consume comma
        parameters.push(this.expect(TokenType.IDENTIFIER).value as string)
      }
    }
    
    this.expect(TokenType.RIGHT_PAREN)
    this.expect(TokenType.LEFT_BRACE)
    const body = this.parseBlock()
    this.expect(TokenType.RIGHT_BRACE)

    return {
      type: 'FunctionDefinition',
      name,
      parameters,
      body,
    }
  }

  private parseReturnStatement(): ReturnStatement {
    this.expect(TokenType.RETURN)
    
    let value: Expression | null = null
    if (this.current().type !== TokenType.SEMICOLON) {
      value = this.parseExpression()
    }
    
    this.expect(TokenType.SEMICOLON)
    return {
      type: 'ReturnStatement',
      value,
    }
  }

  private parseBlock(): Statement[] {
    const statements: Statement[] = []
    let lastPosition = this.position
    let iterations = 0
    const maxIterations = 1000

    while (this.current().type !== TokenType.RIGHT_BRACE && this.current().type !== TokenType.EOF) {
      // Safety check
      if (iterations++ > maxIterations) {
        throw new Error('parseBlock exceeded maximum iterations')
      }

      const stmt = this.parseStatement()
      if (stmt) {
        statements.push(stmt)
      }
      
      // If we hit RIGHT_BRACE, exit (parseStatement returns null for it)
      if (this.current().type === TokenType.RIGHT_BRACE) {
        break
      }
      
      // Safety check: ensure we're making progress
      if (this.position === lastPosition) {
        // We didn't advance - this shouldn't happen
        throw new Error(
          `Parser stuck at token ${this.current().type} at line ${this.current().line}, column ${this.current().column}`
        )
      }
      lastPosition = this.position
    }

    // At this point, we should be at RIGHT_BRACE (which we don't consume - caller will)
    return statements
  }

  private parseExpression(): Expression {
    return this.parseAssignment()
  }

  private parseAssignment(): Expression {
    const expr = this.parseEquality()

    if (this.current().type === TokenType.ASSIGN) {
      if (expr.type !== 'Identifier') {
        throw new Error('Left side of assignment must be an identifier')
      }
      this.advance()
      const value = this.parseAssignment()
      return {
        type: 'AssignmentExpression',
        name: expr.name,
        value,
      }
    }

    return expr
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison()

    while (
      this.current().type === TokenType.EQUALS ||
      this.current().type === TokenType.NOT_EQUALS
    ) {
      const operator = this.advance().value as string
      const right = this.parseComparison()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      }
    }

    return expr
  }

  private parseComparison(): Expression {
    let expr = this.parseTerm()

    while (
      this.current().type === TokenType.LESS_THAN ||
      this.current().type === TokenType.GREATER_THAN ||
      this.current().type === TokenType.LESS_EQUAL ||
      this.current().type === TokenType.GREATER_EQUAL
    ) {
      const operator = this.advance().value as string
      const right = this.parseTerm()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      }
    }

    return expr
  }

  private parseTerm(): Expression {
    let expr = this.parseFactor()

    while (this.current().type === TokenType.PLUS || this.current().type === TokenType.MINUS) {
      const operator = this.advance().value as string
      const right = this.parseFactor()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      }
    }

    return expr
  }

  private parseFactor(): Expression {
    let expr = this.parseUnary()

    while (
      this.current().type === TokenType.MULTIPLY ||
      this.current().type === TokenType.DIVIDE
    ) {
      const operator = this.advance().value as string
      const right = this.parseUnary()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      }
    }

    return expr
  }

  private parseUnary(): Expression {
    if (this.current().type === TokenType.MINUS) {
      const operator = this.advance().value as string
      const operand = this.parseUnary()
      return {
        type: 'UnaryExpression',
        operator,
        operand,
      }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): Expression {
    const token = this.current()

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance()
        return {
          type: 'NumberLiteral',
          value: token.value as number,
        }

      case TokenType.STRING:
        this.advance()
        return {
          type: 'StringLiteral',
          value: token.value as string,
        }

      case TokenType.IDENTIFIER:
        this.advance()
        const name = token.value as string
        
        // Check if it's a function call (identifier followed by '(')
        if (this.current().type === TokenType.LEFT_PAREN) {
          return this.parseFunctionCall(name)
        }
        
        return {
          type: 'Identifier',
          name,
        }

      case TokenType.LEFT_PAREN:
        this.advance()
        const expr = this.parseExpression()
        this.expect(TokenType.RIGHT_PAREN)
        return expr

      default:
        throw new Error(
          `Unexpected token ${token.type} at line ${token.line}, column ${token.column}`
        )
    }
  }

  private parseFunctionCall(name: string): FunctionCall {
    this.expect(TokenType.LEFT_PAREN)
    
    const args: Expression[] = []
    if (this.current().type !== TokenType.RIGHT_PAREN) {
      args.push(this.parseExpression())
      while (this.current().type === TokenType.COMMA) {
        this.advance() // consume comma
        args.push(this.parseExpression())
      }
    }
    
    this.expect(TokenType.RIGHT_PAREN)
    
    return {
      type: 'FunctionCall',
      name,
      arguments: args,
    }
  }
}

