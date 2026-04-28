import { useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/index.js'
import styles from './GamePage.module.css'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Mirrors what the original GameView does:
 * writes all config into localStorage so that the Unity WebGL
 * build can read it via the shared storage utility.
 */
function initGameStorage(config) {
  const keys = [
    'next_url', 'api_url', 'api_version', 'challenge_uuid',
    'game_code', 'game_uuid', 'user_code', 'from_challenge',
    'challenge_task_uuid', 'task_target_score', 'task_type',
    'game_type', 'game_name', 'nickname', 'room_uuid',
    'host_nickname', 'sockets_url', 'player_type', 'brand_name',
    'access_token', 'refresh_token',
  ]
  keys.forEach((k) => {
    const v = config[k]
    if (v !== undefined && v !== null) {
      localStorage.setItem(k, String(v))
    }
  })
}

export function GamePage() {
  const { pin, gameCode } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const roomId = searchParams.get('roomId') || ''

  const { playerName, accessToken, refreshToken, userUuid } = useAuthStore()
  const iframeRef = useRef(null)

  // Supported game list (same as original GameView)
  const supportedCodes = [
    'G001','G002','G003','G005','G006','G007',
    'G008','G009','G010','G011','G014','G016','G019','G020',
  ]
  const unsupported = !supportedCodes.includes(gameCode)

  useEffect(() => {
    // Clear SW caches (same as original GameView)
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }

    // The finish-game endpoint needs challenge_task_uuid = room's leaderboard id
    initGameStorage({
      next_url: window.location.origin + `/room/${pin}`,
      api_url: API_URL,
      api_version: '2.0',
      game_code: gameCode,
      game_uuid: gameCode,               // reuse code as uuid (dummy)
      challenge_task_uuid: roomId,       // this is the leaderboard_id used by finish-game
      from_challenge: true,
      task_target_score: 0,
      task_type: 'SCORE',
      user_code: '',
      game_type: '',
      game_name: '',
      nickname: playerName || 'Jugador',
      brand_name: '',
      room_uuid: '',
      host_nickname: '',
      sockets_url: '',
      player_type: '',
      access_token: accessToken || '',
      refresh_token: refreshToken || '',
    })
  }, [pin, gameCode, roomId, accessToken, refreshToken, playerName])

  const handleBack = () => {
    const goBack = window.confirm('¿Salir del juego? Tu puntaje actual se perderá si no lo has enviado.')
    if (goBack) navigate(`/room/${pin}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <button className={styles.backBtn} onClick={handleBack}>← Sala</button>
        <span className={styles.gameLabel}>{gameCode}</span>
        <button
          className={styles.leaderboardBtn}
          onClick={() => navigate(`/room/${pin}`)}
        >
          Ranking
        </button>
      </div>

      <div className={styles.gameArea}>
        <div className={styles.mobileFrame}>
          {unsupported && (
            <div className={styles.unsupportedOverlay}>
              <div className={styles.unsupportedBox}>
                <p>Este juego no está disponible en la versión web.</p>
                <button className={styles.btnBack} onClick={() => navigate(`/room/${pin}`)}>
                  Volver a la sala
                </button>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={`/unity/${gameCode}/index.html`}
            title={`Juego ${gameCode}`}
            className={styles.iframe}
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    </div>
  )
}
