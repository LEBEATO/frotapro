'use client'

import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

type DashboardMotionProps = {
  children: ReactNode
}

export function DashboardMotion({ children }: DashboardMotionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add(
        {
          desktop: '(min-width: 768px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { desktop, reduceMotion } = context.conditions as {
            desktop: boolean
            reduceMotion: boolean
          }

          const targets = '[data-motion-header], [data-motion-card], [data-motion-panel]'

          if (reduceMotion) {
            gsap.set(targets, { clearProps: 'all' })
            return
          }

          const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

          timeline
            .fromTo(
              '[data-motion-header]',
              { autoAlpha: 0, y: desktop ? 18 : 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.42,
                clearProps: 'transform,opacity,visibility',
              }
            )
            .fromTo(
              '[data-motion-card]',
              { autoAlpha: 0, y: desktop ? 20 : 12, scale: 0.985 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.34,
                stagger: { each: 0.055, from: 'start' },
                clearProps: 'transform,opacity,visibility',
              },
              '-=0.22'
            )
            .fromTo(
              '[data-motion-panel]',
              { autoAlpha: 0, y: desktop ? 16 : 10 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.36,
                stagger: 0.07,
                clearProps: 'transform,opacity,visibility',
              },
              '-=0.18'
            )
        }
      )

      return () => media.revert()
    },
    { scope: containerRef }
  )

  return (
    <div ref={containerRef} className="space-y-6 sm:space-y-8">
      {children}
    </div>
  )
}
