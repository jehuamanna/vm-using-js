import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { compile } from '../compiler'
import { TinyVM, ExecutionStep, Watch } from '../core/vm'
import { disassemble } from '../core/disassembler'
import { OPCODE_REFERENCE } from '../core/assembler'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Pause, StepForward, SkipForward, 
  RotateCcw, FileCode, Bug, Eye, List, MemoryStick, Circle
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
    variableMap?: Map<string, number>
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

  const toggleBreakpoint = useCallback((address: number) => {
    setBreakpoints(prevBreakpoints => {
      const newBreakpoints = new Set(prevBreakpoints)
      if (newBreakpoints.has(address)) {
        newBreakpoints.delete(address)
        vm.removeBreakpoint(address)
      } else {
        newBreakpoints.add(address)
        vm.setBreakpoint(address, true)
      }
      return newBreakpoints
    })
  }, [vm])

  const addWatch = () => {
    if (!watchInput.trim()) return
    
    const input = watchInput.trim()
    let address: number | undefined
    let watchName: string

    // Try to parse as number first (memory address)
    const numAddress = parseInt(input)
    if (!isNaN(numAddress)) {
      // It's a numeric address
      address = numAddress
      watchName = `${watchType}@${address}`
    } else {
      // It's a variable name - try to resolve it
      if (watchType === 'variable') {
        if (!compilationResult || !compilationResult.variableMap) {
          alert('Please compile the code first to watch variables by name')
          return
        }
        const varAddress = compilationResult.variableMap.get(input)
        if (varAddress !== undefined) {
          address = varAddress
          watchName = input // Use the variable name
        } else {
          const availableVars = Array.from(compilationResult.variableMap.keys())
          alert(`Variable "${input}" not found.${availableVars.length > 0 ? ` Available variables: ${availableVars.join(', ')}` : ' No variables found in the compiled code.'}`)
          return
        }
      } else {
        // Memory watch with non-numeric input
        alert('Please enter a valid numeric address for memory watches')
        return
      }
    }

    const watch: Watch = {
      name: watchName,
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

  // Helper function to compare Sets by value
  const areSetsEqual = (set1: Set<number>, set2: Set<number>): boolean => {
    if (set1.size !== set2.size) return false
    for (const item of set1) {
      if (!set2.has(item)) return false
    }
    return true
  }

  // Disassembly component - memoized to prevent unnecessary re-renders
  const DisassemblyView = React.memo(({ bytecode, currentPc, breakpoints, onToggleBreakpoint }: {
    bytecode: number[]
    currentPc: number
    breakpoints: Set<number>
    onToggleBreakpoint: (address: number) => void
  }) => {
    const disassembly = useMemo(() => disassemble(bytecode), [bytecode])
    const containerRef = React.useRef<HTMLDivElement>(null)
    const currentLineRef = React.useRef<HTMLDivElement>(null)
    const savedScrollPositionRef = React.useRef<number | null>(null)
    const shouldPreserveScrollRef = React.useRef<boolean>(false)
    
    // Wrapper for onToggleBreakpoint that saves scroll position before state update
    const handleToggleBreakpoint = React.useCallback((address: number) => {
      // Save scroll position before toggling breakpoint
      if (containerRef.current) {
        savedScrollPositionRef.current = containerRef.current.scrollTop
        shouldPreserveScrollRef.current = true
      }
      onToggleBreakpoint(address)
    }, [onToggleBreakpoint])
    
    // Restore scroll position after re-render (for breakpoint toggles)
    React.useLayoutEffect(() => {
      const container = containerRef.current
      if (!container) return
      
      // For breakpoint toggles, restore saved position
      if (shouldPreserveScrollRef.current && savedScrollPositionRef.current !== null) {
        container.scrollTop = savedScrollPositionRef.current
        savedScrollPositionRef.current = null
        shouldPreserveScrollRef.current = false
      }
    })
    
    // Scroll to current instruction relative to current viewport
    React.useEffect(() => {
      if (currentPc >= 0 && currentLineRef.current && containerRef.current) {
        const container = containerRef.current
        const targetLine = currentLineRef.current
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (!container || !targetLine) return
          
          // Get container and line positions relative to viewport
          const containerRect = container.getBoundingClientRect()
          const lineRect = targetLine.getBoundingClientRect()
          
          // Calculate if line is visible in viewport (with padding)
          const padding = 60 // pixels of padding from edges
          const isVisible = 
            lineRect.top >= containerRect.top + padding &&
            lineRect.bottom <= containerRect.bottom - padding
          
          // Only scroll if line is not visible
          if (!isVisible) {
            // Calculate the line's position relative to the container's scrollable content
            const lineTopInViewport = lineRect.top
            const containerTopInViewport = containerRect.top
            
            // Calculate where the line currently is relative to container's top edge
            const lineRelativeToContainer = lineTopInViewport - containerTopInViewport
            
            // Calculate where we want the line to be (centered)
            const containerHeight = container.clientHeight
            const lineHeight = lineRect.height
            const desiredRelativePosition = (containerHeight / 2) - (lineHeight / 2)
            
            // Calculate the scroll delta needed (relative movement from current position)
            const scrollDelta = lineRelativeToContainer - desiredRelativePosition
            
            // Only scroll if there's a meaningful change
            if (Math.abs(scrollDelta) > 1) {
              const currentScrollTop = container.scrollTop
              const maxScroll = Math.max(0, container.scrollHeight - containerHeight)
              
              // Clamp the delta to stay within bounds
              const clampedDelta = Math.max(
                -currentScrollTop, // Can't scroll above top
                Math.min(
                  scrollDelta,
                  maxScroll - currentScrollTop // Can't scroll below bottom
                )
              )
              
              // Use relative scrolling (scrollBy) - moves relative to current position
              container.scrollBy({
                top: clampedDelta,
                behavior: 'instant'
              })
            }
          }
        })
      }
    }, [currentPc])
    
    return (
      <div ref={containerRef} className="font-mono text-xs overflow-auto bg-background" style={{ maxHeight: '500px' }}>
        <div className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b-2 border-border px-4 py-2 flex items-center gap-4 text-xs font-semibold z-10">
          <div className="w-12 text-center">BP</div>
          <div className="w-24">Address</div>
          <div className="w-40">Bytes</div>
          <div className="flex-1">Instruction</div>
        </div>
        {disassembly.lines.map((line, idx) => {
          const isCurrent = line.address === currentPc
          const hasBreakpoint = breakpoints.has(line.address)
          const bytesStr = line.rawBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
          const opcodeInfo = OPCODE_REFERENCE.find(op => op.value === line.opcode)
          const mnemonicParts = line.mnemonic.split(' ')
          const opcodeName = mnemonicParts[0]
          const operands = mnemonicParts.slice(1).join(' ')
          
          return (
            <div
              key={idx}
              ref={isCurrent ? currentLineRef : null}
              className={`px-4 py-1.5 flex items-center gap-4 border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors ${
                isCurrent 
                  ? 'bg-primary/15 border-l-4 border-l-primary shadow-sm' 
                  : hasBreakpoint 
                    ? 'bg-destructive/5' 
                    : ''
              }`}
              onClick={() => handleToggleBreakpoint(line.address)}
            >
              <div className="w-12 flex justify-center">
                {hasBreakpoint && (
                  <Circle className="h-3 w-3 fill-destructive text-destructive" />
                )}
              </div>
              <div className={`w-24 font-mono text-sm ${isCurrent ? 'font-bold text-primary' : 'text-foreground'}`}>
                0x{line.address.toString(16).padStart(4, '0').toUpperCase()}
              </div>
              <div className="w-40 font-mono text-muted-foreground text-[10px] tracking-wider">
                {bytesStr.padEnd(20)}
              </div>
              <div className={`flex-1 text-sm ${isCurrent ? 'font-bold text-primary' : 'text-foreground'}`}>
                <span className="font-semibold">{opcodeName}</span>
                {operands && (
                  <span className="text-muted-foreground ml-1">{operands}</span>
                )}
                {opcodeInfo && (
                  <span className="ml-3 text-muted-foreground text-[10px] italic">
                    // {opcodeInfo.description}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }, (prevProps, nextProps) => {
    // Custom comparison: return true if props are equal (skip re-render), false if different (re-render)
    // Compare bytecode
    if (prevProps.bytecode.length !== nextProps.bytecode.length) return false
    if (prevProps.bytecode.some((val, idx) => val !== nextProps.bytecode[idx])) return false
    // Compare currentPc
    if (prevProps.currentPc !== nextProps.currentPc) return false
    // Compare breakpoints by value (not reference)
    if (!areSetsEqual(prevProps.breakpoints, nextProps.breakpoints)) return false
    // onToggleBreakpoint is stable (useCallback), so we can skip comparing it
    // All props are equal, skip re-render
    return true
  })

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

        {/* Compile Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Compile & Debug
            </CardTitle>
            <CardDescription>
              Compile your program and start debugging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Source Code and Disassembly Side by Side */}
        <div className={`grid gap-6 mb-6 ${compilationResult && compilationResult.errors.length === 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Source Code Editor - Always Visible */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Source Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={sourceCode}
                  height="500px"
                  theme={isDark ? oneDark : undefined}
                  extensions={[javascript()]}
                  onChange={(value) => setSourceCode(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Disassembly with Current Instruction Highlighting - Only when compilation succeeds */}
          {compilationResult && compilationResult.errors.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Disassembly
                  {isDebugging && currentStep && (
                    <span className="ml-auto text-sm font-mono text-muted-foreground">
                      PC: 0x{currentStep.pc.toString(16).padStart(4, '0').toUpperCase()}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-md overflow-hidden">
                  <DisassemblyView
                    bytecode={compilationResult.bytecode}
                    currentPc={isDebugging && currentStep ? currentStep.pc : -1}
                    breakpoints={breakpoints}
                    onToggleBreakpoint={toggleBreakpoint}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Current Instruction Info */}
        {isDebugging && currentStep && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Current Instruction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Program Counter</div>
                  <div className="font-mono font-semibold">
                    0x{currentStep.pc.toString(16).padStart(4, '0').toUpperCase()} ({currentStep.pc})
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Opcode</div>
                  <div className="font-mono font-semibold">
                    {currentStep.opcodeName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    0x{currentStep.opcode.toString(16).padStart(2, '0').toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Call Stack Depth</div>
                  <div className="font-semibold">{currentStep.callStackDepth}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Stack Size</div>
                  <div className="font-semibold">{currentStep.stack.length}</div>
                </div>
              </div>
              {currentStep.error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="text-sm font-semibold text-destructive mb-1">Error:</div>
                  <div className="text-sm text-destructive">{currentStep.error}</div>
                </div>
              )}
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
                  type="text"
                  placeholder={watchType === 'variable' ? 'Variable name or address' : 'Memory address'}
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addWatch()
                    }
                  }}
                />
                <Button onClick={addWatch} size="sm" disabled={!compilationResult || compilationResult.errors.length > 0}>
                  Add Watch
                </Button>
              </div>
              {watchType === 'variable' && compilationResult && compilationResult.variableMap && compilationResult.variableMap.size > 0 && (
                <div className="text-xs text-muted-foreground">
                  Available variables: {Array.from(compilationResult.variableMap.keys()).join(', ')}
                </div>
              )}
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
                    Frame {vm.callStack.length - idx - 1}: Return @ 0x{frame.returnAddress.toString(16).padStart(4, '0').toUpperCase()}, Stack Pointer: {frame.stackPointer}
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

      </div>
    </div>
  )
}

