'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, type RefObject } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'default' | 'destructive'
  returnFocusRef?: RefObject<HTMLElement | null>
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'default',
  returnFocusRef,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelIfAllowed = useEffectEvent(() => {
    if (!isLoading) onCancel()
  })

  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    // O acionador pode já ter ficado inerte quando este efeito executar.
    const previousFocus = returnFocusRef?.current ?? document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const buttons = () => Array.from(
      panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    )
    const focusInitialAction = () => (buttons()[0] ?? panel).focus()
    // Cancelar é a ação inicial segura, inclusive em confirmações destrutivas.
    focusInitialAction()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        cancelIfAllowed()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        const actions = buttons()
        if (!actions.length) {
          panel?.focus()
          return
        }
        const index = actions.findIndex((action) => action === document.activeElement)
        const next = event.shiftKey
          ? (index <= 0 ? actions.length - 1 : index - 1)
          : (index + 1) % actions.length
        actions[next].focus()
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !panel?.contains(event.target)) {
        focusInitialAction()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [isOpen, returnFocusRef])

  useEffect(() => {
    if (isOpen && isLoading) panelRef.current?.focus()
  }, [isOpen, isLoading])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={isLoading}
        tabIndex={-1}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertTriangle aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0 wrap-break-word">
            <h3 id={`${id}-title`} className="text-sm font-bold text-white">{title}</h3>
            <p id={`${id}-description`} className="text-xs text-zinc-400 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => { if (!isLoading) onCancel() }}
            disabled={isLoading}
            className="flex-1 min-h-11 sm:min-h-0 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => { if (!isLoading) onConfirm() }}
            disabled={isLoading}
            className={`flex-1 min-h-11 sm:min-h-0 py-2 ${variant === 'destructive' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            {isLoading ? <><Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" /><span className="sr-only">{confirmText} em andamento</span></> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
