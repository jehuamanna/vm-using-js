import React, { useState, useCallback } from 'react'
import { parseModule, linkModules, ModuleInfo } from '../compiler/module'
import { TinyVM } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useTheme } from '../components/theme-provider'
import { 
  Loader2, Code2, Play, Package, Link2
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface ModuleTab {
  id: string
  name: string
  source: string
}

export function Episode15() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [vm] = useState(() => new TinyVM())
  const [modules, setModules] = useState<ModuleTab[]>([
    {
      id: '1',
      name: 'math',
      source: `// math module
export fn add(a, b) {
    return a + b;
}

export fn multiply(a, b) {
    return a * b;
}

export fn subtract(a, b) {
    return a - b;
}`
    },
    {
      id: '2',
      name: 'main',
      source: `// main module
import { add, multiply } from "math";

fn main() {
    let x = 5;
    let y = 10;
    let sum = add(x, y);
    let product = multiply(x, y);
    print sum;
    print product;
}

main();`
    }
  ])
  const [activeModuleId, setActiveModuleId] = useState<string>('2')
  const [compilationResult, setCompilationResult] = useState<{
    bytecode: number[]
    errors: string[]
    modules?: ModuleInfo[]
    linked?: { bytecode: number[]; symbolTable: Map<string, number>; errors: string[] }
  } | null>(null)
  const [output, setOutput] = useState<string>('Output will appear here...')
  const [loading, setLoading] = useState<boolean>(false)

  React.useEffect(() => {
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

  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0]

  const updateModuleSource = useCallback((id: string, source: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, source } : m))
  }, [])

  const addModule = () => {
    const newId = String(Date.now())
    setModules(prev => [...prev, {
      id: newId,
      name: `module${prev.length + 1}`,
      source: '// New module\n'
    }])
    setActiveModuleId(newId)
  }

  const removeModule = (id: string) => {
    if (modules.length <= 1) return
    setModules(prev => prev.filter(m => m.id !== id))
    if (activeModuleId === id) {
      setActiveModuleId(modules.find(m => m.id !== id)?.id || modules[0].id)
    }
  }

  const compileAndLink = () => {
    setLoading(true)
    setOutput('Compiling modules...\n')
    setCompilationResult(null)

    requestAnimationFrame(() => {
      try {
        // Parse all modules
        const moduleInfos: ModuleInfo[] = []
        const errors: string[] = []

        for (const moduleTab of modules) {
          const moduleInfo = parseModule(moduleTab.name, moduleTab.source)
          moduleInfos.push(moduleInfo)
          if (moduleInfo.errors.length > 0) {
            errors.push(...moduleInfo.errors.map(e => `[${moduleTab.name}] ${e}`))
          }
        }

        if (errors.length > 0) {
          setOutput(`Compilation errors:\n${errors.join('\n')}`)
          setCompilationResult({
            bytecode: [],
            errors,
            modules: moduleInfos,
          })
          setLoading(false)
          return
        }

        // Link modules
        const linked = linkModules(moduleInfos)

        if (linked.errors.length > 0) {
          setOutput(`Linking errors:\n${linked.errors.join('\n')}`)
          setCompilationResult({
            bytecode: linked.bytecode,
            errors: linked.errors,
            modules: moduleInfos,
            linked,
          })
          setLoading(false)
          return
        }

        setOutput('Compilation and linking successful! Click "Run" to execute.')
        setCompilationResult({
          bytecode: linked.bytecode,
          errors: [],
          modules: moduleInfos,
          linked,
        })
      } catch (error) {
        setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`)
        setCompilationResult({
          bytecode: [],
          errors: [error instanceof Error ? error.message : String(error)],
        })
      } finally {
        setLoading(false)
      }
    })
  }

  const runProgram = () => {
    if (!compilationResult || compilationResult.errors.length > 0 || !compilationResult.linked) {
      setOutput('Please compile and link the modules first (no errors).')
      return
    }

    try {
      vm.reset()
      console.log('Executing bytecode:', compilationResult.linked.bytecode)
      console.log('Bytecode length:', compilationResult.linked.bytecode.length)
      const results = vm.execute(compilationResult.linked.bytecode)
      console.log('Execution results:', results)
      if (results.length === 0) {
        setOutput(`No output produced. Bytecode length: ${compilationResult.linked.bytecode.length}\nBytecode: ${compilationResult.linked.bytecode.slice(0, 50).join(', ')}...`)
      } else {
        setOutput(`Output:\n${results.join('\n')}`)
      }
    } catch (error) {
      setOutput(`Runtime error:\n${error instanceof Error ? error.message : String(error)}\nStack: ${error instanceof Error ? error.stack : ''}`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 15: Modules & Linking
          </h1>
          <p className="text-muted-foreground text-lg">
            Split programs into modules with import/export and link them together
          </p>
        </div>

        {/* Module Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Modules
            </CardTitle>
            <CardDescription>
              Create and edit multiple modules. Use export to make symbols available and import to use them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4 flex-wrap">
              {modules.map(module => (
                <div
                  key={module.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                    activeModuleId === module.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted hover:bg-muted/80 border-border'
                  }`}
                  onClick={() => setActiveModuleId(module.id)}
                >
                  <span className="font-medium">{module.name}</span>
                  {modules.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeModule(module.id)
                      }}
                      className="ml-2 hover:bg-destructive/20 rounded px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <Button onClick={addModule} variant="outline" size="sm">
                + Add Module
              </Button>
            </div>

            {/* Module Editor */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">{activeModule.name}</span>
                <Input
                  type="text"
                  value={activeModule.name}
                  onChange={(e) => {
                    setModules(prev => prev.map(m => 
                      m.id === activeModuleId ? { ...m, name: e.target.value } : m
                    ))
                  }}
                  className="w-32 h-7 text-sm"
                  placeholder="Module name"
                />
              </div>
              <CodeMirror
                value={activeModule.source}
                height="400px"
                theme={isDark ? oneDark : undefined}
                extensions={[javascript()]}
                onChange={(value) => updateModuleSource(activeModuleId, value)}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compile & Link Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Compile & Link
            </CardTitle>
            <CardDescription>
              Compile all modules and link them together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={compileAndLink}
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
                    Compile & Link
                  </>
                )}
              </Button>
              <Button
                onClick={runProgram}
                disabled={loading || !compilationResult || compilationResult.errors.length > 0 || !compilationResult.linked}
                variant="default"
              >
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
            </div>

            {compilationResult && compilationResult.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <h4 className="font-semibold text-destructive mb-2">Errors:</h4>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {compilationResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {compilationResult && compilationResult.modules && (
              <div className="space-y-2">
                <h4 className="font-semibold">Module Information:</h4>
                {compilationResult.modules.map((module, idx) => (
                  <div key={idx} className="bg-muted p-3 rounded-md">
                    <div className="font-medium mb-2">{module.name}</div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Exports:</span>{' '}
                        {module.exports.size > 0 ? (
                          Array.from(module.exports.keys()).join(', ')
                        ) : (
                          <span className="text-muted-foreground">(none)</span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Imports:</span>{' '}
                        {module.imports.length > 0 ? (
                          module.imports.map(imp => 
                            `${imp.names.join(', ')} from "${imp.module}"`
                          ).join('; ')
                        ) : (
                          <span className="text-muted-foreground">(none)</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {compilationResult && compilationResult.linked && (
              <div className="bg-muted p-3 rounded-md">
                <div className="font-medium mb-2">Linked Program</div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Total bytecode size:</span>{' '}
                    {compilationResult.linked.bytecode.length} bytes
                  </div>
                  <div>
                    <span className="text-muted-foreground">Symbols:</span>{' '}
                    {compilationResult.linked.symbolTable.size} symbols
                  </div>
                </div>
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

      </div>
    </div>
  )
}

