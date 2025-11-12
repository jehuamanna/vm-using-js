import { Episode13 } from './pages/Episode13'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Episode13 />
    </div>
  )
}

export default App

