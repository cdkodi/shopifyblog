'use client'

import { useAuth } from '@/lib/auth-context'
import { AuthLoading } from './auth-loading'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <AuthLoading />
  }

  if (!user) {
    return <AuthLoading />
  }

  return <>{children}</>
} 