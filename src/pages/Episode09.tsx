import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useTheme } from '../components/theme-provider'
import { BookOpen, Code2, Zap, Shield, Globe, Cpu, ChevronDown, ChevronUp } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface VMComparison {
  name: string
  fullName: string
  icon: React.ReactNode
  description: string
  bytecodeModel: string
  runtimeGuarantees: string[]
  strengths: string[]
  weaknesses: string[]
  exampleCode: string
  exampleBytecode: string
  useCases: string[]
  year: string
}

const VM_COMPARISONS: VMComparison[] = [
  {
    name: 'JVM',
    fullName: 'Java Virtual Machine',
    icon: <Cpu className="h-6 w-6" />,
    description: 'The Java Virtual Machine executes Java bytecode, providing platform independence and strong security guarantees.',
    bytecodeModel: 'Stack-based with local variables',
    runtimeGuarantees: [
      'Type safety verification',
      'Memory safety (no buffer overflows)',
      'Automatic garbage collection',
      'Exception handling',
      'Security sandboxing'
    ],
    strengths: [
      'Write once, run anywhere (WORA)',
      'Mature ecosystem (Java, Kotlin, Scala)',
      'Excellent tooling and debugging',
      'Strong security model',
      'HotSpot JIT compiler for performance'
    ],
    weaknesses: [
      'Higher memory overhead',
      'Startup time can be slow',
      'Less control over memory layout',
      'JIT warmup required for peak performance'
    ],
    exampleCode: `// Java source
public class Hello {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        System.out.println(x + y);
    }
}`,
    exampleBytecode: `// JVM bytecode (javap -c)
0: iconst_5        // Push 5
1: istore_1        // Store to local 1
2: bipush 10       // Push 10
4: istore_2        // Store to local 2
5: iload_1         // Load local 1
6: iload_2         // Load local 2
7: iadd            // Add
8: invokevirtual   // Print
11: return`,
    useCases: ['Enterprise applications', 'Android apps', 'Server-side services', 'Large-scale systems'],
    year: '1995'
  },
  {
    name: 'CLR',
    fullName: 'Common Language Runtime',
    icon: <Globe className="h-6 w-6" />,
    description: 'Microsoft\'s Common Language Runtime executes .NET bytecode (CIL), supporting multiple languages like C#, F#, and VB.NET.',
    bytecodeModel: 'Stack-based with evaluation stack',
    runtimeGuarantees: [
      'Type safety',
      'Memory safety',
      'Managed memory (GC)',
      'Exception handling',
      'Code access security'
    ],
    strengths: [
      'Multi-language support',
      'Excellent Windows integration',
      'Strong typing and generics',
      'Modern async/await support',
      '.NET ecosystem'
    ],
    weaknesses: [
      'Historically Windows-focused (though .NET Core changed this)',
      'Less portable than JVM historically',
      'Learning curve for multiple languages'
    ],
    exampleCode: `// C# source
class Program {
    static void Main() {
        int x = 5;
        int y = 10;
        Console.WriteLine(x + y);
    }
}`,
    exampleBytecode: `// CIL bytecode (IL)
IL_0000: ldc.i4.5      // Push 5
IL_0001: stloc.0       // Store to local 0
IL_0002: ldc.i4.s 10   // Push 10
IL_0004: stloc.1       // Store to local 1
IL_0005: ldloc.0       // Load local 0
IL_0006: ldloc.1       // Load local 1
IL_0007: add           // Add
IL_0008: call          // Console.WriteLine
IL_000D: ret           // Return`,
    useCases: ['Windows applications', 'Web services (ASP.NET)', 'Game development (Unity)', 'Enterprise software'],
    year: '2002'
  },
  {
    name: 'WebAssembly',
    fullName: 'WebAssembly (WASM)',
    icon: <Zap className="h-6 w-6" />,
    description: 'A binary instruction format for a stack-based virtual machine, designed for the web but usable anywhere.',
    bytecodeModel: 'Stack-based, linear memory',
    runtimeGuarantees: [
      'Memory safety (sandboxed)',
      'Type safety',
      'Deterministic execution',
      'No undefined behavior',
      'Fast startup time'
    ],
    strengths: [
      'Near-native performance',
      'Small binary size',
      'Fast startup',
      'Language agnostic',
      'Secure by design (sandboxed)',
      'Works in browsers and outside'
    ],
    weaknesses: [
      'No garbage collection (yet)',
      'Limited DOM access',
      'Still evolving standard',
      'Debugging can be challenging'
    ],
    exampleCode: `// C source (compiled to WASM)
int add(int x, int y) {
    return x + y;
}`,
    exampleBytecode: `// WebAssembly text format (WAT)
(func $add (param $x i32) (param $y i32) (result i32)
  local.get $x    // Push x
  local.get $y    // Push y
  i32.add         // Add
)`,
    useCases: ['Web applications', 'Game engines', 'Image/video processing', 'Cryptography', 'Scientific computing'],
    year: '2017'
  },
  {
    name: 'CHIP-8',
    fullName: 'CHIP-8 Virtual Machine',
    icon: <Shield className="h-6 w-6" />,
    description: 'A simple interpreted programming language from the 1970s, originally used for early video games. Perfect for learning VM concepts!',
    bytecodeModel: 'Register-based with stack',
    runtimeGuarantees: [
      'Simple instruction set',
      'Deterministic execution',
      'Fixed memory layout',
      'No type safety (all values are 8-bit)'
    ],
    strengths: [
      'Extremely simple to implement',
      'Great for learning',
      'Small instruction set (35 opcodes)',
      'Built-in graphics and input',
      'Many classic games available'
    ],
    weaknesses: [
      'Very limited (8-bit values)',
      'No modern features',
      'Not suitable for real applications',
      'Historical/educational use only'
    ],
    exampleCode: `// CHIP-8 assembly
LD V1, #05    ; Load 5 into V1
LD V2, #0A    ; Load 10 into V2
ADD V1, V2    ; V1 = V1 + V2
`,
    exampleBytecode: `// CHIP-8 bytecode (hex)
6105  // LD V1, #05
620A  // LD V2, #0A
8124  // ADD V1, V2`,
    useCases: ['Education', 'Retro game emulation', 'Learning VM design', 'Simple game development'],
    year: '1970s'
  }
]

