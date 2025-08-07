'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { simpleAuth } from '@/lib/simple-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    // Check if user is already authenticated
    if (simpleAuth.isAuthenticated()) {
      router.push(redirectTo)
    }

    // Show error messages from URL params
    if (errorParam === 'unauthorized') {
      setError('Access denied. Please log in to continue.')
    } else if (errorParam === 'session_expired') {
      setError('Your session has expired. Please log in again.')
    }
  }, [router, redirectTo, errorParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = simpleAuth.login(email, password)
      
      if (result.success && result.session) {
        // Store session in cookie for middleware
        const sessionData = encodeURIComponent(JSON.stringify(result.session))
        document.cookie = `spa-admin-session=${sessionData}; path=/; max-age=${24 * 60 * 60}` // 24 hours
        
        setMessage('Login successful! Redirecting...')
        
        // Small delay to show success message
        setTimeout(() => {
          router.push(redirectTo)
        }, 1000)
      } else {
        setError(result.error || 'Login failed. Please try again.')
      }
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <a 
            href="https://dermalskinclinicspa.com" 
            className="text-sm text-primary hover:text-primary-dark transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            ← Return to Main Website
          </a>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access the admin panel
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}
              
              {message && (
                <Alert className="bg-green-50 text-green-700 border-green-200">
                  {message}
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1"
                    placeholder="admin@spa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                <p>
                  Use your admin credentials to access the admin panel.
                </p>
                <p className="mt-2 text-xs">
                  For access issues, contact your administrator.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>
            Dermal Skin Clinic and Spa Guam - Admin Panel
          </p>
          <p>
            Protected by authentication. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  )
}