import { useState, useEffect, useCallback } from 'react'
import { compile } from '../compiler'
import { TinyVM, ExecutionStep, Breakpoint, Watch } from '../core/vm'
import { disassemble, formatDisassembly } from '../core/disassembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Pause, StepForward, SkipForward, 
  RotateCcw, ChevronDown, ChevronUp, FileCode, TreePine, 
  AlertTriangle, Bug, Eye, List, MemoryStick
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode14() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [sourceCode, setSourceCode] = useState<string>(`// Example: Debugging with step controls and breakpoints
fn factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

let x = 5;
let result = factorial(x);
print result;`)
  const [compilationResult, setCompilationResult] = useState<{
    bytecode: number[]
    errors: string[]
    tokens?: any[]
    ast?: any
  } | null>(null)
  const [output, setOutput] = useState<string>('Output will appear here...')
  const [loading, setLoading] = useState<boolean>(false)
  const [isDebugging, setIsDebugging] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<ExecutionStep | null>(null)
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set())
  const [watches, setWatches] = useState<Watch[]>([])
  const [watchInput, setWatchInput] = useState<string>('')
  const [watchType, setWatchType] = useState<'variable' | 'memory'>('variable')
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
    setCurrentStep(null)
    setIsPaused(false)
    setIsDebugging(false)
    
    requestAnimationFrame(() => {
      try {
        const result = compile(sourceCode)
        setCompilationResult(result)
        
        if (result.errors.length > 0) {
          setOutput(`Compilation errors:\n${result.errors.join('\n')}`)
        } else {
          setOutput('Compilation successful! Click "Start Debugging" to begin.')
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

  const startDebugging = useCallback(() => {
    if (!compilationResult || compilationResult.errors.length > 0) {
      setOutput('Please compile the code first (no errors).')
      return
    }

    vm.reset()
    vm.setDebugMode(true, (step: ExecutionStep) => {
      setCurrentStep(step)
      setIsPaused(vm.paused)
    })

    // Set breakpoints
    for (const addr of breakpoints) {
      vm.setBreakpoint(addr, true)
    }

    // Set watches
    for (const watch of watches) {
      vm.addWatch(watch)
    }

    setIsDebugging(true)
    setIsPaused(false)
    setOutput('Debugging started. Execution will pause at first instruction or breakpoint.\n')

    // Start execution - it will pause at first instruction in step-into mode
    try {
      vm.execute(compilationResult.bytecode, true, false)
      // After first execute, check if we paused
      setIsPaused(vm.paused)
      if (vm.paused) {
        const trace = vm.getExecutionTrace()
        setCurrentStep(trace[trace.length - 1] || null)
      } else {
        // If we didn't pause, execution completed immediately
        updateOutput()
        setIsDebugging(false)
      }
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
      setIsDebugging(false)
    }
  }, [compilationResult, breakpoints, watches, vm])

  const stepInto = () => {
    if (!isPaused || !compilationResult) return
    vm.stepInto()
    executeStep()
  }

  const stepOver = () => {
    if (!isPaused || !compilationResult) return
    vm.stepOver()
    executeStep()
  }

  const stepOut = () => {
    if (!isPaused || !compilationResult) return
    vm.stepOut()
    executeStep()
  }

  const continueExecution = () => {
    if (!isPaused || !compilationResult) return
    vm.continue()
    executeStep()
  }

  const executeStep = () => {
    if (!compilationResult) return
    try {
      vm.execute(compilationResult.bytecode, true, true)
      setIsPaused(vm.paused)
      const trace = vm.getExecutionTrace()
      setCurrentStep(trace[trace.length - 1] || null)
      updateOutput()
      
      if (!vm.running) {
        setIsDebugging(false)
        setIsPaused(false)
      }
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
      setIsDebugging(false)
      setIsPaused(false)
    }
  }

  const updateOutput = () => {
    const results = vm.output
    if (results.length > 0) {
      setOutput(`Output:\n${results.join('\n')}\n`)
    }
  }

  const toggleBreakpoint = (address: number) => {
    const newBreakpoints = new Set(breakpoints)
    if (newBreakpoints.has(address)) {
      newBreakpoints.delete(address)
      vm.removeBreakpoint(address)
    } else {
      newBreakpoints.add(address)
      vm.setBreakpoint(address, true)
    }
    setBreakpoints(newBreakpoints)
  }

  const addWatch = () => {
    if (!watchInput.trim()) return
    
    const address = parseInt(watchInput.trim())
    if (isNaN(address)) {
      alert('Please enter a valid address number')
      return
    }

    const watch: Watch = {
      name: `${watchType}@${address}`,
      type: watchType,
      address: address,
    }
    
    const newWatches = [...watches, watch]
    setWatches(newWatches)
    vm.addWatch(watch)
    setWatchInput('')
  }

  const removeWatch = (index: number) => {
    const newWatches = watches.filter((_, i) => i !== index)
    setWatches(newWatches)
    vm.removeWatch(index)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 14: Debugger Pro
          </h1>
          <p className="text-muted-foreground text-lg">
            Professional debugging with step controls, breakpoints, and watches
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
              Compile and debug your programs with step-by-step execution
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

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={compileCode}
                disabled={loading}
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
                onClick={startDebugging}
                disabled={loading || !compilationResult || compilationResult.errors.length > 0 || isDebugging}
                variant="default"
              >
                <Bug className="mr-2 h-4 w-4" />
                Start Debugging
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

        {/* Debug Controls */}
        {isDebugging && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={stepInto}
                  disabled={!isPaused}
                  variant="outline"
                  size="sm"
                >
                  <StepForward className="mr-2 h-4 w-4" />
                  Step Into
                </Button>
                <Button
                  onClick={stepOver}
                  disabled={!isPaused}
                  variant="outline"
                  size="sm"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Step Over
                </Button>
                <Button
                  onClick={stepOut}
                  disabled={!isPaused || vm.callStack.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Step Out
                </Button>
                <Button
                  onClick={continueExecution}
                  disabled={!isPaused}
                  variant="default"
                  size="sm"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Continue
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  {isPaused ? (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Pause className="h-4 w-4" />
                      Paused
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      Running
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Instruction */}
        {isDebugging && currentStep && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Current Instruction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">PC:</span> {currentStep.pc}
                </div>
                <div>
                  <span className="font-semibold">Opcode:</span> {currentStep.opcodeName} (0x{currentStep.opcode.toString(16).padStart(2, '0')})
                </div>
                <div>
                  <span className="font-semibold">Call Stack Depth:</span> {currentStep.callStackDepth}
                </div>
                {currentStep.error && (
                  <div className="text-destructive">
                    <span className="font-semibold">Error:</span> {currentStep.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Watches Panel */}
        {isDebugging && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Watches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={watchType}
                  onChange={(e) => setWatchType(e.target.value as 'variable' | 'memory')}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="variable">Variable</option>
                  <option value="memory">Memory</option>
                </select>
                <Input
                  type="number"
                  placeholder="Address"
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addWatch} size="sm">
                  Add Watch
                </Button>
              </div>
              <div className="space-y-2">
                {vm.evaluateWatches().map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="font-mono text-sm">{result.watch.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{String(result.value)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWatch(idx)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
                {watches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No watches. Add one above.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Stack */}
        {isDebugging && vm.callStack.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Call Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {vm.callStack.map((frame, idx) => (
                  <div key={idx} className="p-2 bg-muted rounded-md font-mono text-sm">
                    Frame {vm.callStack.length - idx - 1}: Return @ {frame.returnAddress}, Stack Pointer: {frame.stackPointer}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stack View */}
        {isDebugging && currentStep && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MemoryStick className="h-5 w-5" />
                Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm space-y-1">
                {currentStep.stack.length === 0 ? (
                  <p className="text-muted-foreground">Stack is empty</p>
                ) : (
                  currentStep.stack.map((value, idx) => (
                    <div key={idx} className="p-1 bg-muted rounded">
                      [{idx}]: {value}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Disassembly */}
        {compilationResult && compilationResult.errors.length === 0 && (
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
        )}
      </div>
    </div>
  )
}

