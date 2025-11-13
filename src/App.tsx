import { Episode19 } from './pages/Episode19'
import { ThemeToggle } from './components/theme-toggle'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Episode19 />
    </div>
  )
}

export default App

