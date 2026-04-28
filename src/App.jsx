import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage.jsx'
import { RoomPage } from './pages/RoomPage.jsx'
import { GamePage } from './pages/GamePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:pin" element={<RoomPage />} />
      <Route path="/play/:pin/:gameCode" element={<GamePage />} />
      {/* Compatibilidad con rutas viejas */}
      <Route path="/lobby/:pin" element={<Navigate to="/" replace />} />
      <Route path="/leaderboard/:pin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
