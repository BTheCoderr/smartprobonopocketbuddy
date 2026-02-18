import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Support from './pages/Support'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </>
  )
}
