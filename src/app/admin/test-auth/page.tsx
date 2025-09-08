'use client'

import { useState, useEffect } from 'react'
import { simpleAuth } from '@/lib/simple-auth'

export default function TestAuthPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  useEffect(() => {
    // Test authentication functions
    const isAuth = simpleAuth.isAuthenticated()
    const session = simpleAuth.getCurrentSession()
    const info = simpleAuth.getSessionInfo()

    setAuthState({
      isAuthenticated: isAuth,
      currentSession: session,
      timestamp: new Date().toISOString()
    })
    
    setSessionInfo(info)
  }, [])

  const testLogin = () => {
    const result = simpleAuth.login('admin@spa.com', 'dermal123')
    
    if (result.success) {
      // Update state
      setAuthState({
        isAuthenticated: true,
        currentSession: result.session,
        timestamp: new Date().toISOString()
      })
      setSessionInfo(simpleAuth.getSessionInfo())
    }
  }

  const testLogout = () => {
    simpleAuth.logout()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Authentication System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication State */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Authentication State</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        {/* Session Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Session Information</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mt-6 flex space-x-4">
        <button
          onClick={testLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Login (admin@spa.com / dermal123)
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Refresh Page
        </button>
        
        <button
          onClick={testLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Logout
        </button>
      </div>

      {/* Hardcoded Credentials Info */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800">Test Credentials</h3>
        <p className="text-yellow-700 mt-1">
          Email: <code>admin@spa.com</code>
        </p>
        <p className="text-yellow-700">
          Password: <code>dermal123</code>
        </p>
      </div>
    </div>
  )
}