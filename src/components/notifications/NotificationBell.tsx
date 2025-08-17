'use client'

import React, { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotificationCount } from '@/hooks/useNotifications'
import { NotificationCenter } from './NotificationCenter'

interface NotificationBellProps {
  userId: string
  companyId?: string
  className?: string
}

export function NotificationBell({ userId, companyId, className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = useNotificationCount(userId, companyId)

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`relative ${className}`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationCenter
        userId={userId}
        companyId={companyId}
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  )
}
