'use client'

import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
  labelledBy: string
  describedBy?: string
  onClose: () => void
  closeOnBackdrop?: boolean
  closeDisabled?: boolean
  backdrop?: 'dark' | 'darker'
  // Somente a aparência do painel; limites de viewport ficam nesta infraestrutura.
  panelClassName: string
}

export function Modal({
  children,
  labelledBy,
  describedBy,
  onClose,
  closeOnBackdrop = false,
  closeDisabled = false,
  backdrop = 'dark',
  panelClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeIfAllowed = useEffectEvent(() => {
    if (!closeDisabled) onClose()
  })

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const controls = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]'
    )).filter((element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert], [hidden]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden'
    )
    const focusInitial = () => (controls()[0] ?? panel).focus({ preventScroll: true })
    focusInitial()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeIfAllowed()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        const elements = controls()
        const index = elements.findIndex((element) => element === document.activeElement)
        const next = event.shiftKey
          ? (index <= 0 ? elements.length - 1 : index - 1)
          : (index + 1) % elements.length
        const target = elements[next] ?? panel
        target.focus()
      }
    }

    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !panel?.contains(event.target)) focusInitial()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${backdrop === 'darker' ? 'bg-black/80' : 'bg-black/70'}`}
      onMouseDown={(event) => {
        if (closeOnBackdrop && !closeDisabled && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={closeDisabled || undefined}
        tabIndex={-1}
        className={`max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
