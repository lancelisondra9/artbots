import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ChallengeDetail from './ChallengeDetail'

type Prompt = {
  id: number
  dayNumber: number
  text: string
}

type Challenge = {
  id: number
  title: string
  startDate: string
  prompts: Prompt[]
}

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0()
  const [newTitle, setNewTitle] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newPrompts, setNewPrompts] = useState('')
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

  const createChallenge = async (event: React.FormEvent) => {
  event.preventDefault()

  const token = await getAccessTokenSilently()
  const response = await fetch('http://localhost:8080/api/challenges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: newTitle,
      startDate: newStartDate,
      prompts: newPrompts,
    }),
  })

    if (!response.ok) {
      console.error('Failed to create challenge:', response.status)
      return
    }

    // Clear the form, then refetch the list so the new card shows up.
    setNewTitle('')
    setNewStartDate('')
    setNewPrompts('')
    const updated = await fetch('http://localhost:8080/api/challenges', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json())
    setChallenges(updated)
  }


  useEffect(() => {
    if (!isAuthenticated) return

    const fetchChallenges = async () => {
      const token = await getAccessTokenSilently()
      const response = await fetch('http://localhost:8080/api/challenges', {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Checking response.ok BEFORE parsing means a 500/401/etc. never
      // gets treated as if it were the real data -- we bail out here
      // with a clear error instead of handing a malformed shape to
      // setChallenges() and crashing the render later.
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Belt-and-suspenders: even on a 200, guard against the body not
      // actually being an array before trusting it.
      if (!Array.isArray(data)) {
        throw new Error('Expected an array of challenges, got something else')
      }

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

      {selectedChallenge ? (
        <ChallengeDetail
          challenge={selectedChallenge}
          onBack={() => setSelectedChallenge(null)}
        />
      ) : (
        <main className="px-6 py-10">
          <form onSubmit={createChallenge} className="mb-8 flex flex-col gap-3 max-w-md">
            <input
              type="text"
              placeholder="Challenge title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={newStartDate}
              onChange={(event) => setNewStartDate(event.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="cat, dog, forest, ocean, mountain..."
              value={newPrompts}
              onChange={(event) => setNewPrompts(event.target.value)}
              rows={3}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
            >
              Create Challenge
            </button>
          </form>

          {challenges.length === 0 ? (
            <p className="text-slate-400">No challenges yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-600"
                >
                  <h2 className="text-lg font-semibold">{challenge.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Starts {challenge.startDate} · {challenge.prompts.length} days
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

export default App
