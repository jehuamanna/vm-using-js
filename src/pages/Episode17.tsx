import React, { useState, useCallback, useMemo } from 'react'
import { compile } from '../compiler'
import { TinyVM } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, BookOpen, Calculator, Layers, Type, FileText, List
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { disassemble } from '../core/disassembler'

const defaultCode = `// Episode 17: Mini Standard Library
// Using builtin functions from std.math, std.array, std.str, std.io

// std.math examples
let x = -5;
let absX = std.math.abs(x);
print absX; // 5

let minVal = std.math.min(10, 20);
print minVal; // 10

let maxVal = std.math.max(10, 20);
print maxVal; // 20

let sqrtVal = std.math.sqrt(16);
print sqrtVal; // 4

let powVal = std.math.pow(2, 3);
print powVal; // 8

// std.array examples
let arr = [10, 20, 30];
let len = std.array.length(arr);
print len; // 3

let newLen = std.array.push(arr, 40);
print newLen; // 4

let popped = std.array.pop(arr);
print popped; // 40

// std.str examples (strings are heap addresses)
let str1 = "Hello";
let str2 = "World";
let strLen = std.str.length(str1);
print strLen; // 5

let combined = std.str.concat(str1, str2);
let combinedLen = std.str.length(combined);
print combinedLen; // 10
`

export function Episode17() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [source, setSource] = useState(defaultCode)
  const [compiling, setCompiling] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bytecode, setBytecode] = useState<number[]>([])
  const [showDisassembly, setShowDisassembly] = useState(true)

  const disassembly = useMemo(() => {
    if (bytecode.length === 0) return null
    return disassemble(bytecode)
  }, [bytecode])

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Episode 17: Mini Standard Library
          </h1>
          <p className="text-muted-foreground mt-2">
            Builtin functions for math, arrays, strings, and I/O
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
              Use standard library builtins in your code
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
                <div className="border rounded-lg overflow-hidden bg-muted/50">
                  <div className="max-h-[400px] overflow-auto">
                    <div className="font-mono text-xs p-4">
                      {/* Header row with column labels */}
                      <div className="flex gap-1 mb-2 pb-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-4 px-4">
                        <div className="w-20 shrink-0 text-muted-foreground font-semibold text-[10px] flex items-center">
                          Address
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 16 }, (_, i) => (
                            <div
                              key={i}
                              className="w-8 text-center text-muted-foreground font-semibold text-[10px]"
                            >
                              {i.toString(16).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Bytecode rows */}
                      {Array.from({ length: Math.ceil(bytecode.length / 16) }, (_, rowIndex) => {
                        const startAddr = rowIndex * 16
                        
                        return (
                          <div key={rowIndex} className="flex gap-1 mb-1 hover:bg-background/50 rounded px-1 py-0.5 transition-colors">
                            {/* Address label */}
                            <div className="w-20 shrink-0 text-muted-foreground font-semibold flex items-center justify-end pr-2 text-[11px]">
                              {startAddr.toString(16).toUpperCase().padStart(4, '0')}
                            </div>
                            
                            {/* Bytes */}
                            <div className="flex gap-1">
                              {Array.from({ length: 16 }, (_, colIndex) => {
                                const byteIndex = startAddr + colIndex
                                const byte = bytecode[byteIndex]
                                
                                if (byte === undefined) {
                                  return (
                                    <div
                                      key={colIndex}
                                      className="w-8 text-center p-1.5 rounded bg-transparent"
                                    />
                                  )
                                }
                                
                                const hexValue = byte.toString(16).padStart(2, '0').toUpperCase()
                                const isOpcode = byte <= 0x1B // Our opcodes range
                                
                                return (
                                  <div
                                    key={colIndex}
                                    className={`
                                      w-8 text-center p-1.5 rounded transition-all cursor-pointer text-[11px]
                                      ${isOpcode 
                                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30' 
                                        : 'bg-background hover:bg-muted'
                                      }
                                      hover:scale-105 hover:shadow-sm
                                    `}
                                    title={`Address: 0x${byteIndex.toString(16).padStart(4, '0')}\nHex: 0x${hexValue}\nDecimal: ${byte}\n${isOpcode ? 'Opcode' : 'Data'}`}
                                  >
                                    {hexValue}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-8">
                  Compile to generate bytecode
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disassembly */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Disassembly
                  </CardTitle>
                  <CardDescription>
                    Human-readable bytecode instructions
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisassembly(!showDisassembly)}
                >
                  {showDisassembly ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showDisassembly && (
              <CardContent>
                {disassembly ? (
                  <div className="border rounded-lg overflow-hidden bg-muted/50">
                    <div className="max-h-[400px] overflow-auto">
                      <div className="font-mono text-xs p-4">
                        {disassembly.lines
                          .filter(line => !line.skip) // Skip PUSH instructions before CALL_BUILTIN
                          .map((line, idx) => {
                          const isBuiltin = line.mnemonic.startsWith('CALL_BUILTIN')
                          
                          return (
                            <div
                              key={idx}
                              className={`
                                flex gap-4 py-1 px-2 rounded hover:bg-background/50 transition-colors
                                ${isBuiltin ? 'bg-blue-500/10' : ''}
                              `}
                            >
                              <div className="w-16 shrink-0 text-muted-foreground text-[11px]">
                                {line.address.toString(16).toUpperCase().padStart(4, '0')}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={isBuiltin ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>
                                    {line.mnemonic}
                                  </span>
                                  {line.comment && (
                                    <span className="text-muted-foreground text-[10px]">
                                      // {line.comment}
                                    </span>
                                  )}
                                </div>
                                {line.rawBytes.length > 1 && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {line.rawBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">
                    Compile to see disassembly
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Library Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              std.math
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">std.math.abs(x)</code> - Returns absolute value</li>
              <li><code className="bg-muted px-1 rounded">std.math.min(a, b)</code> - Returns minimum of two values</li>
              <li><code className="bg-muted px-1 rounded">std.math.max(a, b)</code> - Returns maximum of two values</li>
              <li><code className="bg-muted px-1 rounded">std.math.sqrt(x)</code> - Returns integer square root</li>
              <li><code className="bg-muted px-1 rounded">std.math.pow(base, exp)</code> - Returns base raised to exp (integer only)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              std.array
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">std.array.length(arr)</code> - Returns array length</li>
              <li><code className="bg-muted px-1 rounded">std.array.push(arr, value)</code> - Pushes value to array, returns new length</li>
              <li><code className="bg-muted px-1 rounded">std.array.pop(arr)</code> - Pops and returns last element</li>
              <li><code className="bg-muted px-1 rounded">std.array.slice(arr, start, end)</code> - Returns new array slice</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Type className="w-4 h-4" />
              std.str
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">std.str.length(str)</code> - Returns string length</li>
              <li><code className="bg-muted px-1 rounded">std.str.concat(a, b)</code> - Concatenates two strings, returns new string</li>
              <li><code className="bg-muted px-1 rounded">std.str.charAt(str, index)</code> - Returns character at index (as ASCII code)</li>
              <li><code className="bg-muted px-1 rounded">std.str.substring(str, start, end)</code> - Returns new substring</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              std.io
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><code className="bg-muted px-1 rounded">std.io.readLine()</code> - Reads a line from input (returns string address)</li>
              <li><code className="bg-muted px-1 rounded">std.io.write(str)</code> - Writes string to output (prints each character)</li>
            </ul>
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> All builtin functions are compiled to <code className="bg-muted px-1 rounded">CALL_BUILTIN</code> opcodes,
              which execute native implementations in the VM. This provides efficient access to common operations
              without the overhead of function calls.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

