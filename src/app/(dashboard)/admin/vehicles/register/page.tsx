'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Toast, ToastType } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  Loader2,
  User,
  Mail,
  Phone,
  Car,
  Search,
  ArrowLeft,
  RefreshCw,
  Trash2,
} from 'lucide-react'

interface Vehicle {
  id: string
  plate: string
  model: string
  status?: string | null
  driver_name?: string | null
  driver_email?: string | null
  driver_phone?: string | null
}

export default function RegisterVehiclePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    vehicleId: string
    plate: string
  }>({
    isOpen: false,
    vehicleId: '',
    plate: '',
  })

  const supabase = createClient()

  function showToast(message: string, type: ToastType = 'success') {
    setToast({ message, type })
  }

  async function fetchVehicles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate', { ascending: true })

      if (error) throw error
      setVehicles(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      showToast(`Erro ao carregar a frota: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openConfirmModal(id: string, plate: string) {
    setConfirmModal({ isOpen: true, vehicleId: id, plate })
  }

  function closeConfirmModal() {
    setConfirmModal({ isOpen: false, vehicleId: '', plate: '' })
  }

  async function handleConfirmDelete() {
    const { vehicleId, plate } = confirmModal
    if (!vehicleId) return

    setDeletingId(vehicleId)
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)

      if (error) throw error

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
      showToast(`Veículo ${plate} excluído com sucesso!`, 'success')
      closeConfirmModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      showToast(`Erro ao excluir veículo: ${msg}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  //  CORREÇÃO: operadores || 
  const filteredVehicles = vehicles.filter(
    (item) =>
      item.plate.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      (item.driver_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0B0E17] text-white p-4 md:p-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Excluir Veículo"
        message={`Tem certeza que deseja excluir o veículo de placa "${confirmModal.plate}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={closeConfirmModal}
        isLoading={deletingId === confirmModal.vehicleId}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121727] border border-slate-800/80 p-6 rounded-2xl">
          <div className="flex items-start gap-3"><Link
              href="/admin"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                <Car className="w-6 h-6 text-indigo-500" /> Gestão da Frota
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Acompanhe os automóveis e motoristas responsáveis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchVehicles}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo ou condutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#121727] border border-slate-800/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight">Frota Cadastrada</h3>
          {loading ? (
            <div className="p-12 text-center bg-[#121727] border border-slate-800/80 rounded-2xl text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-sm">Carregando frota...</span>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-12 text-center bg-[#121727] border border-slate-800/80 rounded-2xl text-slate-400 space-y-2">
              <p className="text-base font-semibold text-slate-300">
                {search ? 'Nenhum veículo encontrado para o filtro digitado.' : 'Nenhum veículo cadastrado na frota.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121727] border border-slate-800/80 hover:border-slate-700 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg uppercase ${
                            item.status === 'Ativo' || !item.status
                              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.plate}
                        </span>
                        <h4 className="text-base font-bold text-white mt-2">{item.model}</h4>
                      </div>

                      <button
                        onClick={() => openConfirmModal(item.id, item.plate)}disabled={deletingId === item.id}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition disabled:opacity-50"
                        title="Excluir veículo"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="bg-[#0B0E17] p-3 rounded-xl border border-slate-800/60 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <User className="w-3 h-3 text-indigo-400" /> Condutor Responsável
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        {item.driver_name || 'Não atribuído'}
                      </p>
                      {item.driver_email && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" /> {item.driver_email}
                        </p>
                      )}
                      {item.driver_phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {item.driver_phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-800/60">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'Manutenção'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.status || 'Ativo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}