'use client'

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ClipboardPenLine,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Toast, type ToastType } from '@/components/Toast'
import {
  getMaintenanceScheduleStatus,
  getMaintenanceServiceLabel,
  maintenanceServices,
} from '@/lib/maintenance-plan'
import { createClient } from '@/lib/supabase/client'

type Vehicle = {
  id: string
  model: string
  plate: string
  mileage: number | null
  current_branch_id: string | null
}

type Schedule = {
  id: string
  service_type: string
  next_due_mileage: number
  last_completed_mileage: number | null
  last_completed_at: string | null
}

type MaintenanceEvent = {
  id: string
  service_type: string
  completed_mileage: number
  next_due_mileage: number
  completed_at: string
}

const emptyForm = {
  serviceType: 'engine_oil',
  completedMileage: '',
  nextDueMileage: '',
  notes: '',
}

export default function DriverMaintenancePage() {
  const supabase = useMemo(() => createClient(), [])
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [events, setEvents] = useState<MaintenanceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadMaintenance = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Não foi possível identificar o motorista.')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, branch_id, active')
        .eq('id', user.id)
        .maybeSingle()

      if (
        profileError ||
        !profile ||
        profile.role !== 'driver' ||
        !profile.active ||
        !profile.branch_id
      ) {
        throw new Error('Seu perfil de motorista não está disponível.')
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from('driver_vehicle_assignments')
        .select('vehicle_id, branch_id')
        .eq('driver_id', user.id)
        .is('ended_at', null)
        .maybeSingle()

      if (assignmentError) {
        throw assignmentError
      }

      if (!assignment) {
        setVehicle(null)
        setSchedules([])
        setEvents([])
        return
      }

      if (assignment.branch_id !== profile.branch_id) {
        throw new Error('A atribuição ativa pertence a uma base diferente.')
      }

      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, model, plate, mileage, current_branch_id')
        .eq('id', assignment.vehicle_id)
        .maybeSingle()

      if (!vehicleData || vehicleError) {
        throw new Error('Veículo atribuído não encontrado.')
      }

      if (vehicleData.current_branch_id !== profile.branch_id) {
        throw new Error('O veículo atribuído pertence a uma base diferente.')
      }

      const currentVehicle = vehicleData as Vehicle
      const [scheduleResponse, eventResponse] = await Promise.all([
        supabase
          .from('vehicle_maintenance_schedules')
          .select('id, service_type, next_due_mileage, last_completed_mileage, last_completed_at')
          .eq('vehicle_id', currentVehicle.id)
          .order('next_due_mileage'),
        supabase
          .from('vehicle_maintenance_events')
          .select('id, service_type, completed_mileage, next_due_mileage, completed_at')
          .eq('vehicle_id', currentVehicle.id)
          .order('completed_at', { ascending: false })
          .limit(8),
      ])

      if (scheduleResponse.error) {
        throw scheduleResponse.error
      }

      if (eventResponse.error) {
        throw eventResponse.error
      }

      setVehicle(currentVehicle)
      setSchedules((scheduleResponse.data ?? []) as Schedule[])
      setEvents((eventResponse.data ?? []) as MaintenanceEvent[])
    } catch (loadError) {
      console.error('Erro ao carregar plano de manutenção:', loadError)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar o plano de manutenção.'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadMaintenance()
  }, [loadMaintenance])

  async function submitMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!vehicle || saving) {
      return
    }

    const completedMileage = Number(form.completedMileage)
    const nextDueMileage = Number(form.nextDueMileage)
    const currentMileage = vehicle.mileage ?? 0

    if (!Number.isInteger(completedMileage) || completedMileage < 0) {
      setToast({ message: 'Informe a quilometragem em que a manutenção foi feita.', type: 'error' })
      return
    }

    if (completedMileage > currentMileage) {
      setToast({ message: `A quilometragem realizada não pode ser maior que ${currentMileage.toLocaleString('pt-BR')} km.`, type: 'error' })
      return
    }

    if (!Number.isInteger(nextDueMileage) || nextDueMileage <= completedMileage) {
      setToast({ message: 'A próxima manutenção precisa ser maior que a quilometragem realizada.', type: 'error' })
      return
    }

    setSaving(true)

    const { error: recordError } = await supabase.rpc(
      'record_vehicle_maintenance',
      {
        p_vehicle_id: vehicle.id,
        p_service_type: form.serviceType,
        p_completed_mileage: completedMileage,
        p_next_due_mileage: nextDueMileage,
        p_notes: form.notes.trim() || null,
      }
    )

    setSaving(false)

    if (recordError) {
      console.error('Erro ao registrar manutenção:', recordError)
      setToast({ message: recordError.message || 'Não foi possível salvar a manutenção.', type: 'error' })
      return
    }

    setForm(emptyForm)
    setToast({ message: 'Manutenção registrada e próxima quilometragem atualizada.', type: 'success' })
    await loadMaintenance()
  }

  const alertSchedules = schedules.filter((schedule) =>
    getMaintenanceScheduleStatus(vehicle?.mileage ?? 0, schedule.next_due_mileage) !== 'up_to_date'
  )

  return (
    <AppShell>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a href="/driver" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-400 transition hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Voltar ao painel
            </a>
            <p className="mt-4 text-sm font-semibold text-amber-400">Manutenção por quilometragem</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Plano do veículo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Registre a manutenção feita e informe a próxima quilometragem. O sistema alerta você e o gestor quando o veículo atingir o prazo.
            </p>
          </div>
          <button type="button" onClick={() => void loadMaintenance()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" /> Carregando plano de manutenção...
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-red-400" /><div><h2 className="font-semibold text-white">Não foi possível carregar</h2><p className="mt-1 text-sm text-red-300">{error}</p></div></div>
          </section>
        ) : !vehicle ? (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"><p className="font-semibold text-amber-300">Nenhum veículo atribuído</p><p className="mt-1 text-sm text-zinc-400">Peça ao gestor para vincular um veículo antes de registrar manutenções.</p></section>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Veículo atual</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-white">{vehicle.model}</h2><p className="mt-1 text-sm text-zinc-500">{vehicle.plate}</p></div><p className="text-lg font-bold text-white">{(vehicle.mileage ?? 0).toLocaleString('pt-BR')} km</p></div>
            </section>

            {alertSchedules.length > 0 && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" /><div><h2 className="font-semibold text-amber-300">Atenção: manutenção por quilometragem</h2><p className="mt-1 text-sm text-zinc-300">{alertSchedules.map((schedule) => getMaintenanceServiceLabel(schedule.service_type)).join(', ')} {alertSchedules.length === 1 ? 'precisa de atenção.' : 'precisam de atenção.'} O gestor também visualizará este alerta.</p></div></div>
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="space-y-4">
                <div><h2 className="text-lg font-bold text-white">Próximas manutenções</h2><p className="mt-1 text-sm text-zinc-500">Os avisos são calculados pela quilometragem atual do veículo.</p></div>
                {schedules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-400">Ainda não há manutenção cadastrada. Registre abaixo a primeira troca realizada e a próxima quilometragem.</div>
                ) : schedules.map((schedule) => {
                  const status = getMaintenanceScheduleStatus(vehicle.mileage ?? 0, schedule.next_due_mileage)
                  const statusText = status === 'overdue' ? 'Vencida' : status === 'due_soon' ? 'Próxima' : 'Em dia'
                  const statusClass = status === 'overdue' ? 'border-red-500/25 bg-red-500/10 text-red-300' : status === 'due_soon' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  return <article key={schedule.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{getMaintenanceServiceLabel(schedule.service_type)}</h3><p className="mt-1 text-sm text-zinc-500">Próxima: {schedule.next_due_mileage.toLocaleString('pt-BR')} km</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{statusText}</span></div>{schedule.last_completed_mileage !== null && <p className="mt-4 text-xs text-zinc-500">Última registrada: {schedule.last_completed_mileage.toLocaleString('pt-BR')} km</p>}</article>
                })}
              </section>

              <section className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="flex items-center gap-3"><div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400"><ClipboardPenLine className="h-5 w-5" /></div><div><h2 className="font-semibold text-white">Registrar manutenção</h2><p className="text-xs text-zinc-500">Salva no histórico do veículo.</p></div></div>
                <form className="mt-5 space-y-4" onSubmit={(event) => void submitMaintenance(event)}>
                  <label className="block text-sm font-medium text-zinc-300">Serviço<select value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-blue-500"><option value="">Selecione</option>{maintenanceServices.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}</select></label>
                  <label className="block text-sm font-medium text-zinc-300">KM em que foi feita<input required inputMode="numeric" min="0" step="1" type="number" value={form.completedMileage} onChange={(event) => setForm({ ...form, completedMileage: event.target.value })} placeholder={(vehicle.mileage ?? 0).toString()} className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
                  <label className="block text-sm font-medium text-zinc-300">Próxima manutenção em KM<input required inputMode="numeric" min="1" step="1" type="number" value={form.nextDueMileage} onChange={(event) => setForm({ ...form, nextDueMileage: event.target.value })} placeholder="Ex.: 70000" className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
                  <label className="block text-sm font-medium text-zinc-300">Observação <span className="text-zinc-600">(opcional)</span><textarea maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /></label>
                  <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}{saving ? 'Salvando...' : 'Salvar manutenção'}</button>
                </form>
              </section>
            </div>

            {events.length > 0 && <section><h2 className="text-lg font-bold text-white">Histórico recente</h2><div className="mt-4 space-y-3">{events.map((maintenanceEvent) => <article key={maintenanceEvent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><div><p className="font-medium text-zinc-200">{getMaintenanceServiceLabel(maintenanceEvent.service_type)}</p><p className="mt-1 text-xs text-zinc-500">Feita em {maintenanceEvent.completed_mileage.toLocaleString('pt-BR')} km</p></div><p className="text-sm text-zinc-400">Próxima: {maintenanceEvent.next_due_mileage.toLocaleString('pt-BR')} km</p></article>)}</div></section>}
          </>
        )}
      </div>
    </AppShell>
  )
}
