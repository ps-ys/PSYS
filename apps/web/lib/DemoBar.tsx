'use client'

import { useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { loginAsDemo } from '@/lib/auth/actions'

interface DemoBarProps {
  currentRole: string
  userName: string | null
}

export default function DemoBar({ currentRole, userName }: DemoBarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  if (pathname === '/login') return null

  const handleSwitch = (role: 'admin' | 'teacher' | 'student') => {
    startTransition(async () => {
      await loginAsDemo(role)
    })
  }

  return (
    <div
      className="border-b px-4 py-1.5 flex items-center justify-between text-xs sticky top-0 z-20 transition-opacity"
      style={{
        background: '#0F172A',
        borderColor: '#1E293B',
        color: '#F8FAFC',
        opacity: isPending ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-slate-200 tracking-wide text-[11px]">
          PSYS Demo Mode
        </span>
        <span className="text-slate-400 text-[10px] hidden md:inline">
          &middot; Viewing as: <strong className="text-white capitalize">{userName || currentRole} ({currentRole})</strong>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-[10px] hidden sm:inline mr-1">Switch Persona:</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch('admin')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            currentRole === 'admin'
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          👑 Admin
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch('teacher')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            currentRole === 'teacher'
              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          👨‍🏫 Teacher
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch('student')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            currentRole === 'student'
              ? 'bg-purple-600 text-white shadow-sm font-semibold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          🎓 Student
        </button>
      </div>
    </div>
  )
}
