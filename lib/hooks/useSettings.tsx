"use client"

import { useState, useEffect } from 'react'

const DEFAULT_SETTINGS = {
  nama_toko: '',
  alamat_toko: '',
  no_telepon: '',
  teks_struk: '',
  batas_menunggak_hari: 30,
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    let mounted = true
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load settings')))
      .then((data) => {
        if (!mounted) return
        setSettings(prev => ({ ...prev, ...data }))
      })
      .catch((err) => {
        console.warn('useSettings: failed to fetch /api/settings', err)
      })

    return () => { mounted = false }
  }, [])

  return settings
}
