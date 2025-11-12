/**
 * Episode 11: Complete Mini Language Compiler
 * Main compiler entry point: Lexer → Parser → Code Generator
 */

import { Lexer } from './lexer'
import { Parser } from './parser'
import { CodeGenerator } from './codegen'

export interface CompileResult {
  bytecode: number[]
  errors: string[]
  tokens?: any[]
  ast?: any
  variableMap?: Map<string, number>
  functionMap?: Map<string, number>
  exportMap?: Map<string, number>
}

export function compile(source: string): CompileResult {
  const errors: string[] = []

  try {
    // Step 1: Lexical Analysis (Tokenization)
    const lexer = new Lexer(source)
    const tokens = lexer.tokenize()

    // Step 2: Parsing (AST Construction)
    const parser = new Parser(tokens)
    const ast = parser.parse()

    // Step 3: Code Generation
    const generator = new CodeGenerator()
    const bytecode = generator.generate(ast)

    return {
      bytecode,
      errors,
      tokens,
      ast,
      variableMap: generator.getVariableMap(),
      functionMap: generator.getFunctionMap(),
      exportMap: generator.getExportMap(),
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      bytecode: [],
      errors,
    }
  }
}

export { Lexer } from './lexer'
export { CodeGenerator } from './codegen'
export * from './parser' // Exports Parser class and all AST types

