import { useState, useEffect } from 'react'
import { assemble, OPCODE_REFERENCE } from '../core/assembler'
import { SwitchInterpreter, DispatchTableInterpreter, benchmarkInterpreter } from '../core/interpreter-styles'
import { OPCODES } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { useTheme } from '../components/theme-provider'
import { Loader2, Play, Zap, BarChart3, BookOpen } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Episode08() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [code, setCode] = useState<string>(`// Benchmark program: Calculate sum of 1 to 10
PUSH 0      // sum = 0
STORE 0
PUSH 1      // i = 1
STORE 1

loop:
LOAD 1      // Load i
PUSH 10     // Compare with 10
SUB
JMP_IF_NEG continue  // If i <= 10, continue
JMP end

continue:
LOAD 0      // sum += i
LOAD 1
ADD
STORE 0

LOAD 1      // i++
PUSH 1
ADD
STORE 1

JMP loop

end:
LOAD 0      // Print sum
PRINT
HALT`)
  const [output, setOutput] = useState<string>('Output will appear here...')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [benchmarkResults, setBenchmarkResults] = useState<{
    switch: { time: number; instructions: number }
    dispatch: { time: number; instructions: number }
  } | null>(null)
  const [showInterpreterInfo, setShowInterpreterInfo] = useState<boolean>(false)

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

  const runBenchmark = async () => {
    setLoading(true)
    setOutput('Assembling and benchmarking...\n')
    setErrors([])
    setBenchmarkResults(null)

    await new Promise(resolve => setTimeout(resolve, 100))

    // Assemble the code
    const { bytecode, errors: assemblyErrors } = assemble(code)

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

    setOutput('Running benchmarks...\n')

    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      // Benchmark switch-based interpreter
      const switchInterpreter = new SwitchInterpreter()
      const switchStart = performance.now()
      const switchOutput = switchInterpreter.execute(bytecode, false)
      const switchTime = performance.now() - switchStart

      // Benchmark dispatch table interpreter
      const dispatchInterpreter = new DispatchTableInterpreter()
      const dispatchStart = performance.now()
      const dispatchOutput = dispatchInterpreter.execute(bytecode, false)
      const dispatchTime = performance.now() - dispatchStart

      // Run multiple iterations for more accurate benchmark
      const iterations = 1000
      const switchBenchmark = benchmarkInterpreter(new SwitchInterpreter(), bytecode, iterations)
      const dispatchBenchmark = benchmarkInterpreter(new DispatchTableInterpreter(), bytecode, iterations)

      setBenchmarkResults({
        switch: {
          time: switchBenchmark.executionTime,
          instructions: switchBenchmark.instructionsExecuted
        },
        dispatch: {
          time: dispatchBenchmark.executionTime,
          instructions: dispatchBenchmark.instructionsExecuted
        }
      })

      setOutput(`Output: ${switchOutput.join(', ')}\n\nBenchmark completed!`)
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
  }

  const runCode = async () => {
    setLoading(true)
    setOutput('Running...\n')
    setErrors([])

    await new Promise(resolve => setTimeout(resolve, 100))

    const { bytecode, errors: assemblyErrors } = assemble(code)

    if (assemblyErrors.length > 0) {
      setErrors(assemblyErrors)
      setOutput(`Assembly errors:\n${assemblyErrors.join('\n')}`)
      setLoading(false)
      return
    }

    try {
      const interpreter = new SwitchInterpreter()
      const results = interpreter.execute(bytecode, false)
      setOutput(`Output: ${results.join('\n')}`)
    } catch (error) {
      setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
  }

  const speedup = benchmarkResults
    ? ((benchmarkResults.switch.time - benchmarkResults.dispatch.time) / benchmarkResults.switch.time * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 8: Optimizations & JIT Basics
          </h1>
          <p className="text-muted-foreground text-lg">
            Comparing interpreter styles and performance
          </p>
        </div>

        {/* Interpreter Info */}
        {showInterpreterInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Interpreter Styles</CardTitle>
              <CardDescription>Different approaches to bytecode interpretation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">1. Switch-Based Interpreter</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Uses a switch statement to dispatch opcodes. Simple and easy to understand, but has overhead from switch statement evaluation.
                </p>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-xs border border-border">
                  {`switch (opcode) {
  case PUSH: ...
  case ADD: ...
  ...
}`}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2. Dispatch Table Interpreter</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Uses a map/table of function pointers. Faster than switch because it's a direct lookup, but uses more memory.
                </p>
                <div className="bg-muted dark:bg-slate-900 p-3 rounded-md font-mono text-xs border border-border">
                  {`handlers[opcode]()  // Direct function call`}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">3. Direct Threading (Concept)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Uses computed gotos or labels. Fastest but requires language support. In JavaScript, we simulate this with dispatch tables.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Code Editor */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Benchmark Program</CardTitle>
              <CardDescription>Write a program to benchmark different interpreter styles</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInterpreterInfo(!showInterpreterInfo)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {showInterpreterInfo ? 'Hide' : 'Show'} Info
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Code</Label>
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
            </div>

            <div className="flex gap-2">
              <Button
                onClick={runCode}
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
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </>
                )}
              </Button>
              <Button
                onClick={runBenchmark}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Benchmarking...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Benchmark
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

        {/* Benchmark Results */}
        {benchmarkResults && (
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Switch-Based Interpreter</CardTitle>
                <CardDescription>Traditional switch statement approach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution Time:</span>
                    <span className="font-mono font-semibold">{benchmarkResults.switch.time.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Instructions:</span>
                    <span className="font-mono">{benchmarkResults.switch.instructions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Throughput:</span>
                    <span className="font-mono">
                      {(benchmarkResults.switch.instructions / benchmarkResults.switch.time * 1000).toFixed(0)} ops/sec
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dispatch Table Interpreter</CardTitle>
                <CardDescription>Function pointer table approach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution Time:</span>
                    <span className="font-mono font-semibold text-green-400">
                      {benchmarkResults.dispatch.time.toFixed(2)} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Instructions:</span>
                    <span className="font-mono">{benchmarkResults.dispatch.instructions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Throughput:</span>
                    <span className="font-mono text-green-400">
                      {(benchmarkResults.dispatch.instructions / benchmarkResults.dispatch.time * 1000).toFixed(0)} ops/sec
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Comparison */}
        {benchmarkResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Comparison
              </CardTitle>
              <CardDescription>Speedup analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Speedup:</span>
                    <span className={`font-semibold ${parseFloat(speedup) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {speedup}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${parseFloat(speedup) > 0 ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(Math.abs(parseFloat(speedup)), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {parseFloat(speedup) > 0
                    ? `Dispatch table is ${speedup}% faster than switch-based interpreter.`
                    : parseFloat(speedup) < 0
                    ? `Switch-based is ${Math.abs(parseFloat(speedup))}% faster (unusual, may vary by browser/CPU).`
                    : 'Both interpreters perform similarly.'}
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  <p className="mb-1"><strong>Note:</strong> Performance varies by:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>JavaScript engine optimizations</li>
                    <li>CPU architecture</li>
                    <li>Browser implementation</li>
                    <li>Program characteristics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* JIT Basics Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>JIT Compilation Basics</CardTitle>
            <CardDescription>Just-In-Time compilation concepts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">What is JIT?</h3>
              <p className="text-sm text-muted-foreground">
                Just-In-Time (JIT) compilation converts bytecode to native machine code at runtime. This combines the portability of bytecode with the speed of native code.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">How JIT Works:</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Interpret bytecode initially (fast startup)</li>
                <li>Identify "hot" code paths (frequently executed)</li>
                <li>Compile hot code to native machine code</li>
                <li>Execute native code (much faster)</li>
                <li>Fall back to interpreter for cold code</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Benefits:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Portability:</strong> Bytecode runs on any platform</li>
                <li><strong>Performance:</strong> Native code execution for hot paths</li>
                <li><strong>Adaptive:</strong> Optimizes based on actual usage</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Used By:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Java Virtual Machine (JVM)</li>
                <li>.NET Common Language Runtime (CLR)</li>
                <li>JavaScript engines (V8, SpiderMonkey)</li>
                <li>Python (PyPy)</li>
                <li>WebAssembly runtimes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

