import { Episode18 } from './pages/Episode18'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Episode18 />
    </div>
  )
}

export default App

