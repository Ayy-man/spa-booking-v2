'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Activity, Lock, TrendingUp, Users } from 'lucide-react'

interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  suspiciousActivities: number
  failedLogins: number
  activeThreats: string[]
  recentAlerts: Array<{
    timestamp: string
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }>
}

/**
 * Security Monitoring Dashboard
 * Non-intrusive monitoring that doesn't affect existing functionality
 */
export default function SecurityMonitorPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousActivities: 0,
    failedLogins: 0,
    activeThreats: [],
    recentAlerts: []
  })
  
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchSecurityMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityMetrics, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  const fetchSecurityMetrics = async () => {
    try {
      // In production, this would fetch from your monitoring API
      // For now, using mock data that doesn't break anything
      const mockData: SecurityMetrics = {
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        blockedRequests: Math.floor(Math.random() * 100),
        suspiciousActivities: Math.floor(Math.random() * 20),
        failedLogins: Math.floor(Math.random() * 10),
        activeThreats: [],
        recentAlerts: [
          {
            timestamp: new Date().toISOString(),
            type: 'RATE_LIMIT',
            message: 'Rate limit exceeded from IP 192.168.1.1',
            severity: 'medium'
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: 'FAILED_AUTH',
            message: 'Multiple failed login attempts',
            severity: 'high'
          }
        ]
      }
      
      setMetrics(mockData)
    } catch (error) {
      console.error('Failed to fetch security metrics:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getMetricStatus = (value: number, threshold: number) => {
    if (value > threshold) return 'text-red-600'
    if (value > threshold * 0.5) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Security Monitor</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            {/* Auto Refresh Toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-gray-600">Auto refresh</span>
            </label>
          </div>
        </div>
        
        {/* Status Banner */}
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          metrics.activeThreats.length > 0 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {metrics.activeThreats.length > 0 ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Active threats detected</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span className="font-medium">System secure - No active threats</span>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-500">{timeRange}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.totalRequests.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total Requests</p>
        </div>

        {/* Blocked Requests */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-6 h-6 text-red-400" />
            <span className={`text-2xl font-bold ${getMetricStatus(metrics.blockedRequests, 50)}`}>
              {metrics.blockedRequests}
            </span>
          </div>
          <p className="text-sm text-gray-600">Blocked Requests</p>
          <p className="text-xs text-gray-500 mt-1">
            {((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(2)}% of total
          </p>
        </div>

        {/* Suspicious Activities */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <span className={`text-2xl font-bold ${getMetricStatus(metrics.suspiciousActivities, 10)}`}>
              {metrics.suspiciousActivities}
            </span>
          </div>
          <p className="text-sm text-gray-600">Suspicious Activities</p>
          <p className="text-xs text-gray-500 mt-1">Potential threats detected</p>
        </div>

        {/* Failed Logins */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Lock className="w-6 h-6 text-orange-400" />
            <span className={`text-2xl font-bold ${getMetricStatus(metrics.failedLogins, 5)}`}>
              {metrics.failedLogins}
            </span>
          </div>
          <p className="text-sm text-gray-600">Failed Logins</p>
          <p className="text-xs text-gray-500 mt-1">Authentication failures</p>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Alerts</h2>
        
        {metrics.recentAlerts.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'high' 
                    ? 'border-red-200 bg-red-50' 
                    : alert.severity === 'medium'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent security alerts</p>
        )}
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Security Best Practices</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Monitor this dashboard regularly for suspicious activities</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Investigate all high-severity alerts immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Keep track of failed login attempts to detect brute force attacks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Review blocked requests to identify attack patterns</span>
          </li>
        </ul>
      </div>
    </div>
  )
}