'use client'

import Image from 'next/image'
import { useId } from 'react'
import { Modal } from '@/components/Modal'
import { Image as ImageIcon, X } from 'lucide-react'

interface ChecklistPhotosModalProps {
  selectedPhotos: string[]
  onClose: () => void
}

export function ChecklistPhotosModal({ selectedPhotos, onClose }: ChecklistPhotosModalProps) {
  const titleId = useId()

  return (
    <Modal
      labelledBy={titleId}
      onClose={onClose}
      backdrop="darker"
      panelClassName="relative w-full max-w-3xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
    >

        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">

          <h3 id={titleId} className="flex items-center gap-2 text-sm font-bold text-white">
            <ImageIcon className="h-4 w-4 text-blue-400" />

            Fotos Anexadas
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar fotos anexadas"
            className="rounded-lg bg-zinc-800 p-1 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">

          {selectedPhotos.map(
            (
              photoUrl,
              index
            ) => (
              <div
                key={
                  `${photoUrl}-${index}`
                }
                className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black"
              >
                <Image
                  src={
                    photoUrl
                  }
                  alt={`Foto ${
                    index +
                    1
                  }`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )
          )}

        </div>

    </Modal>
  )
}
