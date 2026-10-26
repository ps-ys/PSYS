import { login } from '@/lib/auth/actions'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const { error, reason } = await searchParams

  return (
    <div
      className="min-h-full flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent-good)' }}>
            PSYS
          </p>
          <h1 className="text-xl font-semibold">Sign in to your dashboard</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Automated Classroom Attendance & Verification
          </p>
        </div>

        <LoginForm action={login} error={error} reason={reason} />
      </div>
    </div>
  )
}
