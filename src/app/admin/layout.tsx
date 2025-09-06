'use client'

import { useEffect, useState } from 'react'
import { simpleAuth } from '@/lib/simple-auth'
import { NotificationBell } from '@/components/admin/notification-bell'
import { Toaster } from '@/components/ui/toaster'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a 
              href="/admin"
              className="text-xl font-semibold text-gray-900 hover:text-primary transition-colors"
            >
              Admin Panel
            </a>
            <div className="flex items-center space-x-4">
              <a 
                href="https://dermalskinclinicspa.com" 
                className="text-sm text-gray-600 hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                🌐 Main Website
              </a>
              <a 
                href="/" 
                className="text-sm text-gray-600 hover:text-primary transition-colors"
              >
                📅 Booking System
              </a>
              <div className="flex items-center space-x-3 border-l border-gray-300 pl-4">
                {/* Only show NotificationBell when user is authenticated */}
                {sessionInfo && <NotificationBell />}
                {sessionInfo && (
                  <span className="text-xs text-gray-500">
                    Logged in as {sessionInfo.email}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors font-medium"
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
      
      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  )
}