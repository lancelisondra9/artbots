import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

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

type TodayResponse = {
  dayNumber: number
  promptText: string | null
}

type ChallengeDetailProps = {
  challenge: Challenge
  onBack: () => void
}

function ChallengeDetail({ challenge, onBack }: ChallengeDetailProps) {
  const { getAccessTokenSilently } = useAuth0()
  const [today, setToday] = useState<TodayResponse | null>(null)
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchToday = async () => {
      const token = await getAccessTokenSilently()
      const response = await fetch(
        `http://localhost:8080/api/challenges/${challenge.id}/today`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setToday(data)
    }

    fetchToday().catch((error) => console.error('Failed to fetch today:', error))
  }, [challenge.id, getAccessTokenSilently])

  const submitSubmission = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!today) return

    const token = await getAccessTokenSilently()
    const response = await fetch('http://localhost:8080/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: submissionUrl,
        dayNumber: today.dayNumber,
        challengeId: challenge.id,
      }),
    })

    if (!response.ok) {
      console.error('Failed to submit:', response.status)
      return
    }

    setSubmissionUrl('')
    setSubmitted(true)
  }

  return (
    <div className="px-6 py-10">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-slate-400 hover:text-slate-200"
      >
        ← Back to challenges
      </button>

      <h1 className="text-2xl font-bold">{challenge.title}</h1>

      {today === null ? (
        <p className="mt-4 text-slate-400">Loading today's prompt...</p>
      ) : today.promptText === null ? (
        <p className="mt-4 text-slate-400">
          {today.dayNumber < 1
            ? "This challenge hasn't started yet."
            : 'This challenge has ended.'}
        </p>
      ) : (
        <>
          <p className="mt-4 text-lg">
            Day {today.dayNumber}:{' '}
            <span className="font-semibold">{today.promptText}</span>
          </p>

          {submitted ? (
            <p className="mt-6 text-green-400">
              Submitted! Come back tomorrow for the next prompt.
            </p>
          ) : (
            <form
              onSubmit={submitSubmission}
              className="mt-6 flex max-w-md flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Image URL"
                value={submissionUrl}
                onChange={(event) => setSubmissionUrl(event.target.value)}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-900"
              >
                Submit Day {today.dayNumber}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}

export default ChallengeDetail
