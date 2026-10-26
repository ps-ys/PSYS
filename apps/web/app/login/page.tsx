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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent-good)' }}>
            PSYS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classroom Attendance System</h1>
          <p className="text-xs mt-1 text-slate-500">
            Autonomous Biometric Verification & Multi-Tenant Management
          </p>
        </div>

        <LoginForm error={error} reason={reason} />
      </div>
    </div>
  )
}
