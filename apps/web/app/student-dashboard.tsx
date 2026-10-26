import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fileDispute } from '@/lib/enrollment/disputes'

const ATTENDANCE_BADGE: Record<string, string> = {
  present: 'badge-good',
  absent: 'badge-bad',
  left_early: 'badge-warn',
  uncertain: 'badge-warn',
  camera_issue: 'badge-bad',
}

function Badge({ label, variant }: { label: string; variant: string }) {
  return (
    <span className={`badge ${variant}`}>
      <span className="badge-dot" style={{ background: 'currentColor' }} />
      {label}
    </span>
  )
}

export default async function StudentDashboard({ user }: { user: any }) {
  const supabase = await createClient()

  // First get the student record corresponding to this user
  const { data: student } = await supabase
    .from('students')
    .select('id, full_name, roll_number')
    .eq('user_id', user.id)
    .single()

  if (!student) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <p className="page-eyebrow">Student Portal</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm mt-4" style={{ color: 'var(--accent-bad)' }}>
            Your account is not linked to a student record. Please contact an administrator.
          </p>
        </div>
      </div>
    )
  }

  // Get active enrollments so we know total classes
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id, classes(subject)')
    .eq('student_id', student.id)
    .eq('status', 'active')

  // Get all final attendance rows for this student
  const { data: attendance } = await supabase
    .from('final_attendance')
    .select('id, session_id, status, presence_score, class_sessions(scheduled_start, classes(subject))')
    .eq('student_id', student.id)
    .order('finalized_at', { ascending: false })
    .limit(50)

  // Get disputes filed by this student
  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, final_attendance_id, status')
    .eq('student_id', student.id)

  const disputeByAttendanceId = new Map(
    disputes?.map((d) => [d.final_attendance_id, d]) || []
  )

  const safeAttendance = attendance || []
  const presentCount = safeAttendance.filter((a) => a.status === 'present').length
  const totalCount = safeAttendance.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
  const activeDisputes = disputes?.filter((d) => d.status === 'pending').length || 0

  return (
    <div className="page-shell">
      <div className="page-inner" style={{ maxWidth: '56rem' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <p className="page-eyebrow">Student Portal</p>
            <h1 className="page-title text-2xl font-bold tracking-tight text-slate-900">Personal Attendance Record</h1>
            <p className="page-subtitle text-xs text-slate-500 mb-0">
              {user.full_name} &middot; <span className="font-mono font-semibold text-blue-600">{student.roll_number || 'CS2026-001'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge badge-good text-xs py-1 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Zero-Auth Student Verified
            </span>
          </div>
        </div>

        {/* Attendance Compliance Banner */}
        <div className="mb-8 p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-blue-900">Institutional Minimum Policy: 75% Required</div>
            <div className="text-[11px] text-blue-700 mt-0.5">
              Attendance is continuously calculated from classroom camera frames using ArcFace embeddings. Permitted exits recorded by faculty do not count against your presence score.
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${attendanceRate >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {attendanceRate >= 75 ? '✓ Good Standing' : '⚠️ Action Required'}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 mb-12 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4 py-5 border-b border-r first:border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl font-mono tabular-nums font-semibold" style={{ color: attendanceRate >= 75 ? 'var(--accent-good)' : 'var(--accent-warn)' }}>
              {attendanceRate}%
            </div>
            <div className="text-xs uppercase tracking-wide mt-2" style={{ color: 'var(--muted)' }}>
              Present Rate
            </div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--muted)' }}>
              % of finalized sessions marked present
            </div>
          </div>
          <div className="px-4 py-5 border-b border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl font-mono tabular-nums font-semibold" style={{ color: 'var(--foreground)' }}>
              {enrollments?.length || 0}
            </div>
            <div className="text-xs uppercase tracking-wide mt-2" style={{ color: 'var(--muted)' }}>
              Active Classes
            </div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--muted)' }}>
              classes you are enrolled in
            </div>
          </div>
          <div className="px-4 py-5 border-b border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl font-mono tabular-nums font-semibold" style={{ color: 'var(--foreground)' }}>
              {totalCount}
            </div>
            <div className="text-xs uppercase tracking-wide mt-2" style={{ color: 'var(--muted)' }}>
              Recorded Sessions
            </div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--muted)' }}>
              finalized sessions for your classes
            </div>
          </div>
          <div className="px-4 py-5 border-b border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl font-mono tabular-nums font-semibold" style={{ color: activeDisputes > 0 ? 'var(--accent-warn)' : 'var(--foreground)' }}>
              {activeDisputes}
            </div>
            <div className="text-xs uppercase tracking-wide mt-2" style={{ color: 'var(--muted)' }}>
              Pending Disputes
            </div>
            <div className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--muted)' }}>
              open dispute filings
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="flex items-center justify-between mb-4">
          <p className="page-eyebrow" style={{ marginBottom: 0 }}>Recent Sessions</p>
          {activeDisputes > 0 && (
            <Link href="/disputes" className="text-xs link-accent">
              View my disputes →
            </Link>
          )}
        </div>

        {safeAttendance.length === 0 ? (
          <p className="ledger-empty">No attendance records found.</p>
        ) : (
          <div className="ledger">
            <div className="ledger-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
              <div>Class & Date</div>
              <div>Status</div>
              <div>
                <div>Presence</div>
                <div className="text-[10px] normal-case font-normal">% time detected</div>
              </div>
              <div>Action</div>
            </div>
            {safeAttendance.map((a: any) => {
              const dispute = disputeByAttendanceId.get(a.id)

              return (
                <div key={a.id} className="ledger-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
                  <div>
                    <div className="text-sm font-medium">{a.class_sessions?.classes?.subject || '(no class)'}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {a.class_sessions?.scheduled_start ? new Date(a.class_sessions.scheduled_start).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <Badge label={a.status} variant={ATTENDANCE_BADGE[a.status] || 'badge-neutral'} />
                  </div>
                  <div className="text-sm font-mono" style={{ color: 'var(--muted)' }}>
                    {a.presence_score != null ? `${(a.presence_score * 100).toFixed(0)}%` : '—'}
                  </div>
                  <div>
                    {(() => {
                      if (dispute) {
                        return (
                          <span className="text-xs" style={{ color: dispute.status === 'pending' ? 'var(--accent-warn)' : 'var(--muted)' }}>
                            Dispute: {dispute.status}
                          </span>
                        )
                      }
                      
                      if (a.status !== 'present') {
                        return (
                          <details className="text-sm cursor-pointer">
                            <summary className="link-accent text-xs">File dispute</summary>
                            <form 
                              action={fileDispute.bind(null, a.id, a.session_id, student.id)} 
                              className="mt-2 flex items-center gap-2"
                            >
                              <input 
                                type="text" 
                                name="reason" 
                                placeholder="Reason for dispute..." 
                                required 
                                className="field-input-sm" 
                                style={{ width: '12rem' }}
                              />
                              <button type="submit" className="btn-primary-sm">Submit</button>
                            </form>
                          </details>
                        )
                      }

                      return <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
