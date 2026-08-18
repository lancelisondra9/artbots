 import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  // This state will hold whatever the backend sends back.
  // It starts as null because when the component first renders,
  // the fetch hasn't happened yet -- there's nothing to show.
  const [message, setMessage] = useState<string | null>(null)
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0()

  // useEffect with an empty dependency array ([]) means "run this
  // once, right after the component mounts" -- not on every re-render.
  // That's exactly what we want for an initial data fetch.
  useEffect(() => {
  if (!isAuthenticated) return

  const fetchChallenges = async () => {
    const token = await getAccessTokenSilently()
    const response = await fetch('http://localhost:8080/api/challenges', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    setMessage(JSON.stringify(data))
  }

  fetchChallenges().catch((error) => console.error('Failed to fetch:', error))
  }, [isAuthenticated, getAccessTokenSilently])


  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
          {/* Renders "Loading..." until the fetch above resolves and
              setMessage() triggers a re-render with the real value. */}
          <p>Backend says: {message ?? 'Loading...'}</p>

          {isAuthenticated ? ( //new code for auth0
            <>
              <p>Logged in as {user?.name}</p>
              <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
                Log Out
              </button>
            </>
          ) : (
            <button onClick={() => loginWithRedirect()}>Log In</button>
          )}
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
