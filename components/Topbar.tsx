'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'

export default function Topbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 flex items-center justify-between px-6">
      <div></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  )
}


