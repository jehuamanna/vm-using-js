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

export function Episode11() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [sourceCode, setSourceCode] = useState<string>(`// Example: Simple program with variables and control flow
let x = 5;
let y = 10;
let sum = x + y;
print sum;

if (sum > 10) {
    print 100;
} else {
    print 200;
}

let i = 0;
while (i < 5) {
    print i;
    i = i + 1;
}`)
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
            Episode 11: Complete Mini Language Compiler
          </h1>
          <p className="text-muted-foreground text-lg">
            Lexer → Parser → Code Generator pipeline
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
              Write programs in our mini language: let, if/else, while, arithmetic, I/O
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

            <div className="space-y-2">
              <Label>Output</Label>
              <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border overflow-y-auto">
                {output}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compilation Results */}
        {compilationResult && compilationResult.errors.length === 0 && (
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Tokens */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tokens</CardTitle>
                  <CardDescription>Lexical analysis output</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showTokens && (
                <CardContent>
                  <div className="border border-border rounded-md overflow-hidden">
                    <CodeMirror
                      value={JSON.stringify(compilationResult.tokens || [], null, 2)}
                      height="300px"
                      theme={isDark ? oneDark : undefined}
                      extensions={[javascript()]}
                      editable={false}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                      }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* AST */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5" />
                    Abstract Syntax Tree
                  </CardTitle>
                  <CardDescription>Parser output</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAST(!showAST)}
                >
                  {showAST ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showAST && (
                <CardContent>
                  <div className="border border-border rounded-md overflow-hidden">
                    <CodeMirror
                      value={JSON.stringify(compilationResult.ast || {}, null, 2)}
                      height="300px"
                      theme={isDark ? oneDark : undefined}
                      extensions={[javascript()]}
                      editable={false}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                      }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Bytecode and Disassembly */}
        {compilationResult && compilationResult.errors.length === 0 && (
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Bytecode */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Generated Bytecode</CardTitle>
                  <CardDescription>Code generator output</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBytecode(!showBytecode)}
                >
                  {showBytecode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showBytecode && (
                <CardContent>
                  <div className="bg-muted dark:bg-slate-900 p-4 rounded-md font-mono text-sm border border-border overflow-x-auto">
                    [{compilationResult.bytecode.join(', ')}]
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Disassembly */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Disassembly</CardTitle>
                  <CardDescription>Human-readable bytecode</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisassembly(!showDisassembly)}
                >
                  {showDisassembly ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showDisassembly && (
                <CardContent>
                  <div className="border border-border rounded-md overflow-hidden">
                    <CodeMirror
                      value={formatDisassembly(disassemble(compilationResult.bytecode).lines, {
                        showAddresses: true,
                        showRawBytes: false,
                        showComments: true
                      })}
                      height="300px"
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
              )}
            </Card>
          </div>
        )}

        {/* Language Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Mini Language Reference</CardTitle>
            <CardDescription>Supported syntax and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Variables</h4>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-sm border border-border">
                  let x = 5;<br />
                  let name = 10;
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Arithmetic</h4>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-sm border border-border">
                  let sum = a + b;<br />
                  let diff = a - b;<br />
                  let prod = a * b;
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Conditionals</h4>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-sm border border-border">
                  if (x &gt; 10) &#123;<br />
                  &nbsp;&nbsp;print 100;<br />
                  &#125; else &#123;<br />
                  &nbsp;&nbsp;print 200;<br />
                  &#125;
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Loops</h4>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-sm border border-border">
                  let i = 0;<br />
                  while (i &lt; 10) &#123;<br />
                  &nbsp;&nbsp;print i;<br />
                  &nbsp;&nbsp;i = i + 1;<br />
                  &#125;
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">I/O</h4>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-sm border border-border">
                  print 42;<br />
                  print x;<br />
                  read x;
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

