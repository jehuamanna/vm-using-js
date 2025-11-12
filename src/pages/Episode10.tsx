import { useState, useEffect } from 'react'
import { assemble, OPCODE_REFERENCE } from '../core/assembler'
import { 
  disassemble, 
  formatDisassembly, 
  formatDisassemblyWithMacros,
  prettyPrintBytecode,
  disassemblyToSource,
  DisassemblyLine
} from '../core/disassembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { useTheme } from '../components/theme-provider'
import { Loader2, Code2, Eye, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode10() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [sourceCode, setSourceCode] = useState<string>(`// Example: Simple program with macros
PUSH 5
INC        // This will be detected as a macro pattern
PRINT
PUSH 10
DEC        // This will also be detected
PRINT
HALT`)
  const [bytecodeInput, setBytecodeInput] = useState<string>('')
  const [disassemblyResult, setDisassemblyResult] = useState<{
    lines: DisassemblyLine[]
    formatted: string
    formattedWithMacros: string
    errors: string[]
  } | null>(null)
  const [bytecodeArray, setBytecodeArray] = useState<number[]>([])
  const [showRawBytes, setShowRawBytes] = useState<boolean>(false)
  const [showMacroSuggestions, setShowMacroSuggestions] = useState<boolean>(true)
  const [bytecodeFormat, setBytecodeFormat] = useState<'hex' | 'decimal' | 'mixed'>('mixed')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      } else {
        setIsDark(theme === 'dark')
      }
    }
    checkDarkMode()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)
    return () => mediaQuery.removeEventListener('change', checkDarkMode)
  }, [theme])

  const assembleAndDisassemble = () => {
    setErrors([])
    const { bytecode, errors: assemblyErrors } = assemble(sourceCode)
    
    if (assemblyErrors.length > 0) {
      setErrors(assemblyErrors)
      setDisassemblyResult(null)
      setBytecodeArray([])
      return
    }

    if (bytecode.length === 0) {
      setErrors(['No valid bytecode generated'])
      setDisassemblyResult(null)
      setBytecodeArray([])
      return
    }

    setBytecodeArray(bytecode)
    const result = disassemble(bytecode)
    setDisassemblyResult({
      ...result,
      formattedWithMacros: formatDisassemblyWithMacros(result.lines)
    })
  }

  const disassembleFromBytecode = () => {
    setErrors([])
    
    try {
      // Try to parse bytecode input
      let bytecode: number[] = []
      
      // Try parsing as array literal
      if (bytecodeInput.trim().startsWith('[')) {
        bytecode = JSON.parse(bytecodeInput)
      } else {
        // Try parsing as space/comma separated numbers
        bytecode = bytecodeInput
          .split(/[,\s]+/)
          .filter(s => s.trim())
          .map(s => {
            // Handle hex (0x prefix)
            if (s.startsWith('0x') || s.startsWith('0X')) {
              return parseInt(s, 16)
            }
            return parseInt(s, 10)
          })
          .filter(n => !isNaN(n))
      }

      if (bytecode.length === 0) {
        setErrors(['No valid bytecode found in input'])
        setDisassemblyResult(null)
        setBytecodeArray([])
        return
      }

      setBytecodeArray(bytecode)
      const result = disassemble(bytecode)
      setDisassemblyResult({
        ...result,
        formattedWithMacros: formatDisassemblyWithMacros(result.lines)
      })
    } catch (error) {
      setErrors([`Error parsing bytecode: ${error instanceof Error ? error.message : String(error)}`])
      setDisassemblyResult(null)
      setBytecodeArray([])
    }
  }

  const roundTripTest = () => {
    if (!disassemblyResult) return
    
    // Convert disassembly back to source
    const reconstructedSource = disassemblyToSource(disassemblyResult.lines)
    
    // Assemble the reconstructed source
    const { bytecode, errors: assemblyErrors } = assemble(reconstructedSource)
    
    // Compare bytecode
    const matches = bytecode.length === bytecodeArray.length &&
      bytecode.every((b, i) => b === bytecodeArray[i])
    
    if (matches) {
      alert('✅ Round-trip test passed! Disassembly → Source → Bytecode matches original.')
    } else {
      alert('❌ Round-trip test failed. The bytecode differs from the original.')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 10: Bytecode Disassembler & Pretty Printer
          </h1>
          <p className="text-muted-foreground text-lg">
            Convert bytecode back to human-readable mnemonics
          </p>
        </div>

        {/* Source Code to Bytecode */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assemble & Disassemble
            </CardTitle>
            <CardDescription>
              Write source code, assemble it to bytecode, then disassemble it back
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Code</Label>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={sourceCode}
                  height="200px"
                  theme={isDark ? oneDark : undefined}
                  extensions={[javascript()]}
                  onChange={(value) => setSourceCode(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                  }}
                />
              </div>
            </div>

            <Button
              onClick={assembleAndDisassemble}
              className="w-full"
            >
              <Code2 className="mr-2 h-4 w-4" />
              Assemble & Disassemble
            </Button>

            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <h4 className="font-semibold text-destructive mb-2">Errors:</h4>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bytecode Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Disassemble Raw Bytecode
            </CardTitle>
            <CardDescription>
              Paste bytecode array to disassemble directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bytecode (array, hex, or comma-separated numbers)</Label>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={bytecodeInput}
                  height="100px"
                  theme={isDark ? oneDark : undefined}
                  extensions={[javascript()]}
                  onChange={(value) => setBytecodeInput(value)}
                  basicSetup={{
                    lineNumbers: false,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Examples: [1, 5, 1, 1, 2, 5, 0] or 0x01 5 0x01 1 0x02 0x05 0x00
              </p>
            </div>

            <Button
              onClick={disassembleFromBytecode}
              variant="outline"
              className="w-full"
            >
              <Eye className="mr-2 h-4 w-4" />
              Disassemble Bytecode
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {disassemblyResult && (
          <>
            {/* Bytecode Display */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Generated Bytecode</CardTitle>
                <CardDescription>Raw bytecode array in different formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={bytecodeFormat === 'hex' ? 'default' : 'outline'}
                    onClick={() => setBytecodeFormat('hex')}
                  >
                    Hex
                  </Button>
                  <Button
                    size="sm"
                    variant={bytecodeFormat === 'decimal' ? 'default' : 'outline'}
                    onClick={() => setBytecodeFormat('decimal')}
                  >
                    Decimal
                  </Button>
                  <Button
                    size="sm"
                    variant={bytecodeFormat === 'mixed' ? 'default' : 'outline'}
                    onClick={() => setBytecodeFormat('mixed')}
                  >
                    Mixed
                  </Button>
                </div>
                <div className="bg-muted dark:bg-slate-900 p-4 rounded-md font-mono text-sm border border-border overflow-x-auto">
                  {prettyPrintBytecode(bytecodeArray, bytecodeFormat)}
                </div>
              </CardContent>
            </Card>

            {/* Disassembly Display */}
            <div className="grid gap-6 lg:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Disassembly</CardTitle>
                    <CardDescription>Human-readable mnemonics</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawBytes(!showRawBytes)}
                  >
                    {showRawBytes ? 'Hide' : 'Show'} Raw Bytes
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border border-border rounded-md overflow-hidden">
                    <CodeMirror
                      value={formatDisassembly(disassemblyResult.lines, {
                        showAddresses: true,
                        showRawBytes,
                        showComments: true
                      })}
                      height="400px"
                      theme={isDark ? oneDark : undefined}
                      extensions={[javascript()]}
                      editable={false}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>With Macro Suggestions</CardTitle>
                    <CardDescription>Detected macro patterns highlighted</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMacroSuggestions(!showMacroSuggestions)}
                  >
                    {showMacroSuggestions ? 'Hide' : 'Show'} Macros
                  </Button>
                </CardHeader>
                <CardContent>
                  {showMacroSuggestions ? (
                    <div className="border border-border rounded-md overflow-hidden">
                      <CodeMirror
                        value={disassemblyResult.formattedWithMacros}
                        height="400px"
                        theme={isDark ? oneDark : undefined}
                        extensions={[javascript()]}
                        editable={false}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: false,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden">
                      <CodeMirror
                        value={formatDisassembly(disassemblyResult.lines, {
                          showAddresses: true,
                          showRawBytes: false,
                          showComments: true
                        })}
                        height="400px"
                        theme={isDark ? oneDark : undefined}
                        extensions={[javascript()]}
                        editable={false}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: false,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Round-trip Test */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Round-Trip Test
                </CardTitle>
                <CardDescription>
                  Test that disassembly can be reassembled to the same bytecode
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={roundTripTest}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Round-Trip (Disassemble → Source → Assemble)
                </Button>
                <div className="bg-muted dark:bg-slate-900 p-4 rounded-md font-mono text-xs border border-border">
                  <div className="mb-2 font-semibold">Reconstructed Source:</div>
                  <div className="whitespace-pre-wrap">{disassemblyToSource(disassemblyResult.lines)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Disassembly Errors */}
            {disassemblyResult.errors.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Disassembly Warnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md">
                    <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                      {disassemblyResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Opcode Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Opcode Reference</CardTitle>
            <CardDescription>All available opcodes and their bytecode values</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">Opcode</th>
                    <th className="text-left p-2 font-semibold text-foreground">Value</th>
                    <th className="text-left p-2 font-semibold text-foreground">Operands</th>
                    <th className="text-left p-2 font-semibold text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {OPCODE_REFERENCE.map((op) => (
                    <tr key={op.name} className="border-b border-border">
                      <td className="p-2 font-mono font-semibold text-foreground">{op.name}</td>
                      <td className="p-2 font-mono text-muted-foreground">0x{op.value.toString(16).padStart(2, '0')}</td>
                      <td className="p-2 text-muted-foreground">{op.operands}</td>
                      <td className="p-2 text-muted-foreground">{op.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

