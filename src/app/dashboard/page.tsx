import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import SeekerDashboard from "@/components/dashboard/seeker-dashboard"
import ProviderDashboard from "@/components/dashboard/provider-dashboard"
import AdminDashboard from "@/components/dashboard/admin-dashboard"

export default async function DashboardPage() {
  const headersList = await headers()
  const request = {
    headers: {
      get: (name: string) => headersList.get(name)
    }
  } as any

  const user = await getCurrentUser(request)

  if (!user) {
    redirect("/auth/login")
  }

  const userRole = user.role
  const companyId = user.companyId

  // Route to appropriate dashboard based on user role
  if (userRole === 'admin') {
    return <AdminDashboard userId={user.id} />
  } else if (userRole === 'company') {
    // For companies, default to seeker dashboard
    return <SeekerDashboard companyId={companyId || ''} />
  } else if (userRole === 'talent') {
    return <ProviderDashboard talentProfileId={user.id} />
  }

  // Fallback to seeker dashboard
  return <SeekerDashboard companyId={companyId || ''} />
}