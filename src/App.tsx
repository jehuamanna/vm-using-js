import { useState } from 'react'
import { TinyVM, OPCODES } from './core/vm'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  const [vm] = useState(() => new TinyVM())
  const [output1, setOutput1] = useState<string>('Output will appear here...')
  const [output2, setOutput2] = useState<string>('Output will appear here...')
  const [stack, setStack] = useState<number[]>([])

  const updateStack = () => {
    setStack([...vm.stack])
  }

  const runDemo1 = () => {
    vm.reset()
    setOutput1('Running...\n')
    updateStack()

    // Bytecode: PUSH 5, PUSH 3, ADD, PRINT, HALT
    const bytecode = [
      OPCODES.PUSH, 5,
      OPCODES.PUSH, 3,
      OPCODES.ADD,
      OPCODES.PRINT,
      OPCODES.HALT
    ]

    try {
      const results = vm.execute(bytecode)
      setOutput1('Output:\n' + results.join('\n'))
    } catch (error) {
      setOutput1('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    updateStack()
  }

  const runDemo2 = () => {
    vm.reset()
    setOutput2('Running...\n')
    updateStack()

    // Bytecode: PUSH 10, PUSH 3, SUB, PUSH 2, MUL, PRINT, HALT
    const bytecode = [
      OPCODES.PUSH, 10,
      OPCODES.PUSH, 3,
      OPCODES.SUB,
      OPCODES.PUSH, 2,
      OPCODES.MUL,
      OPCODES.PRINT,
      OPCODES.HALT
    ]

    try {
      const results = vm.execute(bytecode)
      setOutput2('Output:\n' + results.join('\n'))
    } catch (error) {
      setOutput2('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    updateStack()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              🎬 Episode 1: Introduction & Tiny VM
            </h1>
            <p className="text-muted-foreground text-lg">
              A minimal stack-based virtual machine in JavaScript
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Demo 1: Simple Addition</CardTitle>
              <CardDescription>Calculate 5 + 3</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 dark:bg-slate-950 text-green-400 dark:text-green-300 p-4 rounded-md font-mono text-sm mb-4 border-l-4 border-primary">
                PUSH 5<br />
                PUSH 3<br />
                ADD<br />
                PRINT<br />
                HALT
              </div>
              <Button onClick={runDemo1} className="w-full mb-4">
                Run Demo 1
              </Button>
              <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap">
                {output1}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demo 2: Arithmetic Operations</CardTitle>
              <CardDescription>Calculate (10 - 3) * 2</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 dark:bg-slate-950 text-green-400 dark:text-green-300 p-4 rounded-md font-mono text-sm mb-4 border-l-4 border-primary">
                PUSH 10<br />
                PUSH 3<br />
                SUB<br />
                PUSH 2<br />
                MUL<br />
                PRINT<br />
                HALT
              </div>
              <Button onClick={runDemo2} className="w-full mb-4">
                Run Demo 2
              </Button>
              <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap">
                {output2}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Stack Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            {stack.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 italic">
                Stack is empty
              </div>
            ) : (
              <div className="space-y-2">
                {stack.slice().reverse().map((val, idx) => (
                  <div
                    key={idx}
                    className="bg-primary text-primary-foreground p-3 rounded-md text-center font-mono"
                  >
                    [{stack.length - idx - 1}]: {val}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

