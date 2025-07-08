import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Get auth token from cookies
  const token = req.cookies.get('supabase-auth-token')?.value
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth']
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Allow API routes to handle their own auth
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  // If user is not authenticated and trying to access protected route
  if (!token && !isPublicRoute && !isApiRoute) {
    // Redirect to login page
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access login/signup
  if (token && isPublicRoute) {
    // Redirect to dashboard
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 