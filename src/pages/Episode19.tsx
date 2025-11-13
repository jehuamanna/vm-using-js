import React, { useState, useCallback, useRef } from 'react'
import { compile } from '../compiler'
import { TinyVM } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Package, Download, Upload, FileText, CheckCircle2, XCircle
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { 
  createBundle, 
  serializeBundle, 
  deserializeBundle, 
  exportBundle, 
  importBundle, 
  loadBundle,
  validateBundle,
  TVMBundle 
} from '../compiler/bundle'

const defaultCode = `// Episode 19: Packaging & Distribution
// Create a program and export it as a .tvm bundle

export fn add(a, b) {
    return a + b;
}

export fn multiply(a, b) {
    return a * b;
}

// Main program
let x = 10;
let y = 20;
let sum = add(x, y);
let product = multiply(x, y);

print sum;      // Expected: 30
print product;  // Expected: 200
`

export function Episode19() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [source, setSource] = useState(defaultCode)
  const [compiling, setCompiling] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bytecode, setBytecode] = useState<number[]>([])
  const [bundle, setBundle] = useState<TVMBundle | null>(null)
  const [bundleJson, setBundleJson] = useState<string>('')
  const [bundleName, setBundleName] = useState('my-program')
  const [bundleDescription, setBundleDescription] = useState('')
  const [bundleAuthor, setBundleAuthor] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setIsDark(theme === 'dark')
  }, [theme])

  const handleCompile = useCallback(() => {
    setCompiling(true)
    setError(null)
    setOutput([])
    setBytecode([])
    setBundle(null)
    setBundleJson('')

    try {
      const result = compile(source, true) // Enable optimizations
      if (result.errors.length > 0) {
        setError(result.errors.join('\n'))
        setCompiling(false)
        return
      }

      setBytecode(result.bytecode || [])
      
      // Create bundle
      if (result.bytecode && result.functionMap && result.exportMap) {
        const newBundle = createBundle(
          result.bytecode,
          result.functionMap,
          result.exportMap,
          {
            name: bundleName || 'untitled',
            description: bundleDescription || undefined,
            author: bundleAuthor || undefined,
            version: '1.0.0',
          }
        )
        setBundle(newBundle)
        setBundleJson(serializeBundle(newBundle))
      }
      
      setCompiling(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCompiling(false)
    }
  }, [source, bundleName, bundleDescription, bundleAuthor])

  const handleRun = useCallback(() => {
    if (bytecode.length === 0) {
      setError('Please compile first')
      return
    }

    setRunning(true)
    setError(null)
    setOutput([])
    vm.reset()

    try {
      const result = vm.execute(bytecode, true)
      
      if (result.length === 0) {
        setOutput([])
        setError('No output produced.')
      } else {
        setOutput(result)
      }
      setRunning(false)
    } catch (err) {
      console.error('Execution error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setRunning(false)
    }
  }, [bytecode, vm])

  const handleExport = useCallback(() => {
    if (!bundle) {
      setError('No bundle to export. Please compile first.')
      return
    }
    
    const filename = bundleName || bundle.metadata.name || 'program'
    exportBundle(bundle, `${filename}.tvm`)
  }, [bundle, bundleName])

  const handleImport = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Please select a file to import')
      return
    }

    try {
      const importedBundle = await importBundle(file)
      const validation = validateBundle(importedBundle)
      
      if (!validation.valid) {
        setError(`Invalid bundle: ${validation.errors.join(', ')}`)
        return
      }

      setBundle(importedBundle)
      setBundleJson(serializeBundle(importedBundle))
      setBundleName(importedBundle.metadata.name)
      setBundleDescription(importedBundle.metadata.description || '')
      setBundleAuthor(importedBundle.metadata.author || '')
      
      // Load bytecode for execution
      const loaded = loadBundle(importedBundle)
      setBytecode(loaded.bytecode)
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import bundle')
    }
  }, [])

  const handleRunFromBundle = useCallback(() => {
    if (!bundle) {
      setError('No bundle loaded')
      return
    }

    const loaded = loadBundle(bundle)
    setBytecode(loaded.bytecode)
    handleRun()
  }, [bundle, handleRun])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8" />
            Episode 19: Packaging & Distribution
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, export, and import .tvm bundles with metadata and symbol tables
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Code Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Source Code
            </CardTitle>
            <CardDescription>
              Write code and export as .tvm bundle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <CodeMirror
                value={source}
                height="300px"
                theme={isDark ? oneDark : undefined}
                extensions={[javascript()]}
                onChange={(value) => setSource(value)}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCompile}
                disabled={compiling || running}
                className="flex-1"
              >
                {compiling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Compiling...
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4 mr-2" />
                    Compile
                  </>
                )}
              </Button>
              <Button
                onClick={handleRun}
                disabled={running || bytecode.length === 0}
                variant="default"
                className="flex-1"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bundle Metadata
            </CardTitle>
            <CardDescription>
              Configure bundle information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bundleName">Name</Label>
              <Input
                id="bundleName"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="my-program"
              />
            </div>
            <div>
              <Label htmlFor="bundleDescription">Description</Label>
              <Input
                id="bundleDescription"
                value={bundleDescription}
                onChange={(e) => setBundleDescription(e.target.value)}
                placeholder="A description of the program"
              />
            </div>
            <div>
              <Label htmlFor="bundleAuthor">Author</Label>
              <Input
                id="bundleAuthor"
                value={bundleAuthor}
                onChange={(e) => setBundleAuthor(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleExport}
                disabled={!bundle}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Export .tvm
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import .tvm
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".tvm,application/json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output */}
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
          <CardDescription>Program execution results</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
              {error}
            </div>
          ) : output.length > 0 ? (
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
              {output.map((value, i) => (
                <div key={i}>{value}</div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              No output yet. Compile and run to see results.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bundle Information */}
      {bundle && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Information</CardTitle>
              <CardDescription>
                Details about the current bundle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Format</div>
                <div className="font-semibold">{bundle.format}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Version</div>
                <div className="font-semibold">{bundle.version}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-semibold">{bundle.metadata.name}</div>
              </div>
              {bundle.metadata.description && (
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-semibold">{bundle.metadata.description}</div>
                </div>
              )}
              {bundle.metadata.author && (
                <div>
                  <div className="text-sm text-muted-foreground">Author</div>
                  <div className="font-semibold">{bundle.metadata.author}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">Bytecode Size</div>
                <div className="font-semibold">{bundle.bytecode.length} bytes</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Exports</div>
                <div className="font-semibold">{Object.keys(bundle.exports).length} symbols</div>
                {Object.keys(bundle.exports).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Object.keys(bundle.exports).join(', ')}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-semibold text-xs">
                  {new Date(bundle.metadata.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={handleRunFromBundle}
                  disabled={running}
                  variant="default"
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run from Bundle
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bundle JSON</CardTitle>
              <CardDescription>
                Raw bundle data (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                <div className="max-h-[400px] overflow-auto p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap">
                    {bundleJson}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>.tvm Bundle Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Bundle Structure</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">version</code> - Bundle format version</li>
              <li><code className="bg-muted px-1 rounded">format</code> - Always "tvm"</li>
              <li><code className="bg-muted px-1 rounded">metadata</code> - Program metadata (name, author, description, etc.)</li>
              <li><code className="bg-muted px-1 rounded">bytecode</code> - Compiled bytecode array</li>
              <li><code className="bg-muted px-1 rounded">symbolTable</code> - Function and variable addresses</li>
              <li><code className="bg-muted px-1 rounded">exports</code> - Exported symbols (public API)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Usage</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Compile your program to generate bytecode</li>
              <li>Fill in bundle metadata (name, description, author)</li>
              <li>Click "Export .tvm" to download the bundle</li>
              <li>Click "Import .tvm" to load a bundle from file</li>
              <li>Run programs directly from imported bundles</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Benefits</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>Portability</strong>: Share programs as single files</li>
              <li><strong>Versioning</strong>: Track bundle format versions</li>
              <li><strong>Metadata</strong>: Include program information</li>
              <li><strong>Symbol Tables</strong>: Preserve function/variable names</li>
              <li><strong>Distribution</strong>: Easy to share and deploy</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

