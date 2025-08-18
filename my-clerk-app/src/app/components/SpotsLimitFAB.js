import { useState, useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react' // or any icon you like

export default function SpotsLimitFAB({ spotsLimit, setSpotsLimit }) {
  const [open, setOpen] = useState(false)

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('spotsLimit')
    if (saved) setSpotsLimit(Number(saved))
  }, [setSpotsLimit])

  // Save preference
  useEffect(() => {
    localStorage.setItem('spotsLimit', spotsLimit)
  }, [spotsLimit])

  return (
    <div className="fixed bottom-36 right-4 z-50">
      {/* FAB */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition mb-5"
      >
        <SlidersHorizontal className="w-6 h-6" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {[5, 10, 20].map((num) => (
            <button
              key={num}
              onClick={() => {
                setSpotsLimit(num)
                setOpen(false)
              }}
              className={`block w-full px-4 py-2 text-left text-black hover:bg-gray-100 ${
                spotsLimit === num ? 'bg-gray-200 font-bold' : ''
              }`}
            >
              Show {num}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}