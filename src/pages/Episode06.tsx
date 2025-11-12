import { useState, useEffect } from 'react'
import { TinyVM, OPCODES, ExecutionStep } from '../core/vm'
import { assemble, OPCODE_REFERENCE } from '../core/assembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { useTheme } from '../components/theme-provider'
import { HelpCircle, Loader2, Play, StepForward, Bug, Code, BookOpen } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode06() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [errorOutput, setErrorOutput] = useState<string>('Output will appear here...')
  const [debugOutput, setDebugOutput] = useState<string>('Output will appear here...')
  const [traceOutput, setTraceOutput] = useState<string>('Execution trace will appear here...')
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [executionTrace, setExecutionTrace] = useState<ExecutionStep[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [debugMode, setDebugMode] = useState<boolean>(false)
  
  // Code editor state
  const [code, setCode] = useState<string>(`// Example program
PUSH 5
PUSH 3
ADD
PRINT
HALT`)
  const [editorOutput, setEditorOutput] = useState<string>('Output will appear here...')
  const [editorErrors, setEditorErrors] = useState<string[]>([])
  const [showOpcodeReference, setShowOpcodeReference] = useState<boolean>(false)

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

  const updateVisuals = () => {
    // Visual updates can be added here if needed
  }

  const runStackUnderflow = async () => {
    vm.reset()
    setLoading(true)
    setErrorOutput('Running...\n')
    updateVisuals()

    // Try to pop from empty stack (ADD requires 2 values)
    const bytecode = [
      OPCODES.ADD, // This will cause stack underflow (needs 2 values, stack is empty)
      OPCODES.HALT
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setErrorOutput(`Output: ${results.join('\n')}`)
    } catch (error) {
      setErrorOutput(`Error caught:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
    updateVisuals()
  }

  const runInvalidOpcode = async () => {
    vm.reset()
    setLoading(true)
    setErrorOutput('Running...\n')
    updateVisuals()

    // Invalid opcode
    const bytecode = [
      OPCODES.PUSH, 5,
      0xFF, // Invalid opcode
      OPCODES.HALT
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setErrorOutput(`Output: ${results.join('\n')}`)
    } catch (error) {
      setErrorOutput(`Error caught:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
    updateVisuals()
  }

  const runInvalidJump = async () => {
    vm.reset()
    setLoading(true)
    setErrorOutput('Running...\n')
    updateVisuals()

    // Invalid jump address
    const bytecode = [
      OPCODES.JMP, 999, // Jump to invalid address
      OPCODES.HALT
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setErrorOutput(`Output: ${results.join('\n')}`)
    } catch (error) {
      setErrorOutput(`Error caught:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
    updateVisuals()
  }

  const runDebugMode = async () => {
    vm.reset()
    setLoading(true)
    setDebugOutput('Running in debug mode...\n')
    setTraceOutput('')
    setExecutionTrace([])
    setCurrentStep(-1)
    updateVisuals()

    // Simple program to trace
    const bytecode = [
      OPCODES.PUSH, 5,
      OPCODES.PUSH, 3,
      OPCODES.ADD,
      OPCODES.PRINT,
      OPCODES.HALT
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const traceSteps: ExecutionStep[] = []
      vm.setDebugMode(true, (step) => {
        traceSteps.push(step)
      })
      const results = vm.execute(bytecode, true)
      const trace = vm.getExecutionTrace()
      setExecutionTrace(trace)
      setCurrentStep(-1)
      setDebugOutput(`Output: ${results.join('\n')}\n\nExecution completed with ${trace.length} steps.`)
      setTraceOutput('Click "Step Forward" to step through execution, or see full trace below.')
    } catch (error) {
      setDebugOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
    updateVisuals()
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

  const runCodeEditor = async (useDebugMode: boolean = false) => {
    vm.reset()
    setLoading(true)
    setEditorOutput('Assembling...\n')
    setEditorErrors([])
    setExecutionTrace([])
    setCurrentStep(-1)
    updateVisuals()

    await new Promise(resolve => setTimeout(resolve, 100))

    // Assemble the code
    const { bytecode, errors } = assemble(code)
    
    if (errors.length > 0) {
      setEditorErrors(errors)
      setEditorOutput(`Assembly errors:\n${errors.join('\n')}`)
      setLoading(false)
      return
    }

    if (bytecode.length === 0) {
      setEditorOutput('Error: No valid opcodes found in code.')
      setLoading(false)
      return
    }

    setEditorOutput('Running...\n')

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
        setEditorOutput(`Output: ${results.join('\n')}\n\nExecution completed with ${trace.length} steps in debug mode.`)
        setTraceOutput('Click "Step Forward" to step through execution, or see full trace below.')
      } else {
        const results = vm.execute(bytecode, false)
        setEditorOutput(`Output: ${results.join('\n')}\n\nExecution completed successfully.`)
      }
    } catch (error) {
      setEditorOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
    updateVisuals()
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Episode 6: Error Handling & Debugging
            </h1>
            <p className="text-muted-foreground text-lg">
              Enhanced error handling and execution tracing
            </p>
          </div>

          {/* Code Editor Section */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Code Editor</CardTitle>
                <CardDescription>Write and test bytecode programs</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOpcodeReference(!showOpcodeReference)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {showOpcodeReference ? 'Hide' : 'Show'} Opcodes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showOpcodeReference && (
                <div className="bg-muted dark:bg-slate-900 p-4 rounded-md border border-border">
                  <h3 className="font-semibold mb-3 text-foreground">Available Opcodes:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {OPCODE_REFERENCE.map((op) => (
                      <div key={op.name} className="font-mono">
                        <span className="text-blue-400 font-semibold">{op.name}</span>
                        <span className="text-muted-foreground ml-2">({op.operands} operand{op.operands !== 1 ? 's' : ''})</span>
                        <div className="text-xs text-muted-foreground ml-4">{op.description}</div>
                        <div className="text-xs text-green-400 ml-4">Example: {op.example}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Bytecode Program</Label>
                <div className="border border-border rounded-md overflow-hidden">
                  <CodeMirror
                    value={code}
                    height="300px"
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
                <p className="text-xs text-muted-foreground">
                  Write opcodes line by line. Comments start with //. Labels end with : (e.g., "loop:")
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => runCodeEditor(false)}
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
                      Run
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => runCodeEditor(true)}
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

              {editorErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                  <h4 className="font-semibold text-destructive mb-2">Assembly Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-destructive">
                    {editorErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label>Output</Label>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border overflow-y-auto">
                  {editorOutput}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Error Handling Demos</CardTitle>
                <CardDescription>Test various error conditions</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={runStackUnderflow} 
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Bug className="mr-2 h-4 w-4" />
                        Test Stack Underflow
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Attempts to pop from an empty stack
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={runInvalidOpcode} 
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Bug className="mr-2 h-4 w-4" />
                        Test Invalid Opcode
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Executes an unknown opcode (0xFF)
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={runInvalidJump} 
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Bug className="mr-2 h-4 w-4" />
                        Test Invalid Jump
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Jumps to an invalid address
                  </p>
                </div>

                <div className="space-y-2 flex flex-col min-h-0 mt-4">
                  <label className="text-sm font-semibold text-foreground">Error Output</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[150px] whitespace-pre-wrap border border-border flex-1 overflow-y-auto">
                    {errorOutput}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Debug Mode & Tracing</CardTitle>
                <CardDescription>Step through execution with debug mode</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={runDebugMode} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run with Debug Mode
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Executes a simple program and records execution trace
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={stepThroughExecution} 
                    variant="outline"
                    className="w-full"
                    disabled={executionTrace.length === 0 || currentStep >= executionTrace.length - 1}
                  >
                    <StepForward className="mr-2 h-4 w-4" />
                    Step Forward
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Step through execution one instruction at a time
                  </p>
                </div>

                <div className="space-y-2 flex flex-col min-h-0">
                  <label className="text-sm font-semibold text-foreground">Debug Output</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border flex-1 overflow-y-auto">
                    {debugOutput}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Step</CardTitle>
                <CardDescription>Step-by-step execution details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[200px] whitespace-pre-wrap border border-border overflow-y-auto">
                  {traceOutput || 'No trace available. Run a program in debug mode to see execution trace.'}
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
                    'No trace available. Run a program in debug mode first.'
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

