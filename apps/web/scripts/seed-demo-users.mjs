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
    fullName: 'System Admin',
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
      console.log('NOTE: If your Supabase project is paused, unpause it from https://supabase.com/dashboard.')
      process.exit(1)
    }
  } catch (err) {
    console.error('Network / fetch error connecting to Supabase:', err.message)
    console.log('NOTE: If your Supabase project is paused, unpause it from https://supabase.com/dashboard.')
    process.exit(1)
  }

  // 1. Ensure Demo Institution exists
  console.log('Ensuring demo institution exists...')
  const { error: upsertInstErr } = await supabase.from('institutions').upsert(
    {
      id: DEFAULT_INSTITUTION_ID,
      name: 'Test University',
      slug: 'test-university',
    },
    { onConflict: 'id' }
  )
  if (upsertInstErr) {
    console.warn('Warning inserting institution:', upsertInstErr.message)
  }

  // 2. Fetch existing auth users
  const { data: { users: existingAuthUsers }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Failed to list auth users:', listErr.message)
    process.exit(1)
  }

  for (const account of USERS_TO_SEED) {
    console.log(`\nConfiguring ${account.role} account: ${account.email}...`)
    let authUser = existingAuthUsers.find((u) => u.email === account.email)

    if (authUser) {
      console.log(`  Updating password for existing user ${authUser.id}...`)
      const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: account.fullName, role: account.role },
        }
      )
      if (updateErr) {
        console.error(`  Failed to update password:`, updateErr.message)
      } else {
        authUser = updated.user
      }
    } else {
      console.log(`  Creating new auth user...`)
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

    if (!authUser) continue

    // 3. Upsert public.users
    console.log(`  Upserting public.users record...`)
    const { error: userErr } = await supabase.from('users').upsert(
      {
        id: authUser.id,
        institution_id: DEFAULT_INSTITUTION_ID,
        role: account.role,
        full_name: account.fullName,
      },
      { onConflict: 'id' }
    )
    if (userErr) {
      console.error(`  Failed to upsert public.users:`, userErr.message)
    }

    // 4. If student, ensure student profile exists
    if (account.role === 'student') {
      console.log(`  Ensuring students table record...`)
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (!existingStudent) {
        const { error: studentErr } = await supabase.from('students').insert({
          institution_id: DEFAULT_INSTITUTION_ID,
          user_id: authUser.id,
          full_name: account.fullName,
          roll_number: account.rollNumber || 'CS2026-001',
          status: 'active',
        })
        if (studentErr) {
          console.warn(`  Warning creating student record:`, studentErr.message)
        } else {
          console.log(`  Created student record for ${account.fullName}`)
        }
      }
    }
  }

  console.log('\n✅ Demo accounts verified successfully!')
  console.log('Credentials:')
  console.log('  Admin:   admin@test.local   / ' + DEMO_PASSWORD)
  console.log('  Teacher: teacher@test.local / ' + DEMO_PASSWORD)
  console.log('  Student: student@test.local / ' + DEMO_PASSWORD)
}

main().catch((err) => {
  console.error('Fatal error seeding demo users:', err)
  process.exit(1)
})
