'use client'

import { useState } from 'react'

export default function SaveParkingToast({ onSave, onCancel, visible }) {
  const [note, setNote] = useState('')

  return (
    <div className={`w-[80vw] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 ${visible ? 'animate-enter' : 'animate-leave'}`}>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Save Parking</div>
      <input
        type="text"
        placeholder="Add a note (optional): e.g., P2 near elevator"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-3 focus:outline-none"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(note)}
          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Save
        </button>
      </div>
    </div>
  )
}


