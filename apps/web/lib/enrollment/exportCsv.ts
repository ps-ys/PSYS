'use server'

import { getAccessToken } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function getSessionExportCsv(sessionId: string) {
  const cameraServiceUrl =
    process.env.CAMERA_SERVICE_URL || 'https://psys-camera-service.onrender.com'

  // Attempt fast camera-service microservice export
  try {
    const token = await getAccessToken()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)

    const response = await fetch(`${cameraServiceUrl}/sessions/${sessionId}/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (response.ok) {
      return await response.text()
    }
  } catch {
    // If microservice is cold-starting or unavailable, fallback directly to Supabase
  }

  // Resilient fallback: direct Supabase query (zero downtime guarantee)
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('final_attendance')
    .select('student_id, status, presence_score, exception_applied, finalized_at, students(full_name, roll_number)')
    .eq('session_id', sessionId)
    .order('student_id')

  if (error) {
    throw new Error(`Failed to export CSV: ${error.message}`)
  }

  const lines = ['Student,Roll Number,Status,Presence Score,Exception Applied,Finalized At']
  for (const row of rows || []) {
    const student = (row as any).students
    lines.push(
      `"${student?.full_name || row.student_id}","${student?.roll_number || ''}","${row.status}","${row.presence_score ?? ''}","${row.exception_applied ? 'Yes' : 'No'}","${row.finalized_at || ''}"`
    )
  }
  return lines.join('\n')
}
