import React, { useState, useCallback, useMemo } from 'react'
import { compile } from '../compiler'
import { TinyVM } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Zap, TrendingDown, List, ArrowRight, CheckCircle2
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { disassemble } from '../core/disassembler'

const defaultCode = `// Episode 18: Optimizations II
// Test cases for peephole optimization and dead-code elimination

// Constant folding examples
let x = 5 + 3;        // Should be optimized to PUSH 8
let y = 10 * 2;       // Should be optimized to PUSH 20
let z = 15 - 7;       // Should be optimized to PUSH 8

// Identity operations
let a = x + 0;        // Should remove + 0
let b = y * 1;        // Should remove * 1
let c = z * 0;        // Should optimize to PUSH 0

print x;
print y;
print z;
print a;
print b;
print c;

// Dead code example (unreachable after return)
fn test() {
    return 42;
    print 100;  // Dead code - should be eliminated
}

let result = test();
print result;
`

export function Episode18() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [source, setSource] = useState(defaultCode)
  const [compiling, setCompiling] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bytecodeUnoptimized, setBytecodeUnoptimized] = useState<number[]>([])
  const [bytecodeOptimized, setBytecodeOptimized] = useState<number[]>([])
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [enableOptimizations, setEnableOptimizations] = useState(true)

  const disassemblyUnoptimized = useMemo(() => {
    if (bytecodeUnoptimized.length === 0) return null
    return disassemble(bytecodeUnoptimized)
  }, [bytecodeUnoptimized])

  const disassemblyOptimized = useMemo(() => {
    if (bytecodeOptimized.length === 0) return null
    return disassemble(bytecodeOptimized)
  }, [bytecodeOptimized])

  React.useEffect(() => {
    setIsDark(theme === 'dark')
  }, [theme])

  const handleCompile = useCallback(() => {
    setCompiling(true)
    setError(null)
    setOutput([])
    setBytecodeUnoptimized([])
    setBytecodeOptimized([])
    setOptimizationResult(null)

    try {
      // Compile without optimizations
      const resultUnoptimized = compile(source, false)
      if (resultUnoptimized.errors.length > 0) {
        setError(resultUnoptimized.errors.join('\n'))
        setCompiling(false)
        return
      }

      // Compile with optimizations
      const resultOptimized = compile(source, true)
      if (resultOptimized.errors.length > 0) {
        setError(resultOptimized.errors.join('\n'))
        setCompiling(false)
        return
      }

      setBytecodeUnoptimized(resultUnoptimized.bytecode)
      setBytecodeOptimized(resultOptimized.bytecode)
      setOptimizationResult(resultOptimized.optimized)
      setCompiling(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCompiling(false)
    }
  }, [source])

  const handleRun = useCallback(() => {
    const bytecode = enableOptimizations ? bytecodeOptimized : bytecodeUnoptimized
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
  }, [bytecodeOptimized, bytecodeUnoptimized, enableOptimizations, vm])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8" />
            Episode 18: Optimizations II
          </h1>
          <p className="text-muted-foreground mt-2">
            Peephole optimizer, dead-code elimination, and function inlining
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
              Write code to see optimization effects
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
                disabled={running || (bytecodeOptimized.length === 0 && bytecodeUnoptimized.length === 0)}
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableOptimizations"
                checked={enableOptimizations}
                onChange={(e) => setEnableOptimizations(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="enableOptimizations" className="text-sm">
                Use optimized bytecode when running
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Output and Stats */}
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

          {/* Optimization Stats */}
          {optimizationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Optimization Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Original Size</div>
                    <div className="text-2xl font-bold">{optimizationResult.stats.originalSize} bytes</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Optimized Size</div>
                    <div className="text-2xl font-bold text-green-600">
                      {optimizationResult.stats.optimizedSize} bytes
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Reduction</div>
                    <div className="text-2xl font-bold text-blue-600">
                      -{optimizationResult.stats.reduction} bytes
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Reduction %</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {optimizationResult.stats.reductionPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Optimizations Applied</div>
                  <div className="text-lg font-semibold">
                    {optimizationResult.optimizations.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Before/After Comparison */}
      {(bytecodeUnoptimized.length > 0 || bytecodeOptimized.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unoptimized Bytecode */}
          <Card>
            <CardHeader>
              <CardTitle>Before Optimization</CardTitle>
              <CardDescription>
                {bytecodeUnoptimized.length > 0 ? `${bytecodeUnoptimized.length} bytes` : 'No bytecode'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {disassemblyUnoptimized ? (
                <div className="border rounded-lg overflow-hidden bg-muted/50">
                  <div className="max-h-[300px] overflow-auto">
                    <div className="font-mono text-xs p-4">
                      {disassemblyUnoptimized.lines
                        .filter(line => !line.skip)
                        .map((line, idx) => (
                          <div
                            key={idx}
                            className="flex gap-4 py-1 px-2 rounded hover:bg-background/50 transition-colors"
                          >
                            <div className="w-16 shrink-0 text-muted-foreground text-[11px]">
                              {line.address.toString(16).toUpperCase().padStart(4, '0')}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span>{line.mnemonic}</span>
                                {line.comment && (
                                  <span className="text-muted-foreground text-[10px]">
                                    // {line.comment}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-8">
                  No disassembly available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimized Bytecode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                After Optimization
              </CardTitle>
              <CardDescription>
                {bytecodeOptimized.length > 0 ? `${bytecodeOptimized.length} bytes` : 'No bytecode'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {disassemblyOptimized ? (
                <div className="border rounded-lg overflow-hidden bg-muted/50">
                  <div className="max-h-[300px] overflow-auto">
                    <div className="font-mono text-xs p-4">
                      {disassemblyOptimized.lines
                        .filter(line => !line.skip)
                        .map((line, idx) => (
                          <div
                            key={idx}
                            className="flex gap-4 py-1 px-2 rounded hover:bg-background/50 transition-colors"
                          >
                            <div className="w-16 shrink-0 text-muted-foreground text-[11px]">
                              {line.address.toString(16).toUpperCase().padStart(4, '0')}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span>{line.mnemonic}</span>
                                {line.comment && (
                                  <span className="text-muted-foreground text-[10px]">
                                    // {line.comment}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-8">
                  No disassembly available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimization Details */}
      {optimizationResult && optimizationResult.optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              Applied Optimizations
            </CardTitle>
            <CardDescription>
              Detailed list of all optimizations applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizationResult.optimizations.map((opt: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {opt.type === 'peephole' && '🔧 Peephole Optimization'}
                      {opt.type === 'dead-code' && '🗑️ Dead Code Elimination'}
                      {opt.type === 'inlining' && '📦 Function Inlining'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {opt.description}
                    </div>
                    {opt.before.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                        <span className="text-muted-foreground">Before:</span>
                        <span className="bg-red-500/20 px-2 py-1 rounded">
                          {opt.before.map((b: number) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                        </span>
                        {opt.after.length > 0 && (
                          <>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">After:</span>
                            <span className="bg-green-500/20 px-2 py-1 rounded">
                              {opt.after.map((a: number) => a.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Techniques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Peephole Optimizer</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Constant folding: <code className="bg-muted px-1 rounded">PUSH 5, PUSH 3, ADD</code> → <code className="bg-muted px-1 rounded">PUSH 8</code></li>
              <li>Identity operations: <code className="bg-muted px-1 rounded">x + 0</code> → <code className="bg-muted px-1 rounded">x</code></li>
              <li>Zero multiplication: <code className="bg-muted px-1 rounded">x * 0</code> → <code className="bg-muted px-1 rounded">0</code></li>
              <li>One multiplication: <code className="bg-muted px-1 rounded">x * 1</code> → <code className="bg-muted px-1 rounded">x</code></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Dead Code Elimination</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Removes unreachable code after return statements</li>
              <li>Removes code after unconditional jumps</li>
              <li>Updates jump targets after code removal</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Function Inlining</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Replaces function calls with function body (placeholder for future implementation)</li>
              <li>Reduces function call overhead</li>
              <li>Enables further optimizations across function boundaries</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

