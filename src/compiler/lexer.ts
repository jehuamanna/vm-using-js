/**
 * Episode 11: Lexer (Tokenizer)
 * Breaks source code into tokens
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  
  // Keywords
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  PRINT = 'PRINT',
  READ = 'READ',
  FN = 'FN',
  RETURN = 'RETURN',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  ASSIGN = 'ASSIGN',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // Delimiters
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
}

export interface Token {
  type: TokenType
  value: string | number
  line: number
  column: number
}

const KEYWORDS: Record<string, TokenType> = {
  'let': TokenType.LET,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'print': TokenType.PRINT,
  'read': TokenType.READ,
  'fn': TokenType.FN,
  'return': TokenType.RETURN,
}

export class Lexer {
  private source: string
  private position: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: Token[] = []

  constructor(source: string) {
    this.source = source
  }

  private current(): string {
    if (this.position >= this.source.length) {
      return '\0'
    }
    return this.source[this.position]
  }

  private peek(offset: number = 1): string {
    const pos = this.position + offset
    if (pos >= this.source.length) {
      return '\0'
    }
    return this.source[pos]
  }

  private advance(): string {
    const char = this.current()
    this.position++
    if (char === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    return char
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.current()
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance()
      } else if (char === '\n') {
        // Optionally tokenize newlines for statement separation
        this.advance()
      } else {
        break
      }
    }
  }

  private skipComment(): void {
    if (this.current() === '/' && this.peek() === '/') {
      while (this.position < this.source.length && this.current() !== '\n') {
        this.advance()
      }
    }
  }

  private readNumber(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''

    while (this.position < this.source.length) {
      const char = this.current()
      if (char >= '0' && char <= '9') {
        value += this.advance()
      } else {
        break
      }
    }

    return {
      type: TokenType.NUMBER,
      value: parseInt(value, 10),
      line: startLine,
      column: startColumn,
    }
  }

  private readIdentifier(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''

    while (this.position < this.source.length) {
      const char = this.current()
      if (
        (char >= 'a' && char <= 'z') ||
        (char >= 'A' && char <= 'Z') ||
        (char >= '0' && char <= '9') ||
        char === '_'
      ) {
        value += this.advance()
      } else {
        break
      }
    }

    // Check if it's a keyword
    const keywordType = KEYWORDS[value.toLowerCase()]
    if (keywordType) {
      return {
        type: keywordType,
        value: value.toLowerCase(),
        line: startLine,
        column: startColumn,
      }
    }

    return {
      type: TokenType.IDENTIFIER,
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readString(): Token {
    const startLine = this.line
    const startColumn = this.column
    this.advance() // Skip opening quote
    let value = ''

    while (this.position < this.source.length && this.current() !== '"') {
      if (this.current() === '\\') {
        this.advance()
        const char = this.current()
        switch (char) {
          case 'n':
            value += '\n'
            break
          case 't':
            value += '\t'
            break
          case '\\':
            value += '\\'
            break
          case '"':
            value += '"'
            break
          default:
            value += char
        }
        this.advance()
      } else {
        value += this.advance()
      }
    }

    if (this.current() === '"') {
      this.advance() // Skip closing quote
    }

    return {
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readToken(): Token | null {
    this.skipWhitespace()

    if (this.position >= this.source.length) {
      return {
        type: TokenType.EOF,
        value: '',
        line: this.line,
        column: this.column,
      }
    }

    // Skip comments
    if (this.current() === '/' && this.peek() === '/') {
      this.skipComment()
      return this.readToken()
    }

    const char = this.current()
    const startLine = this.line
    const startColumn = this.column

    // Numbers
    if (char >= '0' && char <= '9') {
      return this.readNumber()
    }

    // Identifiers and keywords
    if (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    ) {
      return this.readIdentifier()
    }

    // Strings
    if (char === '"') {
      return this.readString()
    }

    // Operators and delimiters
    switch (char) {
      case '+':
        this.advance()
        return { type: TokenType.PLUS, value: '+', line: startLine, column: startColumn }
      case '-':
        this.advance()
        return { type: TokenType.MINUS, value: '-', line: startLine, column: startColumn }
      case '*':
        this.advance()
        return { type: TokenType.MULTIPLY, value: '*', line: startLine, column: startColumn }
      case '/':
        this.advance()
        return { type: TokenType.DIVIDE, value: '/', line: startLine, column: startColumn }
      case '=':
        if (this.peek() === '=') {
          this.advance()
          this.advance()
          return { type: TokenType.EQUALS, value: '==', line: startLine, column: startColumn }
        }
        this.advance()
        return { type: TokenType.ASSIGN, value: '=', line: startLine, column: startColumn }
      case '!':
        if (this.peek() === '=') {
          this.advance()
          this.advance()
          return { type: TokenType.NOT_EQUALS, value: '!=', line: startLine, column: startColumn }
        }
        break
      case '<':
        if (this.peek() === '=') {
          this.advance()
          this.advance()
          return { type: TokenType.LESS_EQUAL, value: '<=', line: startLine, column: startColumn }
        }
        this.advance()
        return { type: TokenType.LESS_THAN, value: '<', line: startLine, column: startColumn }
      case '>':
        if (this.peek() === '=') {
          this.advance()
          this.advance()
          return { type: TokenType.GREATER_EQUAL, value: '>=', line: startLine, column: startColumn }
        }
        this.advance()
        return { type: TokenType.GREATER_THAN, value: '>', line: startLine, column: startColumn }
      case ';':
        this.advance()
        return { type: TokenType.SEMICOLON, value: ';', line: startLine, column: startColumn }
      case ',':
        this.advance()
        return { type: TokenType.COMMA, value: ',', line: startLine, column: startColumn }
      case '(':
        this.advance()
        return { type: TokenType.LEFT_PAREN, value: '(', line: startLine, column: startColumn }
      case ')':
        this.advance()
        return { type: TokenType.RIGHT_PAREN, value: ')', line: startLine, column: startColumn }
      case '{':
        this.advance()
        return { type: TokenType.LEFT_BRACE, value: '{', line: startLine, column: startColumn }
      case '}':
        this.advance()
        return { type: TokenType.RIGHT_BRACE, value: '}', line: startLine, column: startColumn }
    }

    // Unknown character
    const unknown = this.advance()
    throw new Error(
      `Unexpected character '${unknown}' at line ${startLine}, column ${startColumn}`
    )
  }

  tokenize(): Token[] {
    this.tokens = []
    this.position = 0
    this.line = 1
    this.column = 1

    while (this.position < this.source.length) {
      const token = this.readToken()
      if (token) {
        this.tokens.push(token)
        if (token.type === TokenType.EOF) {
          break
        }
      }
    }

    // Ensure EOF token is always at the end
    if (this.tokens.length === 0 || this.tokens[this.tokens.length - 1].type !== TokenType.EOF) {
      this.tokens.push({
        type: TokenType.EOF,
        value: '',
        line: this.line,
        column: this.column,
      })
    }

    return this.tokens
  }
}

