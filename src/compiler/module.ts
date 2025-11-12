/**
 * Episode 15: Module System and Linker
 * Handles module parsing, symbol resolution, and linking
 */

import { compile, CompileResult } from './index'
import { Program } from './parser'

export interface ModuleInfo {
  name: string
  source: string
  ast?: Program
  bytecode: number[]
  exports: Map<string, number> // Symbol name -> address
  imports: Array<{ names: string[]; module: string }>
  errors: string[]
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
  
  // Second pass: resolve imports and merge bytecode
  currentAddress = 0
  for (const module of modules) {
    const moduleStart = currentAddress
    const moduleBytecode = [...module.bytecode]
    
    // Resolve imports - for now we'll just validate they exist
    // In a full implementation, we'd patch function call addresses
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
          // Symbol exists - in a full implementation, we'd patch references here
          const fullName = `${imp.module}.${name}`
          const symbolAddress = symbolTable.get(fullName)
          if (symbolAddress !== undefined) {
            // Symbol is available for use
          }
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

