'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/** Standard email & password login */
export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}

/** Zero-Auth Instant Demo Login for reviewers & recruiters */
export async function loginAsDemo(role: 'admin' | 'teacher' | 'student') {
  const accounts: Record<string, { email: string; pass: string }> = {
    admin: { email: 'admin@test.local', pass: 'demoPassword123!' },
    teacher: { email: 'teacher@test.local', pass: 'demoPassword123!' },
    student: { email: 'student@test.local', pass: 'demoPassword123!' },
  }

  const account = accounts[role] || accounts.admin
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.pass,
  })

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Demo login error: ${error.message}. Please ensure the Supabase project is active.`
      )}`
    )
  }

  redirect('/')
}

/** Zero-Auth Passwordless Login for Students via Roll Number */
export async function loginByRollNumber(formData: FormData) {
  const roll = (formData.get('roll_number') as string)?.trim()
  if (!roll) {
    redirect('/login?error=Please+enter+a+valid+Student+Roll+Number')
  }

  const supabase = await createClient()

  // Sign in as the registered demo student
  const { error } = await supabase.auth.signInWithPassword({
    email: 'student@test.local',
    password: 'demoPassword123!',
  })

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Student access error: ${error.message}. Please ensure the database is active.`
      )}`
    )
  }

  redirect('/')
}

/** Sign out */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
