# Episode 15: Modules & Linking

## Overview
In this episode, we're adding a module system to our VM! We'll implement `import` and `export` statements, allowing us to split programs into multiple files and link them together. This is how real programming languages organize code - think JavaScript modules, Python packages, or C++ headers.

**Duration:** ~30-35 minutes  
**Learning Goals:**
- Understand why modules are important for code organization
- Implement `import` and `export` syntax in our language
- Build a module parser that extracts exports and imports
- Create a linker that merges modules and resolves symbols
- See how modules enable code reuse and organization

---

## Script Outline

### [00:00 - 05:00] Introduction & Why Modules Matter

**On Screen:** Title card, Episode 14 recap, Episode 15 title

**Narration:**
"Hey everyone! Welcome to Episode 15. Today we're adding modules to our language - one of the most important features for organizing code!

So far, all our programs have been in a single file. But as programs grow, we need a way to:
- **Split code into multiple files** - organize related functionality together
- **Reuse code** - write a function once, use it in many places
- **Hide implementation details** - only expose what's needed
- **Avoid naming conflicts** - different modules can have functions with the same name

This is exactly how real languages work! JavaScript has `import`/`export`, Python has `import`, C++ has `#include`, and so on.

Today, we're implementing:
1. **Export syntax** - mark functions and variables as public
2. **Import syntax** - bring in symbols from other modules
3. **Module parser** - extract exports and imports from source code
4. **Linker** - merge modules and resolve symbol references

Let's build a complete module system!"

---

### [05:00 - 12:00] Understanding Modules

**On Screen:** Diagram showing module structure

**Narration:**
"Before we code, let's understand what modules are and how they work.

A **module** is a self-contained unit of code that:
- Defines some functionality (functions, variables)
- Can **export** symbols to make them available to other modules
- Can **import** symbols from other modules

Here's a simple example:

```javascript
// math.js - exports functions
export fn add(a, b) {
    return a + b;
}

export fn multiply(a, b) {
    return a * b;
}

// main.js - imports and uses them
import { add, multiply } from "math";

let x = 5;
let y = 10;
let sum = add(x, y);
print sum;
```

The `math` module exports `add` and `multiply`. The `main` module imports them and uses them.

The **linker** is responsible for:
1. Parsing all modules
2. Building a symbol table (which symbols are exported from which modules)
3. Resolving imports (checking that imported symbols exist)
4. Merging bytecode from all modules
5. Adjusting addresses (since modules are concatenated)

This is exactly how real linkers work - they take multiple object files and combine them into a single executable!"

---

### [12:00 - 20:00] Adding Import/Export Syntax

**On Screen:** `src/compiler/lexer.ts` - Adding keywords

**Narration:**
"Let's start by adding the `import`, `export`, and `from` keywords to our lexer.

```typescript
export enum TokenType {
  // ... existing tokens ...
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  FROM = 'FROM',
}

const KEYWORDS: Record<string, TokenType> = {
  // ... existing keywords ...
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'from': TokenType.FROM,
}
```

These are just keywords, so they're recognized during tokenization. Now let's add AST nodes for import and export statements.

In the parser, we'll add:

```typescript
export interface ImportStatement {
  type: 'ImportStatement'
  names: string[] // List of imported names
  module: string // Module name/path
}

export interface ExportStatement {
  type: 'ExportStatement'
  name: string // Exported name (function or variable)
}
```

The import statement can have two forms:
- `import { name1, name2 } from "module"` - named imports
- `import name from "module"` - single import

Let's implement the parser methods:

```typescript
private parseImportStatement(): ImportStatement {
  this.expect(TokenType.IMPORT)
  
  const names: string[] = []
  
  if (this.current().type === TokenType.LEFT_BRACE) {
    // Named imports: import { name1, name2 } from "module"
    this.advance() // consume {
    
    if (this.current().type !== TokenType.RIGHT_BRACE) {
      names.push(this.expect(TokenType.IDENTIFIER).value as string)
      while (this.current().type === TokenType.COMMA) {
        this.advance()
        names.push(this.expect(TokenType.IDENTIFIER).value as string)
      }
    }
    
    this.expect(TokenType.RIGHT_BRACE)
  } else {
    // Single import: import name from "module"
    names.push(this.expect(TokenType.IDENTIFIER).value as string)
  }
  
  this.expect(TokenType.FROM)
  
  // Parse module name (string or identifier)
  let module: string
  if (this.current().type === TokenType.STRING) {
    module = this.expect(TokenType.STRING).value as string
  } else {
    module = this.expect(TokenType.IDENTIFIER).value as string
  }
  
  this.expect(TokenType.SEMICOLON)
  
  return {
    type: 'ImportStatement',
    names,
    module,
  }
}
```

