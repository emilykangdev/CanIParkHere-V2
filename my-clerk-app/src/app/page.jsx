'use client'

import { useState } from 'react'
import ParkingChatApp from './components/ParkingChatApp'
import ParkingMapView from './components/ParkingMapView'
import Sidebar from './components/Sidebar'

export default function Home() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [currentView, setCurrentView] = useState('map') // 'map' or 'chat'
  
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
        onViewChange={setCurrentView}
      />
    </main>
  )
}
