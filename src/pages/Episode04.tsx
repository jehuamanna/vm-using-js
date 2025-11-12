import { useState } from 'react'
import { TinyVM, OPCODES } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function Episode04() {
  const [vm] = useState(() => new TinyVM())
  const [input1, setInput1] = useState<string>('5')
  const [input2, setInput2] = useState<string>('3')
  const [output1, setOutput1] = useState<string>('Output will appear here...')
  const [calcInput, setCalcInput] = useState<string>('10')
  const [calcOutput, setCalcOutput] = useState<string>('Output will appear here...')
  const [stack, setStack] = useState<number[]>([])

  const updateStack = () => {
    setStack([...vm.stack])
  }

  const runDemo1 = () => {
    vm.reset()
    setOutput1('Running...\n')
    updateStack()

    const num1 = parseInt(input1) || 0
    const num2 = parseInt(input2) || 0

    // Add inputs to the queue
    vm.addInput(num1)
    vm.addInput(num2)

    // Bytecode: READ, READ, ADD, PRINT, HALT
    const bytecode = [
      OPCODES.READ,
      OPCODES.READ,
      OPCODES.ADD,
      OPCODES.PRINT,
      OPCODES.HALT
    ]

    try {
      const results = vm.execute(bytecode)
      setOutput1(`Input 1: ${num1}\nInput 2: ${num2}\nOutput: ${results.join('\n')}`)
    } catch (error) {
      setOutput1('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    updateStack()
  }

  const runCalculator = () => {
    vm.reset()
    setCalcOutput('Running...\n')
    updateStack()

    const num = parseInt(calcInput) || 0

    // Add input to the queue
    vm.addInput(num)

    // Calculator: (input * 2) + 5
    // Bytecode: READ, PUSH 2, MUL, PUSH 5, ADD, PRINT, HALT
    const bytecode = [
      OPCODES.READ,
      OPCODES.PUSH, 2,
      OPCODES.MUL,
      OPCODES.PUSH, 5,
      OPCODES.ADD,
      OPCODES.PRINT,
      OPCODES.HALT
    ]

    try {
      const results = vm.execute(bytecode)
      setCalcOutput(`Input: ${num}\nCalculation: (${num} * 2) + 5\nOutput: ${results.join('\n')}`)
    } catch (error) {
      setCalcOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    updateStack()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 4: Input and Output
          </h1>
          <p className="text-muted-foreground text-lg">
            Interactive input with READ instruction
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Demo 1: Reading Two Inputs</CardTitle>
              <CardDescription>Read two numbers and add them</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Bytecode</label>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-green-300 p-4 rounded-md font-mono text-sm border border-border leading-relaxed h-[180px] overflow-y-auto">
                  READ<br />
                  READ<br />
                  ADD<br />
                  PRINT<br />
                  HALT
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="input1">Input 1</Label>
                  <Input
                    id="input1"
                    type="number"
                    value={input1}
                    onChange={(e) => setInput1(e.target.value)}
                    placeholder="Enter number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="input2">Input 2</Label>
                  <Input
                    id="input2"
                    type="number"
                    value={input2}
                    onChange={(e) => setInput2(e.target.value)}
                    placeholder="Enter number"
                  />
                </div>
              </div>
              
              <div className="flex justify-center h-[44px] items-center">
                <Button onClick={runDemo1} className="min-w-[140px]">
                  Run Demo 1
                </Button>
              </div>
              
              <div className="space-y-2 flex flex-col min-h-0">
                <label className="text-sm font-semibold text-foreground">Output</label>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border flex-1">
                  {output1}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Demo 2: Calculator</CardTitle>
              <CardDescription>Calculate (input * 2) + 5</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Bytecode</label>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-green-300 p-4 rounded-md font-mono text-sm border border-border leading-relaxed h-[180px] overflow-y-auto">
                  READ<br />
                  PUSH 2<br />
                  MUL<br />
                  PUSH 5<br />
                  ADD<br />
                  PRINT<br />
                  HALT
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calcInput">Input Value</Label>
                <Input
                  id="calcInput"
                  type="number"
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  placeholder="Enter number"
                />
              </div>
              
              <div className="flex justify-center h-[44px] items-center">
                <Button onClick={runCalculator} className="min-w-[140px]">
                  Calculate
                </Button>
              </div>
              
              <div className="space-y-2 flex flex-col min-h-0">
                <label className="text-sm font-semibold text-foreground">Output</label>
                <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border flex-1">
                  {calcOutput}
                </div>
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
                    className="bg-muted dark:bg-secondary text-foreground p-3 rounded-md text-center font-mono border border-border"
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

