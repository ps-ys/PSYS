'use client'

import { useState } from 'react'

interface LoginFormProps {
  action: (formData: FormData) => Promise<void>
  error?: string
  reason?: string
}

export default function LoginForm({ action, error, reason }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail)
    setPassword(userPass)
  }

  return (
    <div>
      <form
        action={action}
        className="space-y-4 p-6 rounded-xl border shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="field-input"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-bad-soft)', color: 'var(--accent-bad)' }}>
            {decodeURIComponent(error)}
          </div>
        )}

        {reason === 'orphaned' && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-warn-soft)', color: 'var(--accent-warn)' }}>
            Account session cleared. Please sign in again.
          </div>
        )}

        <button type="submit" className="btn-primary w-full py-2.5 font-medium shadow-sm">
          Sign In
        </button>
      </form>

      {/* Recruiter / Portfolio Demo Quick Access */}
      <div className="mt-6 p-4 rounded-xl border" style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
            Resume Demo Credentials
          </span>
          <span className="badge badge-good text-[10px] py-0 px-1.5">1-Click Fill</span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Select a persona below to auto-fill demo credentials for portfolio exploration:
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillCredentials('admin@test.local', 'demoPassword123!')}
            className="text-xs py-1.5 px-2 rounded-lg border font-medium transition hover:border-blue-500 text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="font-semibold text-slate-800">Admin</div>
            <div className="text-[10px] text-slate-500">Full control</div>
          </button>

          <button
            type="button"
            onClick={() => fillCredentials('teacher@test.local', 'demoPassword123!')}
            className="text-xs py-1.5 px-2 rounded-lg border font-medium transition hover:border-blue-500 text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="font-semibold text-slate-800">Teacher</div>
            <div className="text-[10px] text-slate-500">Sessions & attendance</div>
          </button>

          <button
            type="button"
            onClick={() => fillCredentials('student@test.local', 'demoPassword123!')}
            className="text-xs py-1.5 px-2 rounded-lg border font-medium transition hover:border-blue-500 text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="font-semibold text-slate-800">Student</div>
            <div className="text-[10px] text-slate-500">Disputes & view</div>
          </button>
        </div>
      </div>
    </div>
  )
}
