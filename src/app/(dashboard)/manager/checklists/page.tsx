'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  ClipboardList,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Car,
  Image as ImageIcon,
  X,
  Loader2,
  RefreshCw,
  Mail,
  Check,
  Wrench,
  ArrowLeft,
} from 'lucide-react'

interface ChecklistItem {
  name: string
  value?: 'SIM' | 'NÃO'
  ok: boolean
}

interface Checklist {
  id: string
  created_at: string
  driver: string | null
  driver_email: string | null
  vehicle_plate: string | null
  vehicle_model: string | null
  items: ChecklistItem[] | null
  has_issue: boolean
  observation: string | null
  photos: string[] | null
}

export default function ManagerChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterIssues, setFilterIssues] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null)
  const [sendingMaintenance, setSendingMaintenance] = useState<string | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [driverName, setDriverName] = useState('')
  const [driverEmail, setDriverEmail] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')

  const supabase = createClient()

  function getChecklistItems(items: ChecklistItem[] | null) {
    return Array.isArray(items) ? items : []
  }

  function getChecklistPhotos(photos: string[] | null) {
    return Array.isArray(photos) ? photos : []
  }

  function getRecordedMileage(observation: string | null) {
    if (!observation) return null
    const match = observation.match(/KM(?: Atual)?(?: registrado)?:\s*([\d.,]+)/i)
    return match ? match[1] : null
  }

  async function fetchChecklists() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('driver_checklists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro detalhado do Supabase:', error)
        alert(`Erro ao buscar checklists: ${error.message}`)
        return
      }

      console.log('Checklists carregados do banco:', data)
      setChecklists(data || [])
    } catch (err: unknown) {
      console.error('Erro inesperado ao carregar checklists:', err)
      if (err instanceof Error) {
        alert(`Erro inesperado: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChecklists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleResolveMaintenance(checklistId: string, vehiclePlate: string | null) {
    if (!vehiclePlate) {
      alert('Veículo sem placa informada.')
      return
    }
    if (!confirm('Marcar esta manutenção como resolvida?')) return

    setSendingMaintenance(checklistId)
    try {
      const { error: vehicleErr } = await supabase
        .from('vehicles')
        .update({ status: 'Ativo', issues: null })
        .eq('plate', vehiclePlate)
      if (vehicleErr) throw vehicleErr

      const { error: maintenanceErr } = await supabase
        .from('maintenance_records')
        .update({ status: 'completed' })
        .eq('vehicle_plate', vehiclePlate)
        .eq('status', 'pending')
      if (maintenanceErr) throw maintenanceErr

      alert('Manutenção resolvida com sucesso! Status do veículo atualizado para "Ativo".')
      await fetchChecklists()
    } catch (err: unknown) {
      console.error('Erro ao resolver manutenção:', err)
      if (err instanceof Error) {
        alert(`Erro: ${err.message || 'Falha ao resolver manutenção.'}`)
      } else {
        alert('Falha ao resolver manutenção.')
      }
    } finally {
      setSendingMaintenance(null)
    }
  }

  async function handleAssignVehicle(e: React.FormEvent) {
    e.preventDefault()
    if (!driverName || !driverEmail || !vehiclePlate || !vehicleModel) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    setSavingAssignment(true)
    try {
      const plate = vehiclePlate.toUpperCase().trim()
      const email = driverEmail.toLowerCase().trim()
      const { data: existingVehicle, error: findError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('plate', plate)
        .single()

      if (findError || !existingVehicle) {
        throw new Error(`Veículo com placa "${plate}" não encontrado.`)
      }

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ driver_name: driverName, driver_email: email })
        .eq('plate', plate)
      if (updateError) throw updateError

      alert('Veículo atribuído com sucesso!')
      setIsAssignModalOpen(false)
      setDriverName('')
      setDriverEmail('')
      setVehiclePlate('')
      setVehicleModel('')
      await fetchChecklists()
    } catch (err: unknown) {
      console.error('Erro ao atribuir veículo:', err)
      if (err instanceof Error) {
        alert(`Erro: ${err.message || 'Falha ao atribuir veículo.'}`)
      } else {
        alert('Falha ao atribuir veículo.')
      }
    } finally {
      setSavingAssignment(false)
    }
  }

  const filteredChecklists = checklists.filter((item) => {
    const matchesSearch =
      (item.vehicle_plate || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.driver || '').toLowerCase().includes(search.toLowerCase())
    if (filterIssues) return matchesSearch && item.has_issue
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-start gap-3">
            <Link
              href="/admin"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition"
              aria-label="Voltar ao painel do gestor"
              title="Voltar ao painel do gestor"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-blue-500" /> Inspeções e Checklists
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Acompanhamento de rotina e relatórios pré-viagem da frota
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchChecklists}
              disabled={loading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition text-xs flex items-center gap-2 border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por placa ou motorista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"/>
          </div>
          <button
            onClick={() => setFilterIssues(!filterIssues)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
              filterIssues
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Apenas com Avarias/Problemas
          </button>
        </div>

        {/* Grid de Cards dos Motoristas */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Carregando histórico...</span>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
            <p className="text-zinc-400 text-sm">Nenhum checklist encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChecklists.map((item) => {
              const checklistItems = getChecklistItems(item.items)
              const checklistPhotos = getChecklistPhotos(item.photos)
              const itensNaoOk = checklistItems.filter((i) => !i.ok).map((i) => i.name)
              const hasPendingMaintenance = itensNaoOk.length > 0

              return (
                <div
                  key={item.id}
                  className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition hover:border-zinc-700 ${
                    item.has_issue ? 'border-amber-500/30' : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg font-mono font-bold text-blue-400 uppercase tracking-wider">
                        {item.vehicle_plate || 'SEM PLACA'}
                      </span>
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="space-y-1 mb-4">
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <User className="w-4 h-4 text-zinc-400" /> {item.driver || 'Não informado'}
                      </div>
                      <div className="text-xs text-zinc-300 flex items-center gap-1">
                        <Car className="w-3 h-3 text-zinc-500" /> {item.vehicle_model || 'Modelo não informado'}
                      </div>
                      {item.driver_email && (
                        <div className="text-xs text-zinc-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {item.driver_email}
                        </div>
                      )}
                    </div>

                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 mb-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Itens Checados</div>
                      <div className="flex flex-wrap gap-1.5">
                        {checklistItems.map((check, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              check.ok
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {check.ok ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {check.name}: {check.value || (check.ok ? 'SIM' : 'NÃO')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {getRecordedMileage(item.observation) && (
                      <div className="mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                        <span className="font-semibold">KM registrado:</span> {getRecordedMileage(item.observation)}
                      </div>
                    )}

                    {item.observation && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Observação do Motorista:
                        </div>
                        <p className="text-amber-200/80 leading-relaxed">{item.observation}</p>
                      </div>
                    )}

                    {hasPendingMaintenance && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Pendências: {itensNaoOk.join(', ')}
                        </p>
                        <button
                          onClick={() => handleResolveMaintenance(item.id, item.vehicle_plate)}
                          disabled={sendingMaintenance === item.id}
                          className="mt-2 w-full py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition disabled:opacity-50"
                        >
                          {sendingMaintenance === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                          Resolver Manutenção
                        </button>
                      </div>
                    )}
                  </div>

                  {checklistPhotos.length > 0 && (
                    <button
                      onClick={() => setSelectedPhotos(checklistPhotos)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-zinc-700 transition"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      Ver {checklistPhotos.length} {checklistPhotos.length === 1 ? 'Foto Anexada' : 'Fotos Anexadas'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Atribuição */}
      {isAssignModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 relative space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-500" /> Atribuir Veículo a Motorista
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                aria-label="Fechar atribuição"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome do Motorista</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail do Motorista</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@empresa.com"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    required
                    placeholder="ABC-1234"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Modelo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fiorino"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAssignment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {savingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvar Atribuição
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedPhotos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 relative space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" /> Fotos Registradas na Inspeção
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPhotos(null)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                aria-label="Fechar fotos"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1">
              {selectedPhotos.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block h-48 w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950"
                >
                  <Image src={url} alt={`Foto do checklist ${idx}`} fill className="object-cover" unoptimized />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}