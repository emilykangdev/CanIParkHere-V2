'use client'

import { useState, useEffect } from 'react'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import ParkingChatApp from './components/ParkingChatApp'
import ParkingMapView from './components/ParkingMapView'
import Sidebar from './components/Sidebar'

export default function Home() {
  const [showSidebar, setShowSidebar] = useState<boolean>(false)
  const [currentView, setCurrentView] = useState<'map' | 'chat'>('map')
  
  // Preserve scroll position when switching views
  const handleViewChange = (newView: 'map' | 'chat') => {
    // Store current scroll position
    const scrollY = window.scrollY
    
    // Change the view
    setCurrentView(newView)
    
    // Restore scroll position after a brief delay to allow re-render
    setTimeout(() => {
      window.scrollTo(0, scrollY)
    }, 0)
  }
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {currentView === 'map' ? (
        <ParkingMapView setShowSidebar={setShowSidebar} />
      ) : (
        <ParkingChatApp setShowSidebar={setShowSidebar} />
      )}
      
      <Sidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)}
        currentView={currentView}
        onViewChange={handleViewChange}
      />
    </main>
  )
}
