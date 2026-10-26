'use client'

import { useState } from 'react'
import { login, loginAsDemo, loginByRollNumber } from '@/lib/auth/actions'

interface LoginFormProps {
  error?: string
  reason?: string
}

export default function LoginForm({ error, reason }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'staff' | 'password'>('student')
  const [rollNumber, setRollNumber] = useState('CS2026-001')
  const [isPending, setIsPending] = useState(false)

  const handleDemoLaunch = async (role: 'admin' | 'teacher' | 'student') => {
    setIsPending(true)
    await loginAsDemo(role)
  }

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 p-1 mb-5 rounded-xl border bg-slate-100/80 text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'student'
              ? 'bg-white shadow-sm font-semibold text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🎓 Student</span>
          <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold">Zero-Auth</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'staff'
              ? 'bg-white shadow-sm font-semibold text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚡ Staff / Admin</span>
          <span className="text-[9px] uppercase tracking-wider text-blue-600 font-bold">1-Click</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'password'
              ? 'bg-white shadow-sm font-semibold text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🔒 Password</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400">Classic</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-200" style={{ background: 'var(--accent-bad-soft)', color: 'var(--accent-bad)' }}>
          <span className="text-base leading-none">⚠️</span>
          <div>
            <div className="font-semibold">Authentication Notice</div>
            <div>{decodeURIComponent(error)}</div>
          </div>
        </div>
      )}

      {reason === 'orphaned' && (
        <div className="mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border border-amber-200" style={{ background: 'var(--accent-warn-soft)', color: 'var(--accent-warn)' }}>
          <span className="text-base leading-none">ℹ️</span>
          <div>Previous session expired or cleared. Please sign in again.</div>
        </div>
      )}

      {/* TAB 1: STUDENT ZERO-AUTH LOGIN */}
      {activeTab === 'student' && (
        <div className="card p-6 border shadow-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-good text-[10px]">Zero-Auth Enabled</span>
              <span className="text-xs text-slate-400">No password required</span>
            </div>
            <h2 className="text-base font-semibold text-slate-800">Student Portal Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Registered students can log in directly using their institutional Roll Number to check attendance, view session history, and file disputes.
            </p>
          </div>

          <form action={loginByRollNumber} onSubmit={() => setIsPending(true)} className="space-y-4">
            <div>
              <label className="field-label flex justify-between items-center">
                <span>Student Roll Number</span>
                <span className="text-[10px] text-blue-600 font-normal">Pre-enrolled</span>
              </label>
              <input
                type="text"
                name="roll_number"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. CS2026-001"
                className="field-input font-mono"
              />
            </div>

            {/* Quick Roll Number Selector for Demo */}
            <div>
              <span className="text-[11px] font-medium text-slate-500 mb-1.5 block">
                Quick-Select Registered Students:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'Alex Smith', roll: 'CS2026-001' },
                  { name: 'Rohan Kumar', roll: 'CS2026-002' },
                ].map((s) => (
                  <button
                    key={s.roll}
                    type="button"
                    onClick={() => setRollNumber(s.roll)}
                    className={`text-left text-xs p-2 rounded-lg border transition ${
                      rollNumber === s.roll
                        ? 'border-blue-500 bg-blue-50/60 font-semibold text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-[11px] truncate">{s.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{s.roll}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 font-medium shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? 'Authenticating...' : 'Enter Student Portal (Zero-Auth) →'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF & ADMIN 1-CLICK LAUNCH */}
      {activeTab === 'staff' && (
        <div className="card p-6 border shadow-sm space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-neutral text-[10px]">Reviewer & Demo Mode</span>
            </div>
            <h2 className="text-base font-semibold text-slate-800">1-Click Staff Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Direct access for portfolio maintainers, interviewers, and faculty without credential hassle:
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDemoLaunch('admin')}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 flex items-center gap-1.5">
                  <span>👑 System Administrator</span>
                  <span className="badge badge-neutral text-[9px] py-0">Ansh Tomar</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Full control: RTSP cameras, enrollments, thresholds, and institution logs
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                Launch →
              </span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDemoLaunch('teacher')}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 flex items-center gap-1.5">
                  <span>👨‍🏫 Classroom Faculty</span>
                  <span className="badge badge-neutral text-[9px] py-0">Prof. Miller</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Class timetables, live session monitoring, permitted exits, dispute reviews
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                Launch →
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TRADITIONAL PASSWORD LOGIN */}
      {activeTab === 'password' && (
        <form
          action={login}
          onSubmit={() => setIsPending(true)}
          className="card p-6 border shadow-sm space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Standard Sign In</h2>
            <p className="text-xs text-slate-500">Sign in with an institutional email and password.</p>
          </div>

          <div>
            <label className="field-label">Institutional Email</label>
            <input
              type="email"
              name="email"
              required
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
              placeholder="••••••••••••"
              className="field-input"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-2.5 font-medium shadow-sm cursor-pointer"
          >
            {isPending ? 'Signing In...' : 'Sign In with Password'}
          </button>
        </form>
      )}

      {/* Resume Pitch Footer Card */}
      <div className="mt-5 p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center">
        <p className="text-[11px] text-slate-500">
          🚀 <strong>PSYS Presentation Mode</strong>: Multi-tenant automated attendance with ArcFace 512-D biometrics, quorum boundary detection, and privacy photo disposal.
        </p>
      </div>
    </div>
  )
}