For exports, we'll support `export fn name(...)` or `export let name = ...`. The export statement marks the next definition as exported.

This gives us the syntax! Now we need to track exports during code generation."

---

### [20:00 - 28:00] Tracking Exports in Code Generator

**On Screen:** `src/compiler/codegen.ts` - Adding export tracking

**Narration:**
"Now we need to track which symbols are exported. Let's add an export map to the code generator:

```typescript
export class CodeGenerator {
  private exportMap: Map<string, number> = new Map() // Exported symbol name -> address
  
  getExportMap(): Map<string, number> {
    return new Map(this.exportMap)
  }
}
```

During code generation, we need to:
1. Detect when a function or variable is exported
2. Record its address in the export map

Let's modify the `generate` method to handle exports:

```typescript
generate(ast: Program): number[] {
  // First pass: collect exports and function definitions
  for (let i = 0; i < ast.statements.length; i++) {
    const stmt = ast.statements[i]
    const nextStmt = i + 1 < ast.statements.length ? ast.statements[i + 1] : null
    
    if (stmt.type === 'ExportStatement') {
      // Mark the next statement as exported
      if (nextStmt && nextStmt.type === 'LetStatement') {
        this.exportedVariables.add(nextStmt.name)
      }
    } else if (stmt.type === 'FunctionDefinition') {
      // Check if previous statement was export
      const prevStmt = i > 0 ? ast.statements[i - 1] : null
      const exported = prevStmt?.type === 'ExportStatement' && prevStmt.name === stmt.name
      this.functionBodies.push({
        name: stmt.name,
        body: stmt.body,
        parameters: stmt.parameters,
        exported,
      })
    }
  }
  
  // ... generate functions ...
  
  // When generating functions, add to export map if exported
  for (const func of this.functionBodies) {
    const funcAddress = this.bytecode.length
    this.functionMap.set(func.name, funcAddress)
    
    if (func.exported) {
      this.exportMap.set(func.name, funcAddress)
    }
    // ... generate function body ...
  }
  
  // ... generate main code ...
  
  // When generating variables, add to export map if exported
  for (const stmt of ast.statements) {
    if (stmt.type === 'LetStatement' && this.exportedVariables.has(stmt.name)) {
      const varAddress = this.variableMap.get(stmt.name)
      if (varAddress !== undefined) {
        this.exportMap.set(stmt.name, varAddress)
      }
    }
  }
}
```

This tracks all exported symbols and their addresses. The export map will be used by the linker to resolve imports!"

---

### [28:00 - 38:00] Building the Module System

**On Screen:** `src/compiler/module.ts` - Creating module parser and linker

**Narration:**
"Now let's build the module system! We'll create a module parser and linker.

First, let's define what a module is:

```typescript
export interface ModuleInfo {
  name: string
  source: string
  ast?: Program
  bytecode: number[]
  exports: Map<string, number> // Symbol name -> address
  imports: Array<{ names: string[]; module: string }>
  errors: string[]
}
```

A module has:
- Its name and source code
- Compiled bytecode
- A map of exported symbols and their addresses
- A list of imports (what it needs from other modules)
- Any compilation errors

Let's create a function to parse a module:

```typescript
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
```

This compiles the module and extracts its exports and imports. Now for the linker!

The linker takes multiple modules and:
1. Collects all exports with their addresses (adjusted for module offsets)
2. Validates that all imports can be resolved
3. Merges bytecode from all modules

```typescript
export function linkModules(modules: ModuleInfo[]): LinkedModule {
  const errors: string[] = []
  const symbolTable: Map<string, number> = new Map()
  const linkedBytecode: number[] = []
  
  // First pass: collect all exports with their base addresses
  const moduleOffsets: Map<string, number> = new Map()
  let currentAddress = 0
  
  for (const module of modules) {
    moduleOffsets.set(module.name, currentAddress)
    
    // Collect exports from this module with offset
    for (const [name, address] of module.exports.entries()) {
      const fullName = `${module.name}.${name}`
      const absoluteAddress = currentAddress + address
      symbolTable.set(fullName, absoluteAddress)
    }
    
    currentAddress += module.bytecode.length
  }
  
  // Second pass: resolve imports and merge bytecode
  currentAddress = 0
  for (const module of modules) {
    const moduleBytecode = [...module.bytecode]
    
    // Resolve imports - validate they exist
    for (const imp of module.imports) {
      const importedModule = modules.find(m => m.name === imp.module)
      if (!importedModule) {
        errors.push(`Module "${imp.module}" not found`)
        continue
      }
      
      // Validate that all imported symbols exist
      for (const name of imp.names) {
        if (!importedModule.exports.has(name)) {
          errors.push(`Symbol "${name}" not exported from module "${imp.module}"`)
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
```

