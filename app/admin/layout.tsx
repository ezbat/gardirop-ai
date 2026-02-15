'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setLoading(false)
      setIsAdmin(true)
      return
    }

    checkAdminAccess()
  }, [pathname])

  const checkAdminAccess = async () => {
    try {
      // Check for admin token in localStorage
      const adminToken = localStorage.getItem('admin_token')
      const adminUser = localStorage.getItem('admin_user')

      if (!adminToken || !adminUser) {
        router.push('/admin/login')
        return
      }

      // Verify token
      try {
        const tokenData = JSON.parse(atob(adminToken))
        const tokenAge = Date.now() - tokenData.timestamp

        // Token expires after 24 hours
        if (tokenAge > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          alert('Session expired. Please login again.')
          router.push('/admin/login')
          return
        }

        const user = JSON.parse(adminUser)
        if (user.role !== 'admin' || user.username !== 'm3000') {
          throw new Error('Invalid admin user')
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('Invalid token:', error)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-primary">
                Admin Panel
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/features"
                  className="px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
                >
                  Features ⭐
                </Link>
                <Link
                  href="/admin/sellers"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Sellers
                </Link>
                <Link
                  href="/admin/products"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Products
                </Link>
                <Link
                  href="/admin/outfits"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Outfits
                </Link>
                <Link
                  href="/admin/users"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Users
                </Link>
                <Link
                  href="/admin/support"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Support
                </Link>
                <Link
                  href="/admin/finances"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Finances
                </Link>
                <Link
                  href="/admin/withdrawals"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Withdrawals
                </Link>
                <Link
                  href="/admin/requests"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Requests
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
              >
                Back to Site
              </Link>
              {pathname !== '/admin/login' && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
