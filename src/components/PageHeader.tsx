import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  contextLabel?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  actionsAlign?: 'center' | 'end'
  descriptionWidth?: '2xl' | '3xl'
}

export function PageHeader({
  title,
  description,
  contextLabel,
  backHref,
  backLabel = 'Voltar',
  actions,
  actionsAlign = 'end',
  descriptionWidth = '2xl',
}: PageHeaderProps) {
  return (
    <section
      className={actionsAlign === 'center'
        ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
        : 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'}
    >
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
        <div>
          {contextLabel && (
            <p className="text-sm font-medium text-blue-400">
              {contextLabel}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p
              className={descriptionWidth === '3xl'
                ? 'mt-2 max-w-3xl text-sm leading-6 text-zinc-400'
                : 'mt-2 max-w-2xl text-sm leading-6 text-zinc-400'}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {actions}
    </section>
  )
}
