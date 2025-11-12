/**
 * Episode 15: Module System and Linker
 * Handles module parsing, symbol resolution, and linking
 */

import { compile } from './index'
import { Program } from './parser'
import { OPCODES } from '../core/vm'

export interface ModuleInfo {
  name: string
  source: string
  ast?: Program
  bytecode: number[]
  exports: Map<string, number> // Symbol name -> address
  imports: Array<{ names: string[]; module: string }>
  errors: string[]
  relocationTable?: Array<{ offset: number; functionName: string }>
}

export interface LinkedModule {
  bytecode: number[]
  symbolTable: Map<string, number> // Fully qualified name -> address
  errors: string[]
}

/**
 * Parse a module and extract its exports and imports
 */
export function parseModule(name: string, source: string): ModuleInfo {
  const result = compile(source)
  
  const moduleInfo: ModuleInfo = {
    name,
    source,
    ast: result.ast,
    bytecode: result.bytecode,
    exports: result.exportMap || new Map(),
    imports: [],
    errors: result.errors,
    relocationTable: result.relocationTable || [],
  }

  // Extract imports from AST
  if (result.ast) {
    for (const stmt of result.ast.statements) {
      if (stmt.type === 'ImportStatement') {
        moduleInfo.imports.push({
          names: stmt.names,
          module: stmt.module,
        })
      }
    }
  }

  return moduleInfo
}

/**
 * Link multiple modules together
 * Resolves imports and merges bytecode
 */
export function linkModules(modules: ModuleInfo[]): LinkedModule {
  const errors: string[] = []
  const symbolTable: Map<string, number> = new Map()
  const linkedBytecode: number[] = []
  
  // Build export map: module.name -> address (with offset)
  const exportMap: Map<string, { module: string; name: string; address: number }> = new Map()
  
  // First pass: collect all exports with their base addresses
  const moduleOffsets: Map<string, number> = new Map()
  let currentAddress = 0
  
  for (const module of modules) {
    moduleOffsets.set(module.name, currentAddress)
    
    // Collect exports from this module with offset
    for (const [name, address] of module.exports.entries()) {
      const fullName = `${module.name}.${name}`
      const absoluteAddress = currentAddress + address
      exportMap.set(fullName, { module: module.name, name, address: absoluteAddress })
      symbolTable.set(fullName, absoluteAddress)
    }
    
    currentAddress += module.bytecode.length
  }
  
  // Build a combined function map for all modules (for resolving function calls)
  const combinedFunctionMap: Map<string, number> = new Map()
  currentAddress = 0
  for (const module of modules) {
    // Get function map from compilation result
    const compileResult = compile(module.source)
    if (compileResult.functionMap) {
      for (const [name, address] of compileResult.functionMap.entries()) {
        combinedFunctionMap.set(name, currentAddress + address)
      }
    }
    currentAddress += module.bytecode.length
  }
  
  // Second pass: resolve imports, patch function calls, and merge bytecode
  currentAddress = 0
  for (const module of modules) {
    const moduleStart = currentAddress
    const moduleBytecode = [...module.bytecode]
    
    // Resolve imports and patch function call addresses
    for (const imp of module.imports) {
      const importedModule = modules.find(m => m.name === imp.module)
      if (!importedModule) {
        errors.push(`Module "${imp.module}" not found (imported by "${module.name}")`)
        continue
      }
      
      // Validate that all imported symbols exist in the exported module
      for (const name of imp.names) {
        if (!importedModule.exports.has(name)) {
          errors.push(`Symbol "${name}" not exported from module "${imp.module}" (imported by "${module.name}")`)
        } else {
          // Symbol exists - we'll patch function calls during a separate pass
          const fullName = `${imp.module}.${name}`
          const symbolAddress = symbolTable.get(fullName)
          if (symbolAddress === undefined) {
            errors.push(`Internal error: symbol "${fullName}" not found in symbol table`)
          }
        }
      }
    }
    
    // Build a map of imported function names to their addresses
    const importedFunctionAddresses = new Map<string, number>()
    for (const imp of module.imports) {
      for (const name of imp.names) {
        const fullName = `${imp.module}.${name}`
        const symbolAddress = symbolTable.get(fullName)
        if (symbolAddress !== undefined) {
          importedFunctionAddresses.set(name, symbolAddress)
        }
      }
    }
    
    // Get the function map for this module to identify internal functions
    const compileResult = compile(module.source)
    const moduleFunctionMap = compileResult.functionMap || new Map()
    
    // First, adjust internal function call addresses by module offset
    // Internal calls are relative to module start, so we add the module's base address
    for (let i = 0; i < moduleBytecode.length - 1; i++) {
      if (moduleBytecode[i] === OPCODES.CALL) {
        const callAddr = moduleBytecode[i + 1]
        // If it's a placeholder (0), it's an imported function - we'll patch it next
        // Otherwise, if it's within the module's bytecode range, it's an internal call
        if (callAddr !== 0 && callAddr < module.bytecode.length) {
          moduleBytecode[i + 1] = currentAddress + callAddr
        }
      }
    }
    
    // Now patch imported function calls using the relocation table
    // The relocation table tells us which function name each CALL 0 refers to
    if (module.relocationTable) {
      for (const reloc of module.relocationTable) {
        const address = importedFunctionAddresses.get(reloc.functionName)
        if (address !== undefined) {
          // reloc.offset is the bytecode offset where the address should be patched
          if (reloc.offset < moduleBytecode.length) {
            moduleBytecode[reloc.offset] = address
          } else {
            errors.push(`Invalid relocation offset ${reloc.offset} in module "${module.name}"`)
          }
        } else {
          errors.push(`Imported function "${reloc.functionName}" not found for relocation in module "${module.name}"`)
        }
      }
    }
    
    // Add module bytecode to linked output
    linkedBytecode.push(...moduleBytecode)
    currentAddress += moduleBytecode.length
  }
  
  return {
    bytecode: linkedBytecode,
    symbolTable,
    errors,
  }
}

/**
 * Simple module resolver that loads modules by name
 * In a real implementation, this would load from files
 */
export class ModuleResolver {
  private modules: Map<string, string> = new Map()
  
  register(name: string, source: string): void {
    this.modules.set(name, source)
  }
  
  resolve(name: string): string | null {
    return this.modules.get(name) || null
  }
  
  getAllModules(): Array<{ name: string; source: string }> {
    return Array.from(this.modules.entries()).map(([name, source]) => ({ name, source }))
  }
}

