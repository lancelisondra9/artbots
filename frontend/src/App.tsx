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

// Same "days since start, +1" math as the backend's /today endpoint --
// kept in sync manually for now since this is just for sorting
// challenges into tabs, not anything that needs to be authoritative.
function getDayNumber(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
  return diffDays + 1
}

// A challenge is archived once today's day number has passed its last
// prompt. Not-yet-started challenges (dayNumber <= 0) fall through to
// "not archived," which keeps them in the Active tab.
function isArchived(challenge: Challenge): boolean {
  return getDayNumber(challenge.startDate) > challenge.prompts.length
}

// The last day's date = startDate + (number of prompts - 1) days,
// since startDate itself counts as day 1.
function getEndDate(challenge: Challenge): string {
  const end = new Date(`${challenge.startDate}T00:00:00`)
  end.setDate(end.getDate() + challenge.prompts.length - 1)
  return end.toISOString().split('T')[0]
}

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0()
  const [newTitle, setNewTitle] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newPrompts, setNewPrompts] = useState('')
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  const createChallenge = async (event: React.FormEvent) => {
  event.preventDefault()

  // .trim() means whitespace-only input (e.g. someone just hits the
  // spacebar) is treated the same as empty -- guards against a
  // technically-non-empty string that's still useless data.
  if (!newTitle.trim() || !newStartDate.trim() || !newPrompts.trim()) {
    setFormError('Please add params for this challenge')
    return
  }
  setFormError(null)

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

  // Early return: while logged out, this component only ever renders
  // the onboarding screen -- none of the header/form/grid JSX below
  // even runs, so there's nothing for a logged-out visitor to see
  // besides the login prompt.
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <h1 className="text-3xl font-bold">artbots</h1>
        <p className="max-w-sm text-center text-slate-400">
          Post your art for 30-day challenges with friends.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-900"
        >
          Log In
        </button>
      </div>
    )
  }

  const visibleChallenges = challenges.filter((challenge) =>
    activeTab === 'archived' ? isArchived(challenge) : !isArchived(challenge),
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">artbots</h1>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                activeTab === 'active'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Active Challenges
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                activeTab === 'archived'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Archived Challenges
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{user?.name}</span>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-sm text-slate-400 transition-colors hover:text-slate-100"
          >
            Log Out
          </button>
        </div>
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
              className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-900"
            >
              Create Challenge
            </button>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
          </form>

          {visibleChallenges.length === 0 ? (
            <p className="text-slate-400">
              {activeTab === 'archived' ? 'No archived challenges.' : 'No active challenges.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-600"
                >
                  <h2 className="text-lg font-semibold">{challenge.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {isArchived(challenge)
                      ? `Ended ${getEndDate(challenge)}`
                      : `Starts ${challenge.startDate}`}{' '}
                    · {challenge.prompts.length} days
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
