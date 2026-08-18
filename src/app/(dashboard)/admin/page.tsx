'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DeleteVehicleModal } from '@/components/DeleteVehicleModal'
import {
  Truck,
  Wrench,
  CheckCircle2,
  Menu,
  X,
  Plus,
  Bell,
  LayoutDashboard,
  Settings,
  LogOut,
  Loader2,
  User,
  Trash2,
  Phone,
  Mail,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'

interface Vehicle {
  id: string
  model: string
  plate: string
  driver_name?: string
  driver_email?: string
  driver_phone?: string
  status?: string
  created_at?: string
}

interface Checklist {
  id: string
  vehicle_plate: string
  driver: string
  has_issue: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [recentChecklists, setRecentChecklists] = useState<Checklist[]>([])
  const [userEmail, setUserEmail] = useState<string>('Carregando...')
  const [userName, setUserName] = useState<string>('Gestor')
  const [userInitials, setUserInitials] = useState<string>('US')
  const [vehicleToDelete, setVehicleToDelete] = useState<{ id: string; plate: string } | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || 'Sem e-mail')
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Gestor'
        setUserName(name)
        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        setUserInitials(initials || 'US')
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err)
    }
  }

  async function fetchVehicles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setVehicles(data || [])
    } catch (err) {
      console.error('Falha na busca:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecentChecklists() {
    try {
      const { data, error } = await supabase
        .from('driver_checklists')
        .select('id, vehicle_plate, driver, has_issue, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      if (!error && data) setRecentChecklists(data)
    } catch (err) {
      console.error('Erro ao buscar checklists recentes:', err)
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  function handleVehicleDeleted(deletedId: string) {
    setVehicles((prev) => prev.filter((v) => v.id !== deletedId))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchUserData()
    fetchVehicles()
    fetchRecentChecklists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalVehicles = vehicles.length
  const activeVehicles = vehicles.filter((v) => v.status === 'Ativo' || !v.status).length
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Manutenção').length

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex font-sans antialiased">
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
      <aside
        className={
          `fixed lg:static top-0 left-0 bottom-0 z-50 w-72
          bg-[#0F1423] border-r border-slate-800/60 p-5
          flex flex-col justify-between
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white tracking-tight leading-none">FleetHub</h1>
                <span className="text-xs text-slate-400 font-medium">Gestão de Frotas</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 transition text-sm font-semibold">
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              Painel Geral
            </Link>
            <Link href="/admin/vehicles" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition text-sm font-medium">
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4" />
                Veículos e Motoristas
              </div>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-full">{totalVehicles}</span>
            </Link>
            <Link href="/manager/checklists" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition text-sm font-medium">
              <ClipboardList className="w-4 h-4" />
              Checklists
            </Link>
            <a href="#" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition text-sm font-medium">
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4" />
                Manutenção
              </div>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-full">{maintenanceVehicles}</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition text-sm font-medium">
              <Settings className="w-4 h-4" />
              Configurações
            </a>
          </nav>
        </div>

        <div className="bg-[#151B2E] border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex-shrink-0 flex items-center justify-center font-bold text-xs text-white uppercase shadow-md">{userInitials}</div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate capitalize">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="p-4 sm:p-6 border-b border-slate-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Painel do Gestor</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 text-slate-300 bg-[#121727] hover:bg-slate-800 border border-slate-800 rounded-xl transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></span>
            </button>
            <Link href="/admin/vehicles/new" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-95">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Veículo</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-[#121727] border border-slate-800/80 rounded-2xl p-6 flex justify-between items-start">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Veículos</span>
                <div className="text-3xl font-extrabold text-white">{totalVehicles}</div>
                <p className="text-xs text-slate-500 font-medium">Cadastrados no sistema</p>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                <Truck className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-[#121727] border border-slate-800/80 rounded-2xl p-6 flex justify-between items-start">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Veículos Ativos</span>
                <div className="text-3xl font-extrabold text-emerald-400">{activeVehicles}</div>
                <p className="text-xs text-emerald-500/80 font-medium">Prontos para transporte</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-[#121727] border border-slate-800/80 rounded-2xl p-6 flex justify-between items-start">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Manutenção</span>
                <div className="text-3xl font-extrabold text-amber-400">{maintenanceVehicles}</div>
                <p className="text-xs text-amber-500/80 font-medium">Revisão ou mecânica</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-[#121727] border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-indigo-400" />
                Últimas Inspeções
              </h4>
              <Link href="/manager/checklists" className="text-xs text-indigo-400 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {recentChecklists.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma inspeção registrada ainda.</p>
              ) : (
                recentChecklists.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs border-b border-slate-800/60 py-2">
                    <span className="text-slate-300 font-mono">{item.vehicle_plate}</span>
                    <span className="text-slate-400">{item.driver}</span>
                    <span className="flex items-center gap-1">
                      {item.has_issue ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="text-slate-500 text-[10px]">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Frota Cadastrada</h3>
            {loading ? (
              <div className="p-12 text-center bg-[#121727] border border-slate-800/80 rounded-2xl text-slate-400 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-sm">Carregando frota...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="p-12 text-center bg-[#121727] border border-slate-800/80 rounded-2xl text-slate-400 space-y-2">
                <p className="text-base font-semibold text-slate-300">Nenhum veículo cadastrado na frota.</p>
                <p className="text-xs text-slate-500">Clique em &quot;Novo Veículo&quot; para adicionar o primeiro condutor e automóvel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((item) => (
                  <div key={item.id} className="bg-[#121727] border border-slate-800/80 hover:border-slate-700 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg uppercase">
                            {item.plate}
                          </span>
                          <h4 className="text-base font-bold text-white mt-2">{item.model}</h4>
                        </div>
                        <button
                          onClick={() => setVehicleToDelete({ id: item.id, plate: item.plate })}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-[#0B0E17] p-3 rounded-xl border border-slate-800/60 space-y-1"><div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400" /> Condutor Responsável
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{item.driver_name || 'Não atribuído'}</p>
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
      </main>

      <DeleteVehicleModal
        vehicle={vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onSuccess={handleVehicleDeleted}
      />
    </div>
  )
}