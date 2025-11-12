import { Episode11 } from './pages/Episode11'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Episode11 />
    </div>
  )
}

export default App

