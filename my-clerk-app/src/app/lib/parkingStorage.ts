'use client'

import { db } from './firebase'
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  startAfter as qStartAfter,
} from 'firebase/firestore'

/**
 * @typedef {Object} ParkingEntryInput
 * @property {number} lat
 * @property {number} lng
 * @property {string=} address
 * @property {'poi'|'gps'} source
 * @property {string=} note
 */

/**
 * @typedef {Object} ParkingEntry
 * @property {string} id
 * @property {number} lat
 * @property {number} lng
 * @property {string=} address
 * @property {string} savedAtISO
 * @property {'poi'|'gps'} source
 * @property {string=} note
 * @property {string=} photoUrl
 */

const nowIso = () => new Date().toISOString()

function userHistoryColRef(userId) {
  return collection(db, 'users', userId, 'history')
}

function lastParkedDocRef(userId) {
  return doc(db, 'users', userId, 'lastParked', 'current')
}

/**
 * Append a parking entry under users/{userId}/history and update users/{userId}/lastParked/current pointer.
 * Uses merge semantics for the singleton doc to avoid overwriting unrelated fields.
 * @param {string} userId
 * @param {ParkingEntryInput} entry
 * @returns {Promise<{entryId: string}>}
 */
export async function addParkingEntry(userId, entry) {
  if (!userId) throw new Error('addParkingEntry: userId is required')
  if (typeof entry?.lat !== 'number' || typeof entry?.lng !== 'number') {
    throw new Error('addParkingEntry: lat/lng must be numbers')
  }

  const payload = {
    lat: entry.lat,
    lng: entry.lng,
    address: entry.address ?? null,
    savedAtISO: nowIso(),
    source: entry.source,
    note: entry.note ?? null,
    photoUrl: null,
  }

  // Create history entry
  const historyCol = userHistoryColRef(userId)
  const created = await addDoc(historyCol, payload)

  // Update last parked pointer + denorm cache
  const lpRef = lastParkedDocRef(userId)
  await setDoc(
    lpRef,
    {
      entryId: created.id,
      entryPath: `users/${userId}/history/${created.id}`,
      denorm: {
        lat: payload.lat,
        lng: payload.lng,
        address: payload.address,
        savedAtISO: payload.savedAtISO,
      },
      updatedAtISO: nowIso(),
    },
    { merge: true }
  )

  return { entryId: created.id }
}

/**
 * Get the last parked pointer with denormalized snapshot.
 * Optionally dereference the history document for full details.
 * @param {string} userId
 * @param {Object=} options
 * @param {boolean=} options.resolveHistory If true, also fetch the history document referenced by entryId
 */
export async function getLastParked(userId, options = {}) {
  if (!userId) throw new Error('getLastParked: userId is required')
  const snap = await getDoc(lastParkedDocRef(userId))
  if (!snap.exists()) return null
  const data = snap.data()

  if (!options.resolveHistory) return data

  if (!data.entryId) return { pointer: data, history: null }
  const histSnap = await getDoc(doc(db, 'users', userId, 'history', data.entryId))
  return { pointer: data, history: histSnap.exists() ? { id: histSnap.id, ...histSnap.data() } : null }
}

/**
 * List history entries ordered by savedAtISO desc.
 * @param {string} userId
 * @param {number} limitN
 * @param {import('firebase/firestore').QueryDocumentSnapshot=} startAfterSnap
 */
export async function getParkingHistory(userId, limitN = 20, startAfterSnap) {
  if (!userId) throw new Error('getParkingHistory: userId is required')
  const col = userHistoryColRef(userId)
  const baseQ = query(col, orderBy('savedAtISO', 'desc'), qLimit(limitN))
  const q = startAfterSnap ? query(baseQ, qStartAfter(startAfterSnap)) : baseQ
  const snaps = await getDocs(q)
  return {
    items: snaps.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snaps.docs[snaps.docs.length - 1] || null,
  }
}

/**
 * Update the note on a history entry. If it is the current lastParked entry, optionally refresh denorm.
 * @param {string} userId
 * @param {string} entryId
 * @param {string} note
 * @param {boolean=} refreshLastParkedDenorm
 */
export async function updateParkingNote(userId, entryId, note, refreshLastParkedDenorm = true) {
  if (!userId || !entryId) throw new Error('updateParkingNote: userId and entryId are required')
  const entryRef = doc(db, 'users', userId, 'history', entryId)
  await updateDoc(entryRef, { note: note ?? null })

  if (!refreshLastParkedDenorm) return
  const lp = await getDoc(lastParkedDocRef(userId))
  if (lp.exists() && lp.data()?.entryId === entryId) {
    await setDoc(
      lastParkedDocRef(userId),
      { updatedAtISO: nowIso() },
      { merge: true }
    )
  }
}

/**
 * Clear the last parked pointer (history remains).
 * @param {string} userId
 */
export async function clearLastParked(userId) {
  if (!userId) throw new Error('clearLastParked: userId is required')
  await setDoc(lastParkedDocRef(userId), { entryId: null, entryPath: null, denorm: null, updatedAtISO: nowIso() }, { merge: true })
}


