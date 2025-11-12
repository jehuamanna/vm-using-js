import { Episode07 } from './pages/Episode07'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Episode07 />
    </div>
  )
}

export default App

