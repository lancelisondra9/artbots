import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

type Challenge = {
  id: number
  title: string
  startDate: string
  dayCount: number
}

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchChallenges = async () => {
      const token = await getAccessTokenSilently()
      const response = await fetch('http://localhost:8080/api/challenges', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setChallenges(data)
    }

    fetchChallenges().catch((error) => console.error('Failed to fetch:', error))
  }, [isAuthenticated, getAccessTokenSilently])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-bold">artbots</h1>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Log Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithRedirect()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            Log In
          </button>
        )}
      </header>

      <main className="px-6 py-10">
        {challenges.length === 0 ? (
          <p className="text-slate-400">No challenges yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4"
              >
                <h2 className="text-lg font-semibold">{challenge.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Starts {challenge.startDate} · {challenge.dayCount} days
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
