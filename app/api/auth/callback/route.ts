import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log(`\n[API GET] 🚀 /api/auth/callback - START`)
    console.log(`[API GET] 📍 URL: ${request.url}`)
    
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    console.log(`[API GET] 🔍 Query parameters:`)
    console.log(`[API GET]   - code: ${code ? '***PRESENT***' : 'N/A'}`)
    console.log(`[API GET]   - origin: ${origin}`)

    if (code) {
      console.log(`[API GET] 🔐 Exchanging code for session...`)
      const supabase = await createClient()
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error(`[API GET] ❌ Session exchange error:`)
        console.error(`[API GET]   - Message: ${error.message}`)
        console.error(`[API GET]   - Status: ${error.status || 'N/A'}`)
        console.error(`[API GET] ⚠️  Continuing with redirect despite error`)
      } else {
        console.log(`[API GET] ✅ Session exchange successful`)
        if (data?.user) {
          console.log(`[API GET] 👤 User authenticated: ${data.user.id}`)
          console.log(`[API GET]   - Email: ${data.user.email || 'N/A'}`)
        }
        if (data?.session) {
          console.log(`[API GET] 🔑 Session created`)
          console.log(`[API GET]   - Access token: ${data.session.access_token ? '***PRESENT***' : 'N/A'}`)
          console.log(`[API GET]   - Expires at: ${data.session.expires_at || 'N/A'}`)
        }
      }
    } else {
      console.log(`[API GET] ⚠️  No code parameter, skipping session exchange`)
    }

    const redirectUrl = `${origin}/dashboard`
    console.log(`[API GET] 🔀 Redirecting to: ${redirectUrl}`)
    
    const duration = Date.now() - startTime
    console.log(`[API GET] ⏱️  Duration: ${duration}ms`)
    console.log(`[API GET] ✅ END\n`)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API GET] ❌ Unhandled error after ${duration}ms`)
    console.error(`[API GET] ❌ Error:`, error)
    if (error instanceof Error) {
      console.error(`[API GET] ❌ Message: ${error.message}`)
      console.error(`[API GET] ❌ Stack: ${error.stack}`)
    }
    console.error(`[API GET] ✅ END\n`)
    
    const requestUrl = new URL(request.url)
    const origin = requestUrl.origin
    return NextResponse.redirect(`${origin}/dashboard`)
  }
}

