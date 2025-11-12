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
  const [factorialInput, setFactorialInput] = useState<string>('5')
  const [simpleOutput, setSimpleOutput] = useState<string>('Output will appear here...')
  const [fibOutput, setFibOutput] = useState<string>('Output will appear here...')
  const [factorialOutput, setFactorialOutput] = useState<string>('Output will appear here...')
  const [stack, setStack] = useState<number[]>([])
  const [callStack, setCallStack] = useState<Array<{ returnAddress: number; stackPointer: number }>>([])
  const [loadingSimple, setLoadingSimple] = useState<boolean>(false)
  const [loadingFib, setLoadingFib] = useState<boolean>(false)
  const [loadingFactorial, setLoadingFactorial] = useState<boolean>(false)

  const updateVisuals = () => {
    setStack([...vm.stack])
    setCallStack([...vm.callStack])
  }

  const runFibonacci = async () => {
    vm.reset()
    setLoadingFib(true)
    setFibOutput('Running...\n')
    updateVisuals()

    const n = parseInt(fibInput.trim())

    // Validate input
    if (isNaN(n) || n < 0) {
      setFibOutput('Error: Please enter a valid non-negative integer.')
      setLoadingFib(false)
      updateVisuals()
      return
    }

    if (n > 10) {
      setFibOutput('Error: Please enter a number between 0 and 10 (to avoid long execution).')
      setLoadingFib(false)
      updateVisuals()
      return
    }

    // Fibonacci function using recursion with stack frames
    // Calling convention: parameter passed on stack, result returned on stack
    // Function at index 6: fib(n)
    //   Store parameter n in local[0] (frame-relative)
    //   if n <= 1: return n
    //   else: return fib(n-1) + fib(n-2)
    // 
    // Now using LOAD_LOCAL and STORE_LOCAL for proper stack frame support!
    // Each recursive call gets its own frame with its own local variables.
    
    // Calculate base case index: 42 (after all the recursive case code)
    const baseCaseIndex = 42
    
    const bytecode = [
      // Main program
      OPCODES.PUSH, n,        // 0-1: Push argument n
      OPCODES.CALL, 6,        // 2-3: Call fib function at bytecode index 6
      OPCODES.PRINT,          // 4: Print result
      OPCODES.HALT,           // 5: Halt
      
      // fib function starts at index 6
      // Store parameter n in local[0] (frame-relative, each call has its own frame)
      OPCODES.STORE_LOCAL, 0, // 6-7: Pop n from stack and store in local[0]
      
      // Check base case: if n <= 1, return n
      OPCODES.LOAD_LOCAL, 0,  // 8-9: Load n from local[0]
      OPCODES.PUSH, 1,        // 10-11: Push 1
      OPCODES.SUB,            // 12: n - 1 (result on stack)
      OPCODES.JMP_IF_NEG, baseCaseIndex, // 13-14: if n-1 < 0 (i.e., n < 1), jump to base case
      OPCODES.LOAD_LOCAL, 0,  // 15-16: Load n again
      OPCODES.PUSH, 1,        // 17-18: Push 1
      OPCODES.SUB,            // 19: n - 1 again
      OPCODES.JMP_IF_ZERO, baseCaseIndex, // 20-21: if n-1 == 0 (i.e., n == 1), jump to base case
      
      // Recursive case: fib(n-1) + fib(n-2)
      // Compute fib(n-1) first
      OPCODES.LOAD_LOCAL, 0,  // 22-23: Load n from local[0]
      OPCODES.PUSH, 1,        // 24-25: Push 1
      OPCODES.SUB,            // 26: n - 1
      OPCODES.CALL, 6,        // 27-28: Call fib(n-1), result on stack
      OPCODES.STORE_LOCAL, 1, // 29-30: Save fib(n-1) in local[1]
      
      // Compute fib(n-2)
      OPCODES.LOAD_LOCAL, 0,  // 31-32: Load n from local[0] (still safe in our frame!)
      OPCODES.PUSH, 2,        // 33-34: Push 2
      OPCODES.SUB,            // 35: n - 2
      OPCODES.CALL, 6,        // 36-37: Call fib(n-2), result on stack
      
      // Add fib(n-1) + fib(n-2)
      OPCODES.LOAD_LOCAL, 1,  // 38-39: Load fib(n-1) from local[1]
      OPCODES.ADD,            // 40: fib(n-1) + fib(n-2)
      OPCODES.RET,            // 41: Return result
      
      // Base case: return n (starts at index 42)
      OPCODES.LOAD_LOCAL, 0,  // 42-43: Load n from local[0]
      OPCODES.RET             // 44: Return n
    ]

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setFibOutput(`Input: fib(${n})\nOutput: ${results.join('\n')}\n\nNote: This uses recursion with CALL/RET instructions.`)
    } catch (error) {
      setFibOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    setLoadingFib(false)
    updateVisuals()
  }

  const runSimpleFunction = async () => {
    vm.reset()
    setLoadingSimple(true)
    setSimpleOutput('Running simple function demo...\n')
    updateVisuals()

    // Simple function: double(n) = n * 2
    // Calling convention: parameter on stack, result on stack
    // Main: PUSH 5, CALL double, PRINT, HALT
    // double function: pop n, multiply by 2, push result, return
    const bytecode = [
      // Main program
      OPCODES.PUSH, 5,        // 0-1: Push argument 5
      OPCODES.CALL, 6,        // 2-3: Call double at bytecode index 6
      OPCODES.PRINT,          // 4: Print result
      OPCODES.HALT,           // 5: Halt
      
      // double function (starts at index 6)
      // Parameter is already on stack, just multiply by 2
      OPCODES.PUSH, 2,        // 6-7: Push 2
      OPCODES.MUL,            // 8: Multiply top two values (n * 2)
      OPCODES.RET             // 9: Return result
    ]

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setSimpleOutput(`Simple Function Demo:\nCall double(5)\nOutput: ${results.join('\n')}\n\nThis demonstrates CALL and RET with a simple function.`)
    } catch (error) {
      setSimpleOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    setLoadingSimple(false)
    updateVisuals()
  }

  const runFactorial = async () => {
    vm.reset()
    setLoadingFactorial(true)
    setFactorialOutput('Running...\n')
    updateVisuals()

    const n = parseInt(factorialInput.trim())

    // Validate input
    if (isNaN(n) || n < 0) {
      setFactorialOutput('Error: Please enter a valid non-negative integer.')
      setLoadingFactorial(false)
      updateVisuals()
      return
    }

    if (n > 10) {
      setFactorialOutput('Error: Please enter a number between 0 and 10 (to avoid long execution).')
      setLoadingFactorial(false)
      updateVisuals()
      return
    }

    // Factorial function using recursion
    // fact(n) = n * fact(n-1) for n > 0
    // fact(0) = 1
    // 
    // Using stack frames with LOAD_LOCAL and STORE_LOCAL
    
    // Calculate base case index: 26
    const baseCaseIndex = 26
    
    const bytecode = [
      // Main program
      OPCODES.PUSH, n,        // 0-1: Push argument n
      OPCODES.CALL, 6,        // 2-3: Call fact function at bytecode index 6
      OPCODES.PRINT,          // 4: Print result
      OPCODES.HALT,           // 5: Halt
      
      // fact function starts at index 6
      // Store parameter n in local[0]
      OPCODES.STORE_LOCAL, 0, // 6-7: Pop n from stack and store in local[0]
      
      // Check base case: if n == 0, return 1
      OPCODES.LOAD_LOCAL, 0,  // 8-9: Load n from local[0]
      OPCODES.PUSH, 0,        // 10-11: Push 0
      OPCODES.SUB,            // 12: n - 0 (just to check)
      OPCODES.JMP_IF_ZERO, baseCaseIndex, // 13-14: if n == 0, jump to base case
      
      // Recursive case: n * fact(n-1)
      // Compute fact(n-1) first
      OPCODES.LOAD_LOCAL, 0,  // 15-16: Load n from local[0]
      OPCODES.PUSH, 1,        // 17-18: Push 1
      OPCODES.SUB,            // 19: n - 1
      OPCODES.CALL, 6,        // 20-21: Call fact(n-1), result on stack
      
      // Multiply n * fact(n-1)
      OPCODES.LOAD_LOCAL, 0,  // 22-23: Load n from local[0]
      OPCODES.MUL,            // 24: n * fact(n-1)
      OPCODES.RET,            // 25: Return result
      
      // Base case: return 1 (starts at index 26)
      OPCODES.PUSH, 1,        // 26-27: Push 1
      OPCODES.RET             // 28: Return 1
    ]

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const results = vm.execute(bytecode)
      setFactorialOutput(`Input: fact(${n})\nOutput: ${results.join('\n')}\n\nNote: This uses single recursive call with stack frames.`)
    } catch (error) {
      setFactorialOutput('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
    setLoadingFactorial(false)
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    disabled={loadingSimple}
                  >
                    {loadingSimple ? (
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
                    {simpleOutput}
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
                    <span className="text-blue-400">// fib(n) - uses stack frames</span><br />
                    <span className="text-blue-400">// STORE_LOCAL 0  // Save n</span><br />
                    <span className="text-blue-400">// if n &lt;= 1: return n</span><br />
                    <span className="text-blue-400">// else: return fib(n-1) + fib(n-2)</span><br />
                    <span className="text-blue-400">// Uses LOAD_LOCAL/STORE_LOCAL for frame-relative vars</span>
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
                    onKeyDown={(e) => e.key === 'Enter' && !loadingFib && runFibonacci()}
                    placeholder="Enter n (0-10)"
                    disabled={loadingFib}
                  />
                </div>
                
                <div className="flex justify-center h-[44px] items-center">
                  <Button 
                    onClick={runFibonacci} 
                    className="min-w-[140px]"
                    disabled={loadingFib}
                  >
                    {loadingFib ? (
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

            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Demo 3: Recursive Factorial</CardTitle>
                <CardDescription>Calculate factorial using single recursion</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Bytecode</label>
                  <div className="bg-muted dark:bg-slate-900 text-foreground dark:text-green-300 p-4 rounded-md font-mono text-sm border border-border leading-relaxed h-[180px] overflow-y-auto">
                    <span className="text-blue-400">// Main</span><br />
                    PUSH n<br />
                    CALL fact<br />
                    PRINT<br />
                    HALT<br />
                    <br />
                    <span className="text-blue-400">// fact(n) - uses stack frames</span><br />
                    <span className="text-blue-400">// STORE_LOCAL 0  // Save n</span><br />
                    <span className="text-blue-400">// if n == 0: return 1</span><br />
                    <span className="text-blue-400">// else: return n * fact(n-1)</span><br />
                    <span className="text-blue-400">// Single recursive call pattern</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="factorialInput">Factorial Input (0-10)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter a number between 0 and 10. Factorial grows quickly (5! = 120, 10! = 3,628,800).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="factorialInput"
                    type="number"
                    min="0"
                    max="10"
                    value={factorialInput}
                    onChange={(e) => setFactorialInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loadingFactorial && runFactorial()}
                    placeholder="Enter n (0-10)"
                    disabled={loadingFactorial}
                  />
                </div>
                
                <div className="flex justify-center h-[44px] items-center">
                  <Button 
                    onClick={runFactorial} 
                    className="min-w-[140px]"
                    disabled={loadingFactorial}
                  >
                    {loadingFactorial ? (
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
                    {factorialOutput}
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

