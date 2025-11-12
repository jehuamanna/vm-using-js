import React, { useState, useCallback } from 'react'
import { compile } from '../compiler'
import { TinyVM } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Layers, Type
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

const defaultCode = `// Episode 16: Arrays & Strings
// Arrays are allocated on the heap with length prefix
// Strings are null-terminated with length prefix

let arr = [10, 20, 30, 40, 50];
let i = 0;

while (i < 5) {
    print arr[i];
    i = i + 1;
}

// String example (simplified - strings are heap addresses)
let str = "Hello";
print str; // Prints heap address (for now)
`

export function Episode16() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [source, setSource] = useState(defaultCode)
  const [compiling, setCompiling] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bytecode, setBytecode] = useState<number[]>([])

  React.useEffect(() => {
    setIsDark(theme === 'dark')
  }, [theme])

  const handleCompile = useCallback(() => {
    setCompiling(true)
    setError(null)
    setOutput([])
    setBytecode([])

    try {
      const result = compile(source)
      if (result.errors.length > 0) {
        setError(result.errors.join('\n'))
        setCompiling(false)
        return
      }

      setBytecode(result.bytecode || [])
      setCompiling(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCompiling(false)
    }
  }, [source])

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
      // Enable debug mode temporarily to see heap operations
      vm.debugMode = true
      const result = vm.execute(bytecode, true)
      vm.debugMode = false
      setOutput(result)
      setRunning(false)
    } catch (err) {
      vm.debugMode = false
      setError(err instanceof Error ? err.message : 'Unknown error')
      setRunning(false)
    }
  }, [bytecode, vm])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Episode 16: Arrays & Strings
          </h1>
          <p className="text-muted-foreground mt-2">
            Heap memory allocation, arrays, and null-terminated strings
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
              Write code using arrays and strings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <CodeMirror
                value={source}
                height="400px"
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

        {/* Output and Bytecode */}
        <div className="space-y-6">
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

          {/* Bytecode */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Bytecode</CardTitle>
              <CardDescription>
                {bytecode.length > 0 ? `${bytecode.length} bytes` : 'No bytecode yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bytecode.length > 0 ? (
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <div className="grid grid-cols-16 gap-1">
                    {bytecode.map((byte, i) => (
                      <div
                        key={i}
                        className="text-center p-1 bg-background rounded"
                        title={`Index ${i}: 0x${byte.toString(16).padStart(2, '0')} (${byte})`}
                      >
                        {byte.toString(16).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Compile to generate bytecode
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Arrays & Strings Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Arrays
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Arrays are allocated on the heap using <code className="bg-muted px-1 rounded">MALLOC</code></li>
              <li>Format: [length (4 bytes), elements...] where each element is 4 bytes</li>
              <li>Access elements with <code className="bg-muted px-1 rounded">arr[index]</code></li>
              <li>Assign with <code className="bg-muted px-1 rounded">arr[index] = value</code></li>
              <li>Example: <code className="bg-muted px-1 rounded">let arr = [1, 2, 3]; print arr[0];</code></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Strings
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Strings are allocated on the heap as null-terminated sequences</li>
              <li>Format: [length (4 bytes), chars..., null terminator]</li>
              <li>Each character is stored as 8-bit (ASCII code)</li>
              <li>Example: <code className="bg-muted px-1 rounded">let str = "Hello";</code></li>
              <li>String literals return heap addresses (for now, printing shows the address)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Heap Memory</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">MALLOC</code>: Allocates heap memory (size on stack, returns address)</li>
              <li><code className="bg-muted px-1 rounded">LOAD32_STACK</code>: Loads 32-bit value from heap (address on stack)</li>
              <li><code className="bg-muted px-1 rounded">STORE32_STACK</code>: Stores 32-bit value to heap (address on stack)</li>
              <li><code className="bg-muted px-1 rounded">STORE8_STACK</code>: Stores 8-bit value to heap (address on stack)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

