'use client'
import { Menu } from 'lucide-react'
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function Header({ showMenu = true, onMenuClick }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-200 to-blue-300 p-4 flex items-center justify-between shadow-md z-10">
      <div className="flex items-center gap-2">
        <div className="text-2xl">🅿️</div>
        <div>
          <h1 className="font-bold text-lg">CanIParkHere</h1>
          <p className="text-sm opacity-80">Parking Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SignedOut>
          <SignInButton className="px-3 py-1 bg-white/70 rounded-md text-sm hover:bg-white transition" />
          <SignUpButton className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition" />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        {showMenu && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full bg-white/50 hover:bg-white/70 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}