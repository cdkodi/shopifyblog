'use client'

import Link from 'next/link'
import { Home, FileText, Target, Settings, BookOpen, Edit3, LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from './button'

export function Navigation() {
  const { user, signOut, loading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Shopify Blog CMS
              </Link>
            </div>
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
                <Link
                  href="/topics"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Topics
                </Link>
                
                {/* Temporarily hidden - use Topics Generate button instead */}
                {/*
                <Link
                  href="/content-generation"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Content Generation
                </Link>
                */}
                
                <Link
                  href="/articles"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Articles
                </Link>
                <Link
                  href="/editorial"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editorial
                </Link>
                <Link
                  href="/demo-form"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors border-b-2 border-blue-600"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Form Demo
                </Link>
              </div>
            )}
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center text-sm text-gray-700">
                  <User className="h-4 w-4 mr-2" />
                  {user.email}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              !loading && (
                <Link href="/login">
                  <Button variant="default" size="sm">
                    Sign In
                  </Button>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 