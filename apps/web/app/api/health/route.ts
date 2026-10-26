import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      web: 'healthy',
      database: 'unknown',
      cameraService: 'unknown',
    },
  }

  // 1. Supabase Keep-Alive & Health Check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && anonKey) {
    try {
      const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
      })
      const { data, error } = await client.from('institutions').select('id').limit(1)
      if (error) {
        result.services.database = `error: ${error.message}`
      } else {
        result.services.database = 'healthy'
      }
    } catch (err: any) {
      result.services.database = `exception: ${err.message}`
    }
  } else {
    result.services.database = 'missing_credentials'
  }

  // 2. Camera Microservice Keep-Alive & Health Check
  const cameraServiceUrl =
    process.env.CAMERA_SERVICE_URL || 'https://psys-camera-service.onrender.com'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${cameraServiceUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (res.ok) {
      result.services.cameraService = 'healthy'
    } else {
      result.services.cameraService = `status_${res.status}`
    }
  } catch (err: any) {
    result.services.cameraService = `unreachable: ${err.message}`
  }

  return NextResponse.json(result)
}
