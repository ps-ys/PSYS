'use server'

import { getCurrentUser, getAccessToken } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function fileDispute(
  finalAttendanceId: string,
  sessionId: string,
  studentId: string,
  formData: FormData
) {
  const reason = (formData.get('reason') as string)?.trim()
  const user = await getCurrentUser()
  const cameraServiceUrl =
    process.env.CAMERA_SERVICE_URL || 'https://psys-camera-service.onrender.com'

  // Attempt FastAPI camera-service dispute endpoint
  let microserviceSucceeded = false
  try {
    const token = await getAccessToken()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${cameraServiceUrl}/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institution_id: user.institution_id,
        final_attendance_id: finalAttendanceId,
        session_id: sessionId,
        student_id: studentId,
        reason: reason || null,
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (response.ok) {
      microserviceSucceeded = true
    }
  } catch {
    // Microservice unavailable or timed out; proceed to resilient direct database insert
  }

  if (!microserviceSucceeded) {
    const supabase = await createClient()

    // 1. Fetch best available evidence photo
    const { data: obs } = await supabase
      .from('attendance_observations')
      .select('evidence_photo_url')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .not('evidence_photo_url', 'is', null)
      .order('quality_score', { ascending: false })
      .limit(1)

    const evidenceUrl = obs?.[0]?.evidence_photo_url || null

    // 2. Insert into disputes table
    const { error: disputeErr } = await supabase.from('disputes').insert({
      institution_id: user.institution_id,
      final_attendance_id: finalAttendanceId,
      student_id: studentId,
      reason: reason || null,
      evidence_photo_url: evidenceUrl,
      status: 'pending',
    })

    if (disputeErr) {
      throw new Error(`Failed to file dispute: ${disputeErr.message}`)
    }
  }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath('/') // To update student dashboard if filed from there
}

export async function resolveDispute(
  disputeId: string,
  sessionId: string,
  formData: FormData
) {
  const status = formData.get('status') as string
  const resolvedStatus = (formData.get('resolved_status_for_attendance') as string) || null
  const user = await getCurrentUser()
  const cameraServiceUrl =
    process.env.CAMERA_SERVICE_URL || 'https://psys-camera-service.onrender.com'

  let microserviceSucceeded = false
  try {
    const token = await getAccessToken()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${cameraServiceUrl}/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        resolved_status_for_attendance: resolvedStatus || null,
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (response.ok) {
      microserviceSucceeded = true
    }
  } catch {
    // Proceed to direct database resolution fallback
  }

  if (!microserviceSucceeded) {
    const supabase = await createClient()

    // Fetch dispute details
    const { data: dispute, error: fetchErr } = await supabase
      .from('disputes')
      .select('institution_id, final_attendance_id, status')
      .eq('id', disputeId)
      .single()

    if (fetchErr || !dispute) {
      throw new Error('Dispute not found')
    }

    // Update dispute status
    const { error: updateErr } = await supabase
      .from('disputes')
      .update({
        status,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)

    if (updateErr) {
      throw new Error(`Failed to resolve dispute: ${updateErr.message}`)
    }

    // Log resolution to audit_logs
    await supabase.from('audit_logs').insert({
      institution_id: dispute.institution_id,
      actor_user_id: user.id,
      action: 'dispute_resolved',
      entity_type: 'dispute',
      entity_id: disputeId,
      metadata: { old_status: dispute.status, new_status: status },
    })

    // If approved and status correction requested, update final_attendance
    if (status === 'approved' && resolvedStatus && dispute.final_attendance_id) {
      await supabase
        .from('final_attendance')
        .update({ status: resolvedStatus })
        .eq('id', dispute.final_attendance_id)

      await supabase.from('audit_logs').insert({
        institution_id: dispute.institution_id,
        actor_user_id: user.id,
        action: 'dispute_approved_attendance_corrected',
        entity_type: 'final_attendance',
        entity_id: dispute.final_attendance_id,
        metadata: { corrected_to: resolvedStatus },
      })
    }
  }

  revalidatePath(`/sessions/${sessionId}`)
}
