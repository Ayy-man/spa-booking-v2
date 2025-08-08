'use client'

import { useEffect, useState } from 'react'
import { simpleAuth } from '@/lib/simple-auth'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50
                        backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a 
              href="/admin" 
              className="text-xl font-semibold text-gray-900 hover:text-primary 
                       transition-all duration-300 ease-out cursor-pointer
                       hover:scale-105 active:scale-95
                       motion-reduce:transition-colors motion-reduce:hover:transform-none"
              title="Back to Admin Dashboard"
            >
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent
                             hover:from-primary-dark hover:to-primary transition-all duration-300">
                Admin Panel
              </span>
            </a>
            
            <div className="flex items-center space-x-2">
              <a 
                href="/admin/debug-booking" 
                className="px-3 py-2 text-sm text-gray-600 hover:text-primary 
                         transition-all duration-300 ease-out rounded-lg
                         hover:bg-gray-50 hover:shadow-sm hover:scale-105
                         active:scale-95 motion-reduce:hover:transform-none
                         group"
              >
                <span className="flex items-center gap-2">
                  <span className="transition-transform duration-300 group-hover:rotate-12">🔧</span>
                  Debug Booking
                </span>
              </a>
              
              <a 
                href="https://dermalskinclinicspa.com" 
                className="px-3 py-2 text-sm text-gray-600 hover:text-primary 
                         transition-all duration-300 ease-out rounded-lg
                         hover:bg-gray-50 hover:shadow-sm hover:scale-105
                         active:scale-95 motion-reduce:hover:transform-none
                         group"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="flex items-center gap-2">
                  <span className="transition-transform duration-300 group-hover:scale-110">🌐</span>
                  Main Website
                </span>
              </a>
              
              <a 
                href="/" 
                className="px-3 py-2 text-sm text-gray-600 hover:text-primary 
                         transition-all duration-300 ease-out rounded-lg
                         hover:bg-gray-50 hover:shadow-sm hover:scale-105
                         active:scale-95 motion-reduce:hover:transform-none
                         group"
              >
                <span className="flex items-center gap-2">
                  <span className="transition-transform duration-300 group-hover:scale-110">📅</span>
                  Booking System
                </span>
              </a>
              
              <div className="flex items-center space-x-3 border-l border-gray-300 pl-4 ml-2">
                {sessionInfo && (
                  <div className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/20 
                                rounded-full border border-primary/20">
                    <span className="text-xs text-primary-dark font-medium">
                      {sessionInfo.email}
                    </span>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-red-600 hover:text-white font-medium
                           transition-all duration-300 ease-out rounded-lg
                           hover:bg-red-600 hover:shadow-lg hover:shadow-red-200/40
                           hover:scale-105 active:scale-95
                           motion-reduce:hover:transform-none
                           group"
                >
                  <span className="flex items-center gap-2">
                    <span className="transition-transform duration-300 group-hover:scale-110">🚪</span>
                    Logout
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8
                     animate-in fade-in duration-500 slide-in-from-bottom-4">
        <div className="motion-reduce:animate-none">
          {children}
        </div>
      </main>
    </div>
  )
}