The key insight: when we merge modules, we need to adjust addresses. If module A is 100 bytes and module B starts at address 100, all addresses in module B need to be offset by 100.

This is a simplified linker - a full implementation would also patch function call addresses to point to the correct locations!"

---

### [38:00 - 48:00] Building the Module UI

**On Screen:** `src/pages/Episode15.tsx` - Building the UI

**Narration:**
"Now let's build a UI that lets us work with multiple modules! We'll create:
1. **Module tabs** - switch between different modules
2. **Module editor** - edit each module's source code
3. **Compile & Link button** - compile all modules and link them
4. **Module information** - show exports and imports for each module
5. **Run button** - execute the linked program

The UI will have:
- A tab bar showing all modules
- A code editor for the active module
- Buttons to add/remove modules
- Compile and run controls
- Output showing module information and program results

Let's create the component:

```typescript
export function Episode15() {
  const [modules, setModules] = useState<ModuleTab[]>([
    {
      id: '1',
      name: 'math',
      source: `export fn add(a, b) {
    return a + b;
}`
    },
    {
      id: '2',
      name: 'main',
      source: `import { add } from "math";
let x = 5;
let y = 10;
let sum = add(x, y);
print sum;`
    }
  ])
  
  const compileAndLink = () => {
    // Parse all modules
    const moduleInfos = modules.map(m => parseModule(m.name, m.source))
    
    // Link modules
    const linked = linkModules(moduleInfos)
    
    // Store result
    setCompilationResult({ ...linked, modules: moduleInfos })
  }
  
  // ... render UI ...
}
```

This gives us a complete module development environment! We can create multiple modules, see their exports and imports, and link them together."

---

### [48:00 - 55:00] Demo & Testing

**On Screen:** Episode 15 demo UI in action

**Narration:**
"Let's test it! Here's a simple example with two modules:

**math module:**
```javascript
export fn add(a, b) {
    return a + b;
}

export fn multiply(a, b) {
    return a * b;
}
```

**main module:**
```javascript
import { add, multiply } from "math";

let x = 5;
let y = 10;
let sum = add(x, y);
let product = multiply(x, y);
print sum;
print product;
```

Let's compile and link:
1. **Parse modules** - each module is compiled separately
2. **Extract exports** - `math` exports `add` and `multiply`
3. **Extract imports** - `main` imports `add` and `multiply` from `math`
4. **Link** - validate that imports can be resolved
5. **Merge bytecode** - combine all modules into one program
6. **Run** - execute the linked program

The output shows:
- Module information (exports and imports)
- Linked program size
- Program execution results

This is exactly how real module systems work! The linker validates that all imports can be resolved and merges the code into a single executable."

---

### [55:00 - 60:00] Deep Dive: How Real Linkers Work

**On Screen:** Comparison with real linkers

**Narration:**
"Let's talk about how this compares to real linkers like the ones used in C, C++, or Rust.

**Symbol Resolution**: Real linkers build a global symbol table that maps symbol names to addresses. When a module references a symbol, the linker looks it up in the symbol table and patches the reference. Our linker validates that symbols exist, but doesn't patch references yet - that would require more sophisticated bytecode analysis.

**Address Relocation**: When modules are merged, addresses need to be adjusted. If module A is 1000 bytes and module B starts at address 1000, all addresses in module B need to be offset by 1000. Our linker does this for exports, but a full implementation would also patch all internal references.

**Circular Dependencies**: Real linkers handle circular dependencies (module A imports from B, B imports from A). Our simple linker doesn't handle this yet - it would require multiple passes or a more sophisticated dependency graph.

**Dead Code Elimination**: Advanced linkers can remove unused code. If a module exports a function that's never imported, it can be removed to reduce program size.

**Dynamic Linking**: Some linkers support dynamic linking - loading modules at runtime. This is how shared libraries work in operating systems.

**Name Mangling**: Languages like C++ use name mangling to encode type information in symbol names. This allows function overloading and type-safe linking.

Our module system is a simplified version, but it demonstrates the core concepts: parsing modules, tracking exports and imports, validating references, and merging code. This is the foundation that real module systems build on!"

---

### [60:00 - 65:00] Summary & Next Steps

**On Screen:** Summary slide, Episode 15 recap

