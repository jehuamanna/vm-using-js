import { useState } from 'react'
import { TinyVM, OPCODES } from '../core/vm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { HelpCircle, Loader2 } from 'lucide-react'

export function Episode05() {
  const [vm] = useState(() => new TinyVM())
  const [fibInput, setFibInput] = useState<string>('6')
  const [fibOutput, setFibOutput] = useState<string>('Output will appear here...')
  const [stack, setStack] = useState<number[]>([])
  const [callStack, setCallStack] = useState<Array<{ returnAddress: number; stackPointer: number }>>([])
  const [loading, setLoading] = useState<boolean>(false)

  const updateVisuals = () => {
    setStack([...vm.stack])
    setCallStack([...vm.callStack])
  }

  const runFibonacci = async () => {
    vm.reset()
    setLoading(true)
    setFibOutput('Running...\n')
    updateVisuals()

    const n = parseInt(fibInput.trim())

    // Validate input
    if (isNaN(n) || n < 0) {
      setFibOutput('Error: Please enter a valid non-negative integer.')
      setLoading(false)
      updateVisuals()
      return
    }

    if (n > 10) {
      setFibOutput('Error: Please enter a number between 0 and 10 (to avoid long execution).')
      setLoading(false)
      updateVisuals()
      return
    }

    // Fibonacci function using recursion
    // Calling convention: parameter passed on stack, result returned on stack
    // Function at address 15: fib(n)
    //   Pop n from stack
    //   if n <= 1: push n and return
    //   else: 
    //     Save n in memory[0]
    //     Push n-1, call fib, save result in memory[1]
    //     Push n-2, call fib
    //     Add memory[1] to result, return
    
    const bytecode = [
      // Main program
      OPCODES.PUSH, n,        // 0: Push argument n
      OPCODES.CALL, 15,       // 2: Call fib function at address 15
      OPCODES.PRINT,          // 4: Print result
      OPCODES.HALT,           // 5: Halt
      
      // Padding to reach address 15
      OPCODES.HALT,           // 6
      OPCODES.HALT,           // 7
      OPCODES.HALT,           // 8
      OPCODES.HALT,           // 9
      OPCODES.HALT,           // 10
      OPCODES.HALT,           // 11
      OPCODES.HALT,           // 12
      OPCODES.HALT,           // 13
      OPCODES.HALT,           // 14
      
      // fib function starts at address 15
      // Pop parameter n from stack and check base case
      OPCODES.STORE, 0,       // 15: Pop n and store in memory[0]
      OPCODES.LOAD, 0,        // 17: Load n
      OPCODES.PUSH, 1,        // 19: Push 1
      OPCODES.SUB,            // 20: n - 1
      OPCODES.JMP_IF_NEG, 32, // 21: if n < 1, jump to base case
      OPCODES.JMP_IF_ZERO, 32, // 23: if n == 1, jump to base case
      
      // Recursive case: fib(n-1) + fib(n-2)
      // Compute fib(n-1)
      OPCODES.LOAD, 0,        // 25: Load n
      OPCODES.PUSH, 1,        // 27: Push 1
      OPCODES.SUB,            // 28: n - 1
      OPCODES.CALL, 15,       // 29: Call fib(n-1), result on stack
      OPCODES.STORE, 1,       // 31: Save fib(n-1) in memory[1]
      
      // Compute fib(n-2)
      OPCODES.LOAD, 0,        // 33: Load n
      OPCODES.PUSH, 2,        // 35: Push 2
      OPCODES.SUB,            // 36: n - 2
      OPCODES.CALL, 15,       // 37: Call fib(n-2), result on stack
      
      // Add fib(n-1) + fib(n-2)
      OPCODES.LOAD, 1,        // 39: Load fib(n-1)
      OPCODES.ADD,            // 41: fib(n-1) + fib(n-2)
      OPCODES.RET,            // 42: Return result
      
      // Base case: return n
      OPCODES.LOAD, 0,        // 32: Load n
      OPCODES.RET             // 34: Return n
    ]

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setFibOutput(`Input: fib(${n})\nOutput: ${results.join('\n')}\n\nNote: This uses recursion with CALL/RET instructions.`)
    } catch (error) {
      setFibOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    setLoading(false)
    updateVisuals()
  }

  const runSimpleFunction = async () => {
    vm.reset()
    setLoading(true)
    setFibOutput('Running simple function demo...\n')
    updateVisuals()

    // Simple function: double(n) = n * 2
    // Calling convention: parameter on stack, result on stack
    // Main: PUSH 5, CALL double, PRINT, HALT
    // double function: pop n, multiply by 2, push result, return
    const bytecode = [
      // Main program
      OPCODES.PUSH, 5,        // 0: Push argument 5
      OPCODES.CALL, 5,        // 2: Call double at address 5
      OPCODES.PRINT,          // 4: Print result
      OPCODES.HALT,           // 5: Halt
      
      // double function (address 5)
      // Parameter is already on stack, just multiply by 2
      OPCODES.PUSH, 2,        // 5: Push 2
      OPCODES.MUL,            // 7: Multiply top two values (n * 2)
      OPCODES.RET             // 8: Return result
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setFibOutput(`Simple Function Demo:\nCall double(5)\nOutput: ${results.join('\n')}\n\nThis demonstrates CALL and RET with a simple function.`)
    } catch (error) {
      setFibOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
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
              Episode 5: Functions & Call Stack
            </h1>
            <p className="text-muted-foreground text-lg">
              Function calls with CALL and RET instructions
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Demo 1: Simple Function</CardTitle>
                <CardDescription>Call a function to double a number</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 grid grid-rows-[auto_auto_1fr] gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Bytecode</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-green-300 p-4 rounded-md font-mono text-sm border border-border leading-relaxed h-[180px] overflow-y-auto">
                    <span className="text-blue-400">// Main</span><br />
                    PUSH 5<br />
                    CALL double  <span className="text-blue-400">// Call function</span><br />
                    PRINT<br />
                    HALT<br />
                    <br />
                    <span className="text-blue-400">// double function</span><br />
                    PUSH 2<br />
                    MUL         <span className="text-blue-400">// n * 2</span><br />
                    RET         <span className="text-blue-400">// Return</span>
                  </div>
                </div>
                
                <div className="flex justify-center h-[44px] items-center">
                  <Button 
                    onClick={runSimpleFunction} 
                    className="min-w-[140px]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      'Run Demo'
                    )}
                  </Button>
                </div>
                
                <div className="space-y-2 flex flex-col min-h-0">
                  <label className="text-sm font-semibold text-foreground">Output</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border flex-1">
                    {fibOutput}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Demo 2: Recursive Fibonacci</CardTitle>
                <CardDescription>Calculate Fibonacci using recursion</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Bytecode</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-green-300 p-4 rounded-md font-mono text-sm border border-border leading-relaxed h-[180px] overflow-y-auto">
                    <span className="text-blue-400">// Main</span><br />
                    PUSH n<br />
                    CALL fib<br />
                    PRINT<br />
                    HALT<br />
                    <br />
                    <span className="text-blue-400">// fib(n)</span><br />
                    <span className="text-blue-400">// if n &lt;= 1: return n</span><br />
                    <span className="text-blue-400">// else: return fib(n-1) + fib(n-2)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="fibInput">Fibonacci Input (0-10)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter a number between 0 and 10. Higher values may take longer due to recursion.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="fibInput"
                    type="number"
                    min="0"
                    max="10"
                    value={fibInput}
                    onChange={(e) => setFibInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && runFibonacci()}
                    placeholder="Enter n (0-10)"
                    disabled={loading}
                  />
                </div>
                
                <div className="flex justify-center h-[44px] items-center">
                  <Button 
                    onClick={runFibonacci} 
                    className="min-w-[140px]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      'Calculate'
                    )}
                  </Button>
                </div>
                
                <div className="space-y-2 flex flex-col min-h-0">
                  <label className="text-sm font-semibold text-foreground">Output</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-slate-200 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap border border-border flex-1">
                    {fibOutput}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
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

            <Card>
              <CardHeader>
                <CardTitle>Call Stack Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                {callStack.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 italic">
                    Call stack is empty
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callStack.slice().reverse().map((frame, idx) => (
                      <div
                        key={idx}
                        className="bg-primary/20 dark:bg-primary/30 text-foreground p-3 rounded-md border border-primary/30"
                      >
                        <div className="font-mono text-sm">
                          Return: {frame.returnAddress}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground mt-1">
                          Stack pointer: {frame.stackPointer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

