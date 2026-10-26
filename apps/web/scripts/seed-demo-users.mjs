import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// 1. Load env vars from .env.local if not already in process.env
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEFAULT_INSTITUTION_ID = '70881552-0663-494b-8b95-59cfdd5fb246'
const DEMO_PASSWORD = 'demoPassword123!'

const USERS_TO_SEED = [
  {
    email: 'admin@test.local',
    role: 'admin',
    fullName: 'Ansh Tomar (Admin)',
  },
  {
    email: 'teacher@test.local',
    role: 'teacher',
    fullName: 'Prof. Miller',
  },
  {
    email: 'student@test.local',
    role: 'student',
    fullName: 'Alex Smith',
    rollNumber: 'CS2026-001',
  },
]

async function main() {
  console.log(`Connecting to Supabase at ${supabaseUrl}...`)

  // Check connectivity
  try {
    const { data: instCheck, error: instErr } = await supabase
      .from('institutions')
      .select('id')
      .limit(1)

    if (instErr) {
      console.error('Database connection error:', instErr.message)
      console.log('NOTE: If your Supabase project is paused, please unpause it at https://supabase.com/dashboard.')
      process.exit(1)
    }
  } catch (err) {
    console.error('Network error connecting to Supabase:', err.message)
    console.log('NOTE: If your Supabase project is paused, please unpause it at https://supabase.com/dashboard.')
    process.exit(1)
  }

  // 1. Ensure Demo Institution exists
  console.log('Ensuring demo institution exists...')
  await supabase.from('institutions').upsert(
    {
      id: DEFAULT_INSTITUTION_ID,
      name: 'Test University',
      slug: 'test-university',
    },
    { onConflict: 'id' }
  )

  // 2. Fetch or create Auth users
  const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers()

  const createdAuthMap = {}

  for (const account of USERS_TO_SEED) {
    console.log(`\nConfiguring ${account.role} account: ${account.email}...`)
    let authUser = existingAuthUsers.find((u) => u.email === account.email)

    if (authUser) {
      const { data: updated } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: account.fullName, role: account.role },
        }
      )
      authUser = updated?.user || authUser
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, role: account.role },
      })
      if (createErr) {
        console.error(`  Failed to create auth user:`, createErr.message)
        continue
      }
      authUser = created.user
    }

    if (authUser) {
      createdAuthMap[account.email] = authUser.id

      // Upsert public.users
      await supabase.from('users').upsert(
        {
          id: authUser.id,
          institution_id: DEFAULT_INSTITUTION_ID,
          role: account.role,
          full_name: account.fullName,
        },
        { onConflict: 'id' }
      )
    }
  }

  // 3. Seed Students
  console.log('\nSeeding student directory...')
  const studentRows = [
    {
      institution_id: DEFAULT_INSTITUTION_ID,
      user_id: createdAuthMap['student@test.local'] || null,
      full_name: 'Alex Smith',
      roll_number: 'CS2026-001',
      status: 'active',
    },
    {
      institution_id: DEFAULT_INSTITUTION_ID,
      full_name: 'Rohan Kumar',
      roll_number: 'CS2026-002',
      status: 'active',
    },
    {
      institution_id: DEFAULT_INSTITUTION_ID,
      full_name: 'Akhil Sharma',
      roll_number: 'CS2026-003',
      status: 'active',
    },
    {
      institution_id: DEFAULT_INSTITUTION_ID,
      full_name: 'Priya Patel',
      roll_number: 'CS2026-004',
      status: 'active',
    },
    {
      institution_id: DEFAULT_INSTITUTION_ID,
      full_name: 'Vikram Rao',
      roll_number: 'CS2026-005',
      status: 'active',
    },
  ]

  const seededStudentIds = []
  for (const s of studentRows) {
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', DEFAULT_INSTITUTION_ID)
      .eq('roll_number', s.roll_number)
      .maybeSingle()

    if (existing) {
      seededStudentIds.push(existing.id)
      if (s.user_id) {
        await supabase.from('students').update({ user_id: s.user_id }).eq('id', existing.id)
      }
    } else {
      const { data: inserted } = await supabase.from('students').insert(s).select('id').single()
      if (inserted) seededStudentIds.push(inserted.id)
    }
  }

  // 4. Seed Room & Camera
  console.log('Seeding room and camera hardware...')
  let roomId = null
  const { data: roomCheck } = await supabase
    .from('rooms')
    .select('id')
    .eq('institution_id', DEFAULT_INSTITUTION_ID)
    .limit(1)

  if (roomCheck && roomCheck.length > 0) {
    roomId = roomCheck[0].id
  } else {
    const { data: newRoom } = await supabase
      .from('rooms')
      .insert({
        institution_id: DEFAULT_INSTITUTION_ID,
        name: 'Hall A - Turing Auditorium',
      })
      .select('id')
      .single()
    roomId = newRoom?.id
  }

  if (roomId) {
    const { data: camCheck } = await supabase
      .from('cameras')
      .select('id')
      .eq('room_id', roomId)
      .limit(1)

    if (!camCheck || camCheck.length === 0) {
      await supabase.from('cameras').insert({
        institution_id: DEFAULT_INSTITUTION_ID,
        room_id: roomId,
        host: '10.0.1.100',
        stream_path: 'rtsp://admin:pass@10.0.1.100:554/live',
        credential_ref: 'CAMERA_1_CREDS',
        label: 'Auditorium Ceiling Feed 01',
        is_active: true,
      })
    }
  }

  // 5. Seed Course Classes
  console.log('Seeding course classes & enrollments...')
  const teacherId = createdAuthMap['teacher@test.local'] || null

  let classId = null
  const { data: classCheck } = await supabase
    .from('classes')
    .select('id')
    .eq('institution_id', DEFAULT_INSTITUTION_ID)
    .eq('subject', 'CS301: Computer Vision & ArcFace AI')
    .maybeSingle()

  if (classCheck) {
    classId = classCheck.id
  } else if (roomId) {
    const { data: newClass } = await supabase
      .from('classes')
      .insert({
        institution_id: DEFAULT_INSTITUTION_ID,
        room_id: roomId,
        subject: 'CS301: Computer Vision & ArcFace AI',
        teacher_id: teacherId,
        recurrence: 'MON,WED,FRI 10:00-11:30',
        is_active: true,
      })
      .select('id')
      .single()
    classId = newClass?.id
  }

  // Enroll all students in this class
  if (classId && seededStudentIds.length > 0) {
    for (const sid of seededStudentIds) {
      await supabase.from('class_enrollments').upsert(
        {
          institution_id: DEFAULT_INSTITUTION_ID,
          class_id: classId,
          student_id: sid,
          status: 'active',
        },
        { onConflict: 'class_id,student_id' }
      )
    }
  }

  // 6. Seed a Live and a Finalized Class Session
  console.log('Seeding class sessions and attendance history...')
  if (classId) {
    // A) Live In-Progress Session
    const now = new Date()
    const scheduledStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const scheduledEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    const { data: liveSessionCheck } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('class_id', classId)
      .eq('status', 'in_progress')
      .maybeSingle()

    let liveSessionId = liveSessionCheck?.id
    if (!liveSessionId) {
      const { data: newLive } = await supabase
        .from('class_sessions')
        .insert({
          institution_id: DEFAULT_INSTITUTION_ID,
          class_id: classId,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          actual_start: scheduledStart,
          status: 'in_progress',
          processing_status: 'processing',
          camera_status: 'healthy',
        })
        .select('id')
        .single()
      liveSessionId = newLive?.id
    }

    // B) Finalized Session with rich attendance and a sample dispute
    const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const yesterdayEnd = new Date(now.getTime() - 22.5 * 60 * 60 * 1000).toISOString()

    const { data: finalizedCheck } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('class_id', classId)
      .eq('status', 'completed')
      .maybeSingle()

    let finalizedSessionId = finalizedCheck?.id
    if (!finalizedSessionId) {
      const { data: newFinalized } = await supabase
        .from('class_sessions')
        .insert({
          institution_id: DEFAULT_INSTITUTION_ID,
          class_id: classId,
          scheduled_start: yesterdayStart,
          scheduled_end: yesterdayEnd,
          actual_start: yesterdayStart,
          actual_end: yesterdayEnd,
          status: 'completed',
          processing_status: 'finalized',
          camera_status: 'healthy',
        })
        .select('id')
        .single()
      finalizedSessionId = newFinalized?.id
    }

    // Populate final_attendance for finalized session
    if (finalizedSessionId && seededStudentIds.length >= 3) {
      const attendanceStatuses = [
        { status: 'present', score: 0.94 },
        { status: 'present', score: 0.88 },
        { status: 'uncertain', score: 0.61 }, // triggers human review & dispute
        { status: 'present', score: 0.92 },
        { status: 'left_early', score: 0.45 },
      ]

      for (let i = 0; i < seededStudentIds.length; i++) {
        const studentId = seededStudentIds[i]
        const st = attendanceStatuses[i % attendanceStatuses.length]

        const { data: faRow } = await supabase
          .from('final_attendance')
          .upsert(
            {
              institution_id: DEFAULT_INSTITUTION_ID,
              session_id: finalizedSessionId,
              student_id: studentId,
              status: st.status,
              presence_score: st.score,
              finalized_at: yesterdayEnd,
            },
            { onConflict: 'session_id,student_id' }
          )
          .select('id')
          .single()

        // Create sample dispute for the uncertain student (Akhil Sharma)
        if (st.status === 'uncertain' && faRow) {
          await supabase.from('disputes').upsert(
            {
              institution_id: DEFAULT_INSTITUTION_ID,
              session_id: finalizedSessionId,
              student_id: studentId,
              final_attendance_id: faRow.id,
              reason: 'Present in the second row; lighting near the projector was dimmed for slides.',
              status: 'pending',
            },
            { onConflict: 'final_attendance_id' }
          )
        }
      }
    }
  }

  console.log('\n✅ Demo university environment seeded successfully!')
  console.log('----------------------------------------------------')
  console.log('Demo Accounts:')
  console.log('  👑 Admin:   admin@test.local   / ' + DEMO_PASSWORD)
  console.log('  👨‍🏫 Teacher: teacher@test.local / ' + DEMO_PASSWORD)
  console.log('  🎓 Student: student@test.local / ' + DEMO_PASSWORD + ' (Roll: CS2026-001)')
  console.log('----------------------------------------------------')
  console.log('Demo Highlights Created:')
  console.log('  • Hall A - Turing Auditorium with RTSP Camera')
  console.log('  • CS301: Computer Vision & ArcFace AI class')
  console.log('  • 5 Active enrolled students')
  console.log('  • 1 Live in-progress session with real-time stream monitor')
  console.log('  • 1 Finalized session with attendance rates and sample dispute')
}

main().catch((err) => {
  console.error('Fatal error seeding demo data:', err)
  process.exit(1)
})
