import { useState, useEffect } from 'react'
import { compile } from '../compiler'
import { TinyVM } from '../core/vm'
import { disassemble, formatDisassembly } from '../core/disassembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { useTheme } from '../components/theme-provider'
import { Loader2, Code2, Play, ChevronDown, ChevronUp, FileCode, TreePine } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode12() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [sourceCode, setSourceCode] = useState<string>(`// Example: Functions in the language
fn add(a, b) {
    return a + b;
}

fn multiply(x, y) {
    return x * y;
}

fn square(n) {
    return multiply(n, n);
}

let result1 = add(5, 3);
print result1;

let result2 = multiply(4, 7);
print result2;

let result3 = square(6);
print result3;`)
  const [compilationResult, setCompilationResult] = useState<{
    bytecode: number[]
    errors: string[]
    tokens?: any[]
    ast?: any
  } | null>(null)
  const [output, setOutput] = useState<string>('Output will appear here...')
  const [loading, setLoading] = useState<boolean>(false)
  const [showTokens, setShowTokens] = useState<boolean>(false)
  const [showAST, setShowAST] = useState<boolean>(false)
  const [showBytecode, setShowBytecode] = useState<boolean>(true)
  const [showDisassembly, setShowDisassembly] = useState<boolean>(false)

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

  const compileCode = () => {
    setLoading(true)
    setOutput('Compiling...\n')
    setCompilationResult(null)
    
    // Use requestAnimationFrame to ensure UI updates, then compile
    requestAnimationFrame(() => {
      try {
        const result = compile(sourceCode)
        setCompilationResult(result)
        
        if (result.errors.length > 0) {
          setOutput(`Compilation errors:\n${result.errors.join('\n')}`)
        } else {
          setOutput('Compilation successful! Click "Run" to execute the program.')
        }
      } catch (error) {
        setOutput(`Compilation error:\n${error instanceof Error ? error.message : String(error)}`)
        setCompilationResult({
          bytecode: [],
          errors: [error instanceof Error ? error.message : String(error)],
        })
      } finally {
        setLoading(false)
      }
    })
  }

  const runCode = async () => {
    if (!compilationResult || compilationResult.errors.length > 0) {
      setOutput('Please compile the code first (no errors).')
      return
    }

    vm.reset()
    setLoading(true)
    setOutput('Running...\n')

    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      const results = vm.execute(compilationResult.bytecode, false)
      setOutput(`Output:\n${results.join('\n')}\n\nExecution completed successfully.`)
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 12: Functions in the Language
          </h1>
          <p className="text-muted-foreground text-lg">
            High-level function syntax, calls, and frame-relative locals
          </p>
        </div>

        {/* Source Code Editor */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Source Code
            </CardTitle>
            <CardDescription>
              Define and call functions with parameters and return values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mini Language Source</Label>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={sourceCode}
                  height="300px"
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

            <div className="flex gap-2">
              <Button
                onClick={compileCode}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Compiling...
                  </>
                ) : (
                  <>
                    <Code2 className="mr-2 h-4 w-4" />
                    Compile
                  </>
                )}
              </Button>
              <Button
                onClick={runCode}
                disabled={loading || !compilationResult || compilationResult.errors.length > 0}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </>
                )}
              </Button>
            </div>

            {compilationResult && compilationResult.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <h4 className="font-semibold text-destructive mb-2">Compilation Errors:</h4>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {compilationResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
              {output}
            </pre>
          </CardContent>
        </Card>

        {/* Compilation Details */}
        {compilationResult && compilationResult.errors.length === 0 && (
          <div className="space-y-4">
            {/* Tokens */}
            <Card>
              <CardHeader>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  <CardTitle className="text-lg">Tokens</CardTitle>
                  {showTokens ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showTokens && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
                    {JSON.stringify(compilationResult.tokens, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* AST */}
            <Card>
              <CardHeader>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowAST(!showAST)}
                >
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TreePine className="h-4 w-4" />
                    Abstract Syntax Tree (AST)
                  </CardTitle>
                  {showAST ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showAST && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
                    {JSON.stringify(compilationResult.ast, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Bytecode */}
            <Card>
              <CardHeader>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowBytecode(!showBytecode)}
                >
                  <CardTitle className="text-lg">Bytecode</CardTitle>
                  {showBytecode ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showBytecode && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md font-mono text-xs overflow-auto">
                    {compilationResult.bytecode.map((b, i) => 
                      i % 8 === 0 ? `\n${i.toString().padStart(4, '0')}: ${b.toString(16).padStart(2, '0')}` : ` ${b.toString(16).padStart(2, '0')}`
                    ).join('')}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Disassembly */}
            <Card>
              <CardHeader>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowDisassembly(!showDisassembly)}
                >
                  <CardTitle className="text-lg">Disassembly</CardTitle>
                  {showDisassembly ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showDisassembly && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md font-mono text-xs overflow-auto">
                    {formatDisassembly(disassemble(compilationResult.bytecode))}
                  </pre>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

