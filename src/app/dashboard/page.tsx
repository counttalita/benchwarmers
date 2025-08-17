import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to BenchWarmers Dashboard
          </h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-700">User Information</h2>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Name:</span> {session.user.name}</p>
                <p><span className="font-medium">Phone:</span> {session.user.phoneNumber}</p>
                <p><span className="font-medium">Role:</span> {session.user.role}</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-700">Company Information</h2>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Company:</span> {session.user.company.name}</p>
                <p><span className="font-medium">Type:</span> {session.user.company.type}</p>
                <p><span className="font-medium">Status:</span> {session.user.company.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}