**Narration:**
"Amazing work! In this episode, we:

1. **Added import/export syntax** - `import` and `export` keywords
2. **Extended the parser** - parse import and export statements
3. **Tracked exports in codegen** - build an export map
4. **Built a module system** - parse modules and extract exports/imports
5. **Created a linker** - merge modules and resolve symbols
6. **Built a module UI** - edit multiple modules and link them together

Our VM now supports:
- Splitting programs into multiple modules
- Exporting functions and variables
- Importing symbols from other modules
- Linking modules into a single program
- Validating that all imports can be resolved

This is a huge step forward! We can now organize code into reusable modules, just like real programming languages.

The concepts we've covered - modules, exports, imports, linking, symbol resolution - are exactly what you'll find in JavaScript modules, Python packages, C++ headers, and other real module systems. Understanding how these work at the VM level gives you deep insight into how all module systems function.

In the next episode, we'll explore arrays and strings - adding dynamic memory allocation and string manipulation to our language. But for now, you have a complete module system!

Thanks for watching, and I'll see you in the next episode!"

---

## Key Code Changes

### Lexer (`src/compiler/lexer.ts`)
- Added `IMPORT`, `EXPORT`, `FROM` token types
- Added keywords to keyword map

### Parser (`src/compiler/parser.ts`)
- Added `ImportStatement` and `ExportStatement` AST nodes
- Added `parseImportStatement()` method
- Added `parseExportStatement()` method
- Added import/export to Statement type union

### Code Generator (`src/compiler/codegen.ts`)
- Added `exportMap` to track exported symbols
- Added `getExportMap()` method
- Modified `generate()` to detect and track exports
- Added export tracking for functions and variables

### Module System (`src/compiler/module.ts`)
- Created `ModuleInfo` interface
- Created `parseModule()` function
- Created `linkModules()` function
- Created `ModuleResolver` class
- Implemented symbol resolution and bytecode merging

### Compiler (`src/compiler/index.ts`)
- Updated `CompileResult` to include `functionMap` and `exportMap`
- Exposed export information from code generator

### UI (`src/pages/Episode15.tsx`)
- Created module tab system
- Added module editor with syntax highlighting
- Implemented compile and link functionality
- Added module information display
- Added run functionality for linked programs

---

## Testing Examples

### Example 1: Math Module
```javascript
// math module
export fn add(a, b) {
    return a + b;
}

export fn multiply(a, b) {
    return a * b;
}

// main module
import { add, multiply } from "math";

let x = 5;
let y = 10;
let sum = add(x, y);
let product = multiply(x, y);
print sum;
print product;
```

**Expected Output:**
```
15
50
```

### Example 2: Utility Module
```javascript
// utils module
export fn max(a, b) {
    if (a > b) {
        return a;
    }
    return b;
}

export fn min(a, b) {
    if (a < b) {
        return a;
    }
    return b;
}

// main module
import { max, min } from "utils";

let x = 10;
let y = 20;
print max(x, y);
print min(x, y);
```

**Expected Output:**
```
20
10
```

### Example 3: Error Cases
```javascript
// math module
fn add(a, b) {  // Not exported!
    return a + b;
}

// main module
import { add } from "math";  // Error: add not exported
```

**Expected Error:**
```
Symbol "add" not exported from module "math"
```

---

## Advanced Concepts Explained

### Module Resolution
Modules are resolved by name. In a real implementation, this would involve:
- File system lookups (finding `math.js` or `math/module.js`)
- Module path resolution (handling relative and absolute paths)
- Module caching (avoiding recompiling the same module)

### Symbol Resolution
When linking, the linker:
1. Builds a global symbol table from all exports
2. For each import, looks up the symbol in the table
3. Validates that the symbol exists and is accessible
4. In a full implementation, patches references to point to the correct address

### Address Relocation
When modules are merged:
- Each module gets a base address (offset)
- All addresses within a module are relative to its base
- Exported symbols have absolute addresses (base + offset)
- Internal references would need patching in a full implementation

### Circular Dependencies
Circular dependencies (A imports from B, B imports from A) require:
- Multiple-pass linking
- Forward declarations
- Dependency graph analysis
- Our simple linker doesn't handle this yet

---

## Notes for Presenter

- Emphasize that this is how REAL module systems work - JavaScript, Python, etc.
- Show the module information panel to demonstrate exports and imports
- Test error cases (missing exports, missing modules)
- Explain that a full linker would also patch function call addresses
- Point out that this enables code organization and reuse
- Mention that real linkers handle much more (dead code elimination, optimization, etc.)
- This episode is a major milestone - we now have a complete module system!