export function Episode09() {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [selectedVM, setSelectedVM] = useState<string>('JVM')
  const [expandedVM, setExpandedVM] = useState<string | null>('JVM')

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

  const currentVM = VM_COMPARISONS.find(vm => vm.name === selectedVM) || VM_COMPARISONS[0]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Episode 9: Real-World Virtual Machines
          </h1>
          <p className="text-muted-foreground text-lg">
            Exploring JVM, CLR, WebAssembly, and CHIP-8
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Why Study Real VMs?
            </CardTitle>
            <CardDescription>
              Understanding how production virtual machines work helps us appreciate design decisions and trade-offs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">
              Throughout this series, we've been building our own virtual machine. But how does it compare to real-world VMs?
              Today, we'll explore four different virtual machines, each with unique characteristics:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {VM_COMPARISONS.map((vm) => (
                <button
                  key={vm.name}
                  onClick={() => setSelectedVM(vm.name)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedVM === vm.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-primary">{vm.icon}</div>
                    <h3 className="font-semibold text-foreground">{vm.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{vm.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Since {vm.year}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed VM Comparison */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* VM Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentVM.icon}
                {currentVM.fullName}
              </CardTitle>
              <CardDescription>{currentVM.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Bytecode Model</h4>
                <p className="text-sm text-muted-foreground">{currentVM.bytecodeModel}</p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Runtime Guarantees</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {currentVM.runtimeGuarantees.map((guarantee, idx) => (
                    <li key={idx}>{guarantee}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Strengths</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-600 dark:text-green-400">
                  {currentVM.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Weaknesses</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-orange-600 dark:text-orange-400">
                  {currentVM.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Use Cases</h4>
                <div className="flex flex-wrap gap-2">
                  {currentVM.useCases.map((useCase, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Code Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Source Code</h4>
                <div className="border border-border rounded-md overflow-hidden">
                  <CodeMirror
                    value={currentVM.exampleCode}
                    height="150px"
                    theme={isDark ? oneDark : undefined}
                    extensions={[javascript()]}
                    editable={false}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: false,
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Bytecode</h4>
                <div className="border border-border rounded-md overflow-hidden">
                  <CodeMirror
                    value={currentVM.exampleBytecode}
                    height="200px"
                    theme={isDark ? oneDark : undefined}
                    extensions={[javascript()]}
                    editable={false}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: false,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
            <CardDescription>Key differences between the virtual machines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">Feature</th>
                    {VM_COMPARISONS.map((vm) => (
                      <th key={vm.name} className="text-left p-2 font-semibold text-foreground">
                        {vm.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">Bytecode Model</td>
                    {VM_COMPARISONS.map((vm) => (
                      <td key={vm.name} className="p-2 text-muted-foreground">
                        {vm.bytecodeModel}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">Garbage Collection</td>
                    <td className="p-2 text-muted-foreground">Yes</td>
                    <td className="p-2 text-muted-foreground">Yes</td>
                    <td className="p-2 text-muted-foreground">No (planned)</td>
                    <td className="p-2 text-muted-foreground">N/A</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">Type Safety</td>
                    <td className="p-2 text-muted-foreground">Strong</td>
                    <td className="p-2 text-muted-foreground">Strong</td>
                    <td className="p-2 text-muted-foreground">Strong</td>
                    <td className="p-2 text-muted-foreground">None</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">JIT Compilation</td>
                    <td className="p-2 text-muted-foreground">Yes (HotSpot)</td>
                    <td className="p-2 text-muted-foreground">Yes</td>
                    <td className="p-2 text-muted-foreground">AOT/JIT</td>
                    <td className="p-2 text-muted-foreground">No</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">Security Model</td>
                    <td className="p-2 text-muted-foreground">Sandbox</td>
                    <td className="p-2 text-muted-foreground">CAS</td>
                    <td className="p-2 text-muted-foreground">Sandbox</td>
                    <td className="p-2 text-muted-foreground">None</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-foreground">Primary Use</td>
                    {VM_COMPARISONS.map((vm) => (
                      <td key={vm.name} className="p-2 text-muted-foreground">
                        {vm.useCases[0]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Key Takeaways */}
        <Card>
          <CardHeader>
            <CardTitle>Key Takeaways</CardTitle>
            <CardDescription>What we've learned from comparing real VMs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">1. Stack-Based is Common</h4>
                <p className="text-sm text-muted-foreground">
                  Most VMs use stack-based bytecode because it's simple, compact, and easy to verify. 
                  Our VM follows the same pattern as JVM, CLR, and WebAssembly!
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">2. Runtime Guarantees Matter</h4>
                <p className="text-sm text-muted-foreground">
                  Production VMs provide strong guarantees: type safety, memory safety, and security. 
                  These come at a cost (verification, GC overhead) but enable safe execution of untrusted code.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">3. Different Goals, Different Designs</h4>
                <p className="text-sm text-muted-foreground">
                  JVM prioritizes portability, CLR focuses on multi-language support, 
                  WebAssembly targets performance and security, while CHIP-8 was designed for simplicity.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">4. Our VM is Similar!</h4>
                <p className="text-sm text-muted-foreground">
                  The VM we've built shares many characteristics with these production systems: 
                  stack-based execution, bytecode compilation, and a similar instruction set. 
                  We're on the right track!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

