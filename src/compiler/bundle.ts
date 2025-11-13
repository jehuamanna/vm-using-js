/**
 * Episode 19: Packaging & Distribution
 * .tvm bundle format (JSON-based, versioned)
 * Export/import programs with metadata and symbol tables
 */

export interface TVMBundle {
  version: string
  format: 'tvm'
  metadata: BundleMetadata
  bytecode: number[]
  symbolTable: Record<string, number>
  exports: Record<string, number>
  imports?: string[]
  dependencies?: BundleDependency[]
}

export interface BundleMetadata {
  name: string
  description?: string
  author?: string
  version?: string
  entryPoint?: string
  createdAt: string
  compilerVersion?: string
}

export interface BundleDependency {
  name: string
  version: string
  source?: string
}

const CURRENT_BUNDLE_VERSION = '1.0.0'

/**
 * Create a .tvm bundle from compilation result
 */
export function createBundle(
  bytecode: number[],
  symbolTable: Map<string, number>,
  exports: Map<string, number>,
  metadata: Partial<BundleMetadata> = {}
): TVMBundle {
  const now = new Date().toISOString()
  
  const bundle: TVMBundle = {
    version: CURRENT_BUNDLE_VERSION,
    format: 'tvm',
    metadata: {
      name: metadata.name || 'untitled',
      description: metadata.description,
      author: metadata.author,
      version: metadata.version || '1.0.0',
      entryPoint: metadata.entryPoint,
      createdAt: metadata.createdAt || now,
      compilerVersion: metadata.compilerVersion || '1.0.0',
    },
    bytecode,
    symbolTable: Object.fromEntries(symbolTable),
    exports: Object.fromEntries(exports),
  }
  
  return bundle
}

/**
 * Serialize bundle to JSON string
 */
export function serializeBundle(bundle: TVMBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/**
 * Deserialize bundle from JSON string
 */
export function deserializeBundle(json: string): TVMBundle {
  const bundle = JSON.parse(json) as TVMBundle
  
  // Validate bundle format
  if (bundle.format !== 'tvm') {
    throw new Error('Invalid bundle format')
  }
  
  if (!bundle.version || !bundle.bytecode || !bundle.symbolTable) {
    throw new Error('Invalid bundle structure')
  }
  
  // Check version compatibility
  if (bundle.version !== CURRENT_BUNDLE_VERSION) {
    console.warn(`Bundle version ${bundle.version} may not be compatible with current version ${CURRENT_BUNDLE_VERSION}`)
  }
  
  return bundle
}

/**
 * Export bundle to downloadable file
 */
export function exportBundle(bundle: TVMBundle, filename: string = 'program.tvm'): void {
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

/**
 * Import bundle from file
 */
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
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Load bundle bytecode for execution
 */
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

/**
 * Validate bundle structure
 */
export function validateBundle(bundle: TVMBundle): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (bundle.format !== 'tvm') {
    errors.push('Invalid format: must be "tvm"')
  }
  
  if (!bundle.version) {
    errors.push('Missing version')
  }
  
  if (!Array.isArray(bundle.bytecode)) {
    errors.push('Bytecode must be an array')
  }
  
  if (bundle.bytecode.length === 0) {
    errors.push('Bytecode cannot be empty')
  }
  
  if (!bundle.metadata) {
    errors.push('Missing metadata')
  } else {
    if (!bundle.metadata.name) {
      errors.push('Metadata must include name')
    }
  }
  
  if (!bundle.symbolTable) {
    errors.push('Missing symbol table')
  }
  
  if (!bundle.exports) {
    errors.push('Missing exports')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

