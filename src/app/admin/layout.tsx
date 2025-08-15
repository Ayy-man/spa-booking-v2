'use client'

import { useEffect, useState } from 'react'
import { simpleAuth } from '@/lib/simple-auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  useEffect(() => {
    // Get session info for display
    const info = simpleAuth.getSessionInfo()
    setSessionInfo(info)
  }, [])

  const handleLogout = () => {
    // Clear session and cookie
    simpleAuth.clearSession()
    document.cookie = 'spa-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Redirect to login
    window.location.href = '/admin/login'
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a 
              href="/admin"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-primary dark:hover:text-primary-light transition-colors"
            >
              Admin Panel
            </a>
            <div className="flex items-center space-x-4">
              <a 
                href="https://dermalskinclinicspa.com" 
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                🌐 Main Website
              </a>
              <a 
                href="/" 
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors"
              >
                📅 Booking System
              </a>
              <ThemeToggle />
              <div className="flex items-center space-x-3 border-l border-gray-300 dark:border-gray-600 pl-4">
                {sessionInfo && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Logged in as {sessionInfo.email}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}