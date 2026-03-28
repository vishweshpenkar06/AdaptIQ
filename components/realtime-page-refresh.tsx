'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type RefreshTable =
  | 'user_concept_mastery'
  | 'question_attempts'
  | 'practice_sessions'

type RealtimePageRefreshProps = {
  userId: string
  tables: RefreshTable[]
}

export function RealtimePageRefresh({ userId, tables }: RealtimePageRefreshProps) {
  const router = useRouter()
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const THROTTLE_MS = 500

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`refresh:${tables.join(',')}:${userId}`)

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null
        router.refresh()
      }, THROTTLE_MS)
    }

    tables.forEach((table) => {
      const filter = table === 'user_concept_mastery' || table === 'question_attempts' || table === 'practice_sessions'
        ? `user_id=eq.${userId}`
        : undefined

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        scheduleRefresh,
      )
    })

    channel.subscribe()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [router, tables, userId])

  return null
}
