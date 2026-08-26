'use client'

import { useState, type ReactNode } from 'react'

import { DashboardHeader } from './DashboardHeader'
import { MobileSidebar } from './MobileSidebar'
import { Sidebar } from './Sidebar'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <Sidebar />

      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-72">
        <DashboardHeader
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}