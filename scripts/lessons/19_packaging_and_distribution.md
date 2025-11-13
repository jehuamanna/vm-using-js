# Episode 19: Packaging & Distribution

## Introduction

Welcome back! In this episode, we're adding packaging and distribution capabilities to our VM. We'll create a `.tvm` bundle format that allows us to package programs with their bytecode, metadata, and symbol tables into a single distributable file. This is how real programming languages distribute libraries and executables!

## What We're Building

Today we'll add:
1. **.tvm Bundle Format**: JSON-based format for packaging programs
2. **Bundle Exporter**: Create bundles from compiled programs
3. **Bundle Importer**: Load and execute programs from bundles
4. **Metadata Support**: Include program information (name, author, description)
5. **Versioning**: Track bundle format versions for compatibility

## Why Packaging?

Packaging enables:
- **Distribution**: Share programs as single files
- **Portability**: Run programs on any VM instance
- **Versioning**: Track program versions and dependencies
- **Metadata**: Include documentation and authorship
- **Symbol Preservation**: Keep function/variable names for debugging

## .tvm Bundle Format

Our bundle format is JSON-based for easy inspection and debugging:

```json
{
  "version": "1.0.0",
  "format": "tvm",
  "metadata": {
    "name": "my-program",
    "description": "A sample program",
    "author": "John Doe",
    "version": "1.0.0",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "compilerVersion": "1.0.0"
  },
  "bytecode": [1, 5, 2, 1, 3, ...],
  "symbolTable": {
    "add": 10,
    "multiply": 25,
    "main": 50
  },
  "exports": {
    "add": 10,
    "multiply": 25
  }
}
```

### Bundle Structure

- **version**: Bundle format version (for compatibility checking)
- **format**: Always "tvm" to identify the format
- **metadata**: Program information
  - `name`: Program name
  - `description`: Optional description
  - `author`: Optional author name
  - `version`: Program version
  - `createdAt`: Creation timestamp
  - `compilerVersion`: Compiler version used
- **bytecode**: Compiled bytecode array
- **symbolTable**: Map of symbol names to addresses
- **exports**: Public API (exported symbols)

## Creating Bundles

We'll create a bundle from a compilation result:

```typescript
export function createBundle(
  bytecode: number[],
  symbolTable: Map<string, number>,
  exports: Map<string, number>,
  metadata: Partial<BundleMetadata> = {}
): TVMBundle {
  return {
    version: CURRENT_BUNDLE_VERSION,
    format: 'tvm',
    metadata: {
      name: metadata.name || 'untitled',
      description: metadata.description,
      author: metadata.author,
      version: metadata.version || '1.0.0',
      createdAt: new Date().toISOString(),
      compilerVersion: '1.0.0',
    },
    bytecode,
    symbolTable: Object.fromEntries(symbolTable),
    exports: Object.fromEntries(exports),
  }
}
```

## Serialization

Bundles are serialized to JSON for storage and transmission:

```typescript
export function serializeBundle(bundle: TVMBundle): string {
  return JSON.stringify(bundle, null, 2)
}

export function deserializeBundle(json: string): TVMBundle {
  const bundle = JSON.parse(json) as TVMBundle
  
  // Validate format
  if (bundle.format !== 'tvm') {
    throw new Error('Invalid bundle format')
  }
  
  // Check version compatibility
  if (bundle.version !== CURRENT_BUNDLE_VERSION) {
    console.warn(`Version mismatch: ${bundle.version} vs ${CURRENT_BUNDLE_VERSION}`)
  }
  
  return bundle
}
```

## Exporting Bundles

We can export bundles as downloadable files:

```typescript
export function exportBundle(bundle: TVMBundle, filename: string): void {
  const json = serializeBundle(bundle)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.tvm') ? filename : `${filename}.tvm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

## Importing Bundles

We can import bundles from files:

```typescript
export async function importBundle(file: File): Promise<TVMBundle> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const bundle = deserializeBundle(json)
        resolve(bundle)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.readAsText(file)
  })
}
```

## Loading Bundles

Once imported, we can load the bytecode for execution:

```typescript
export function loadBundle(bundle: TVMBundle): {
  bytecode: number[]
  symbolTable: Map<string, number>
  exports: Map<string, number>
} {
  return {
    bytecode: bundle.bytecode,
    symbolTable: new Map(Object.entries(bundle.symbolTable)),
    exports: new Map(Object.entries(bundle.exports)),
  }
}
```

## Validation

We should validate bundles before using them:

```typescript
export function validateBundle(bundle: TVMBundle): { 
  valid: boolean
  errors: string[] 
} {
  const errors: string[] = []
  
  if (bundle.format !== 'tvm') {
    errors.push('Invalid format')
  }
  
  if (!Array.isArray(bundle.bytecode) || bundle.bytecode.length === 0) {
    errors.push('Invalid bytecode')
  }
  
  if (!bundle.metadata?.name) {
    errors.push('Missing metadata name')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
```

## Versioning

Versioning is important for compatibility:

- **Bundle format version**: Tracks the bundle structure
- **Program version**: Tracks the program itself
- **Compiler version**: Tracks which compiler created it

When loading a bundle, we check version compatibility and warn if there's a mismatch.

## Use Cases

Bundles enable several use cases:

1. **Library Distribution**: Share reusable code modules
2. **Program Deployment**: Package complete programs
3. **Version Management**: Track different versions
4. **Documentation**: Include metadata and descriptions
5. **Debugging**: Preserve symbol names for better error messages

## Example Workflow

1. **Write Program**: Create source code with exports
2. **Compile**: Generate bytecode and symbol tables
3. **Create Bundle**: Package with metadata
4. **Export**: Download as `.tvm` file
5. **Share**: Distribute the bundle file
6. **Import**: Load bundle in another VM instance
7. **Execute**: Run the program from the bundle

## What's Next?

In the next episode, we'll add a bytecode verifier that validates bytecode before execution, ensuring safety and correctness.

## Summary

We've implemented:
- **.tvm bundle format**: JSON-based packaging format
- **Bundle creation**: Package programs with metadata
- **Export/Import**: Save and load bundles
- **Versioning**: Track format and program versions
- **Validation**: Ensure bundle correctness

This gives us a complete packaging and distribution system, similar to how real languages package their programs!

Thanks for watching, and I'll see you in the next episode!

