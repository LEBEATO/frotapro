'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema, type VehicleFormData } from '@/lib/schemas'
import { createVehicleAndDriver } from '@/app/actions/create-vehicle'
import { ArrowLeft, Loader2, Truck } from 'lucide-react'
import Link from 'next/link'

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      model: '',
      plate: '',
      year: '',
      driver_name: '',
      driver_email: '',
      password: '', // mantido mas não usado
    },
  })

  async function onSubmit(data: VehicleFormData) {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const result = await createVehicleAndDriver(data)
      if (!result.success) {
        throw new Error(result.error || 'Erro ao cadastrar')
      }
      setSuccessMsg(result.message || 'Veículo e motorista cadastrados com sucesso!')
      reset()
      setTimeout(() => router.push('/admin'), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Falha no cadastro')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121727] text-white">
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="p-2 bg-[#121727] hover:bg-slate-800 rounded-xl transition text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-indigo-400" />
              Novo Veículo
            </h1>
            <p className="text-sm text-slate-400">Cadastre um automóvel e vincule ao motorista</p>
          </div>
        </div>

        {errorMsg && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">{errorMsg}</div>}
        {successMsg && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">{successMsg}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-[#121727] border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Modelo *</label>
              <input {...register('model')} placeholder="Ex: Fiorino" className="w-full px-4 py-2.5 bg-[#0B0E17] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              {errors.model && <p className="text-xs text-red-400 mt-1">{errors.model.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Placa *</label>
              <input {...register('plate')} placeholder="ABC-1234" className="w-full px-4 py-2.5 bg-[#0B0E17] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase" />
              {errors.plate && <p className="text-xs text-red-400 mt-1">{errors.plate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ano *</label><input {...register('year')} placeholder="2024" className="w-full px-4 py-2.5 bg-[#0B0E17] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              {errors.year && <p className="text-xs text-red-400 mt-1">{errors.year.message}</p>}
            </div>
          </div>
          <div className="border-t border-slate-800/60 my-4"></div>
          <h3 className="text-sm font-semibold text-slate-300">Dados do Motorista</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome Completo *</label>
              <input {...register('driver_name')} placeholder="João Silva" className="w-full px-4 py-2.5 bg-[#0B0E17] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              {errors.driver_name && <p className="text-xs text-red-400 mt-1">{errors.driver_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail *</label>
              <input {...register('driver_email')} type="email" placeholder="joao@empresa.com" className="w-full px-4 py-2.5 bg-[#0B0E17] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              {errors.driver_email && <p className="text-xs text-red-400 mt-1">{errors.driver_email.message}</p>}
            </div>
          </div>

          {/* ❌ CAMPO DE SENHA REMOVIDO — o motorista define a própria senha no convite */}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...</> : 'Cadastrar Veículo e Enviar Convite'}
          </button>
        </form>
      </div>
    </div>
  )
}