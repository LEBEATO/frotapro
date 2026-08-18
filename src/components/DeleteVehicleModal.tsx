'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteVehicleModalProps {
  vehicle: { id: string; plate: string } | null
  onClose: () => void
  onSuccess: (deletedId: string) => void
}

export function DeleteVehicleModal({ vehicle, onClose, onSuccess }: DeleteVehicleModalProps) {
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  if (!vehicle) return null

  async function handleConfirmDelete() {
    if (!vehicle) return
    setDeleting(true)

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id)

      if (error) throw error

      onSuccess(vehicle.id)
      onClose()
    } catch (err: unknown) {
      console.error('Erro ao excluir veículo:', err)
      if (err instanceof Error) {
        alert(`Falha ao excluir veículo: ${err.message || 'Erro no banco de dados'}`)
      } else {
        alert('Falha ao excluir veículo: erro desconhecido')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1423] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Excluir Veículo</h3>
            <p className="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Tem certeza que deseja remover o veículo de placa{' '}
          <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {vehicle.plate}
          </span>
          ?
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 transition disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}