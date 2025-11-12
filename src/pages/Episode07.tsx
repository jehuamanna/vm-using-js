import { useState, useEffect } from 'react'
import { TinyVM, ExecutionStep } from '../core/vm'
import { assemble, OPCODE_REFERENCE, MACROS } from '../core/assembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { useTheme } from '../components/theme-provider'
import { Loader2, Play, Bug, BookOpen, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode07() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [code, setCode] = useState<string>(`// Example: Using macros for cleaner code
PUSH 5
INC        // Increment: expands to PUSH 1, ADD
PRINT
PUSH 10
DEC        // Decrement: expands to PUSH -1, ADD
PRINT
HALT`)
  const [output, setOutput] = useState<string>('Output will appear here...')
  const [errors, setErrors] = useState<string[]>([])
  const [expandedSource, setExpandedSource] = useState<string>('')
  const [showExpanded, setShowExpanded] = useState<boolean>(false)
  const [showMacros, setShowMacros] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [executionTrace, setExecutionTrace] = useState<ExecutionStep[]>([])
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [traceOutput, setTraceOutput] = useState<string>('')

  // Detect dark mode
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

  const runCode = async (useDebugMode: boolean = false) => {
    vm.reset()
    setLoading(true)
    setOutput('Assembling...\n')
    setErrors([])
    setExecutionTrace([])
    setCurrentStep(-1)
    setTraceOutput('')

    await new Promise(resolve => setTimeout(resolve, 100))

    // Assemble the code
    const { bytecode, errors: assemblyErrors, expandedSource: expanded } = assemble(code)
    
    setExpandedSource(expanded || '')
    
    if (assemblyErrors.length > 0) {
      setErrors(assemblyErrors)
      setOutput(`Assembly errors:\n${assemblyErrors.join('\n')}`)
      setLoading(false)
      return
    }

    if (bytecode.length === 0) {
      setOutput('Error: No valid opcodes found in code.')
      setLoading(false)
      return
    }

    setOutput('Running...\n')

    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      if (useDebugMode) {
        vm.setDebugMode(true, (step) => {
          // Callback for real-time updates if needed
        })
        const results = vm.execute(bytecode, true)
        const trace = vm.getExecutionTrace()
        setExecutionTrace(trace)
        setCurrentStep(-1)
        setOutput(`Output: ${results.join('\n')}\n\nExecution completed with ${trace.length} steps in debug mode.`)
        setTraceOutput('Click "Step Forward" to step through execution.')
      } else {
        const results = vm.execute(bytecode, false)
        setOutput(`Output: ${results.join('\n')}\n\nExecution completed successfully.`)
      }
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
  }

  const stepThroughExecution = () => {
    if (executionTrace.length === 0) {
      setTraceOutput('No execution trace available. Run a program in debug mode first.')
      return
    }

    if (currentStep < executionTrace.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      const step = executionTrace[nextStep]
      setTraceOutput(`Step ${nextStep + 1}/${executionTrace.length}:\n` +
        `PC: ${step.pc}\n` +
        `Opcode: ${step.opcodeName} (0x${step.opcode.toString(16)})\n` +
        `Stack: [${step.stack.join(', ')}]\n` +
        `Call Stack Depth: ${step.callStackDepth}\n` +
        (step.error ? `Error: ${step.error}` : ''))
    } else {
      setTraceOutput('Reached end of execution trace.')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 7: Bytecode Compiler
          </h1>
          <p className="text-muted-foreground text-lg">
            Enhanced assembler with macro support
          </p>
        </div>

        {/* Code Editor Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Enhanced Compiler with Macros</CardTitle>
              <CardDescription>Write programs using macros for cleaner code</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMacros(!showMacros)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {showMacros ? 'Hide' : 'Show'} Macros
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showMacros && (
              <div className="bg-muted dark:bg-slate-900 p-4 rounded-md border border-border">
                <h3 className="font-semibold mb-3 text-foreground">Available Macros:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {MACROS.map((macro) => (
                    <div key={macro.name} className="font-mono border-l-2 border-primary pl-3">
                      <span className="text-blue-400 font-semibold">{macro.name}</span>
                      <div className="text-xs text-muted-foreground mt-1">{macro.description}</div>
                      <div className="text-xs text-green-400 mt-1">
                        Expands to: {macro.expand([]).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Source Code (with macros)</Label>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={code}
                  height="250px"
                  theme={isDark ? oneDark : undefined}
                  extensions={[javascript()]}
                  onChange={(value) => setCode(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                  }}
                />
              </div>
            </div>

            {expandedSource && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExpanded(!showExpanded)}
                  className="w-full"
                >
                  {showExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  {showExpanded ? 'Hide' : 'Show'} Expanded Source (after macro expansion)
                </Button>
                {showExpanded && (
                  <div className="border border-border rounded-md overflow-hidden">
                    <CodeMirror
                      value={expandedSource}
                      height="200px"
                      theme={isDark ? oneDark : undefined}
                      extensions={[javascript()]}
                      editable={false}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => runCode(false)}
                disabled={loading}
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
                    Compile & Run
                  </>
                )}
              </Button>
              <Button
                onClick={() => runCode(true)}
                disabled={loading}
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
                    <Bug className="mr-2 h-4 w-4" />
                    Run with Debug
                  </>
                )}
              </Button>
            </div>

            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <h4 className="font-semibold text-destructive mb-2">Assembly Errors:</h4>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {errors.map((error, idx) => (
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

        {/* Example Programs */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Example 1: Using INC/DEC</CardTitle>
              <CardDescription>Cleaner code with macros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-xs whitespace-pre-wrap border border-border mb-3">
{`PUSH 5
INC
PRINT
PUSH 10
DEC
PRINT
HALT`}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCode(`PUSH 5\nINC\nPRINT\nPUSH 10\nDEC\nPRINT\nHALT`)}
              >
                Load Example
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Example 2: Using NEG</CardTitle>
              <CardDescription>Negate a value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-xs whitespace-pre-wrap border border-border mb-3">
{`PUSH 42
NEG
PRINT
HALT`}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCode(`PUSH 42\nNEG\nPRINT\nHALT`)}
              >
                Load Example
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Debug Section */}
        {executionTrace.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Current Step</CardTitle>
                <CardDescription>Step-by-step execution details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-3">
                  <Button
                    onClick={stepThroughExecution}
                    variant="outline"
                    className="w-full"
                    disabled={currentStep >= executionTrace.length - 1}
                  >
                    Step Forward
                  </Button>
                </div>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[150px] whitespace-pre-wrap border border-border overflow-y-auto">
                  {traceOutput || 'Click "Step Forward" to step through execution.'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Full Execution Trace</CardTitle>
                <CardDescription>Complete execution history ({executionTrace.length} steps)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-xs min-h-[200px] whitespace-pre-wrap border border-border overflow-y-auto">
                  {executionTrace.length > 0 ? (
                    executionTrace.map((step, idx) => (
                      <div key={idx} className={idx === currentStep ? 'bg-primary/20 p-2 rounded mb-1' : 'mb-1'}>
                        {idx + 1}. PC={step.pc} {step.opcodeName} Stack=[{step.stack.join(', ')}] {step.error ? `ERROR: ${step.error}` : ''}
                      </div>
                    ))
                  ) : (
                    'No trace available.'
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

