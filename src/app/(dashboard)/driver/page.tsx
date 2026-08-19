'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useForm, useWatch, FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Camera, Check, AlertTriangle, Loader2, LogOut, CheckCircle2, X, Car } from 'lucide-react'

// Lista de itens de inspeção
const INSPECTION_ITEMS = [
  { id: 'limpadorParabrisa', label: 'LIMPADOR PARABRISA' },
  { id: 'buzina', label: 'BUZINA' },
  { id: 'farois', label: 'FARÓIS' },
  { id: 'lanternasDianteiras', label: 'LANTERNAS DIANTEIRAS' },
  { id: 'lanternasTraseiras', label: 'LANTERNAS TRASEIRAS' },
  { id: 'setasDianteiras', label: 'SETAS DIANTEIRAS' },
  { id: 'setasTraseiras', label: 'SETAS TRASEIRAS' },
  { id: 'luzFreio', label: 'LUZ DE FREIO' },
  { id: 'luzRe', label: 'LUZ DE RÉ' },
  { id: 'triangulo', label: 'TRIÂNGULO' },
  { id: 'macaco', label: 'MACACO' },
  { id: 'chaveRoda', label: 'CHAVE DE RODA' },
  { id: 'espelhosRetrovisores', label: 'ESPELHOS RETROVISORES' },
  { id: 'painel', label: 'PAINEL' },
  { id: 'pneus', label: 'PNEUS' },
  { id: 'estepe', label: 'ESTEPE' },
  { id: 'vidros', label: 'VIDROS' },
  { id: 'tapetes', label: 'TAPETES' },
  { id: 'lataria', label: 'LATARIA' },
  { id: 'plotagem', label: 'PLOTAGEM (ADESIVO)' },
  { id: 'suporteEscada', label: 'SUPORTE DE ESCADA' },
] as const

type InspectionItemId = (typeof INSPECTION_ITEMS)[number]['id']

// Criamos o schema dinâmico tipado
const itemsShape = INSPECTION_ITEMS.reduce((acc, item) => {
  acc[item.id] = z.enum(['SIM', 'NÃO'], {
    required_error: `Selecione SIM ou NÃO para ${item.label}`,
  })
  return acc
}, {} as Record<InspectionItemId, z.ZodEnum<['SIM', 'NÃO']>>)

const checklistSchema = z.object({
  vehiclePlate: z.string().min(1, 'Informe a placa do veículo'),
  kmAtual: z
    .string()
    .min(1, 'A quilometragem é obrigatória')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Informe um valor numérico válido para o KM',
    }),
  items: z.object(itemsShape),
  observacoes: z.string().optional(),
})

type ChecklistFormData = z.infer<typeof checklistSchema>

interface VehicleData {
  id: string
  model: string
  plate: string
  year: string
  status: string
  mileage?: number
}

export default function DriverPage() {
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [vehicle, setVehicle] = useState<VehicleData | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    mode: 'onChange',
  })

  const selectedItems = useWatch({ control, name: 'items' })

  useEffect(() => {
    async function fetchVehicle() {
      setLoadingVehicle(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user?.email) {
          setLoadingVehicle(false)
          return
        }

        const { data, error } = await supabase
          .from('vehicles')
          .select('id, model, plate, year, status, mileage')
          .eq('driver_email', userData.user.email)
          .maybeSingle()

        if (error) {
          console.error('Erro ao buscar veículo:', error)
        } else if (data) {
          setVehicle(data)
          setValue('vehiclePlate', data.plate)
          if (data.mileage) {
            setValue('kmAtual', String(data.mileage))
          }
        }
      } catch (err) {
        console.error('Falha ao carregar veículo:', err)
      } finally {
        setLoadingVehicle(false)
      }
    }
    fetchVehicle()
  }, [setValue, supabase])

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const selectedFiles = Array.from(e.target.files)
    if (photos.length + selectedFiles.length > 5) {
      alert('Você pode anexar no máximo 5 fotos por inspeção.')
      return
    }
    const newPhotos = [...photos, ...selectedFiles]
    setPhotos(newPhotos)
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
    setPhotoPreviews((prev) => [...prev, ...newPreviews])
  }

  function removePhoto(index: number) {
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index])
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function onSubmit(data: ChecklistFormData) {
    setUploading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('Usuário não autenticado.')

      // 1. UPLOAD DAS FOTOS NO SUPABASE STORAGE
      const uploadedPhotoUrls: string[] = []
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop()
        const uniqueId = crypto.randomUUID()
        const fileName = `${userData.user.id}/${uniqueId}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('checklist-photos')
          .upload(fileName, photo, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw new Error(`Falha no upload da foto: ${uploadErr.message}`)

        const { data: publicUrlData } = supabase.storage
          .from('checklist-photos')
          .getPublicUrl(fileName)

        uploadedPhotoUrls.push(publicUrlData.publicUrl)
      }

      // 2. FORMATAÇÃO DOS ITENS DE INSPEÇÃO
      const formattedItems = INSPECTION_ITEMS.map((item) => ({
        name: item.label,
        value: data.items[item.id as InspectionItemId],
        ok: data.items[item.id as InspectionItemId] === 'SIM',
      }))

      const itensComDefeito = formattedItems.filter((i) => !i.ok).map((i) => i.name)
      const hasIssue = itensComDefeito.length > 0

      let observacaoFinal = data.observacoes || ''
      if (hasIssue) {
        observacaoFinal = `Itens incorretos/ausentes: ${itensComDefeito.join(', ')}. KM: ${data.kmAtual}. ${observacaoFinal}`.trim()
      } else if (data.kmAtual) {
        observacaoFinal = `KM Atual registrado: ${data.kmAtual}. ${observacaoFinal}`.trim()
      }

      // 3. GRAVAÇÃO DO CHECKLIST
      const { error: insertErr } = await supabase.from('driver_checklists').insert({
        id: crypto.randomUUID(),
        user_id: userData.user.id,
        driver: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Motorista',
        driver_email: userData.user.email || '',
        vehicle_model: vehicle?.model || 'Frota',
        vehicle_plate: data.vehiclePlate.toUpperCase(),
        items: formattedItems,
        has_issue: hasIssue,
        observation: observacaoFinal,
        photos: uploadedPhotoUrls,
      })
      if (insertErr) throw insertErr

      // 4. ATUALIZAÇÃO DO VEÍCULO (KM E STATUS)
      if (vehicle) {
        const updatePayload: Record<string, unknown> = {
          mileage: Number(data.kmAtual),
        }

        if (hasIssue) {
          updatePayload.status = 'Manutenção'
          updatePayload.issues = observacaoFinal
        }

        const { error: updateVehicleErr } = await supabase
          .from('vehicles')
          .update(updatePayload)
          .eq('id', vehicle.id)

        if (updateVehicleErr) console.error('Erro ao atualizar veículo:', updateVehicleErr)

        // 5. CRIAÇÃO DE REGISTRO DE MANUTENÇÃO CASO HOUVER DEFEITO
        if (hasIssue) {
          const { error: maintenanceErr } = await supabase
            .from('maintenance_records')
            .insert({
              vehicle_plate: data.vehiclePlate.toUpperCase(),
              mechanic_name: 'Aguardando Atribuição',
              service_description: `Manutenção necessária identificada na inspeção: ${itensComDefeito.join(', ')}`,
              cost: 0,
            })
          if (maintenanceErr) console.error('Erro ao criar registro de manutenção:', maintenanceErr)
        }
      }

      // 6. SUCESSO E ATUALIZAÇÃO DO ESTADO LOCAL
      setSuccessMsg('Checklist e fotos enviados com sucesso! Boa viagem.')
      
      photoPreviews.forEach((url) => URL.revokeObjectURL(url))
      setPhotos([])
      setPhotoPreviews([])

      if (vehicle?.id) {
        const { data: updatedVehicle } = await supabase
          .from('vehicles')
          .select('status, mileage')
          .eq('id', vehicle.id)
          .single()

        if (updatedVehicle) {
          setVehicle((prev) =>
            prev
              ? {
                  ...prev,
                  status: updatedVehicle.status,
                  mileage: updatedVehicle.mileage,
                }
              : null
          )
        }
      }

      // 7. REINICIALIZAÇÃO DO FORMULÁRIO
      reset({
        vehiclePlate: vehicle?.plate || '',
        kmAtual: String(data.kmAtual),
        observacoes: '',
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Erro ao enviar checklist.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" /> Inspeção Pré-Viagem
            </h1>
            <p className="text-xs text-zinc-400">Verificação de Segurança Veicular</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition text-xs flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        {/* STATUS VEÍCULO */}
        {loadingVehicle ? (
          <div className="mb-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-zinc-400">Carregando dados do veículo...</span>
          </div>
        ) : vehicle ? (
          <div className="mb-4 p-4 bg-zinc-900 border border-blue-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-blue-500" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-white">{vehicle.model}</span>
                <span className="text-zinc-400">|</span>
                <span className="font-mono text-blue-400 font-bold">{vehicle.plate}</span>
                <span className="text-zinc-400">|</span>
                <span className="text-zinc-400">{vehicle.year}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Status:</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  vehicle.status === 'Manutenção'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {vehicle.status || 'Ativo'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-zinc-900 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Nenhum veículo atribuído a você. Entre em contato com o gestor.</span>
          </div>
        )}

        {/* MENSAGENS */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-medium flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* DADOS BÁSICOS */}
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-6 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-400">Placa do Veículo *</label>
              <input
                type="text"
                placeholder="ABC-1D23"
                {...register('vehiclePlate')}
                className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              {errors.vehiclePlate && <p className="text-xs text-red-400">{errors.vehiclePlate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-400">KM Atual *</label>
              <input
                type="number"
                placeholder="Ex: 120500"
                {...register('kmAtual')}
                className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              {errors.kmAtual && <p className="text-xs text-red-400">{errors.kmAtual.message}</p>}
            </div>
          </div>

          {/* ITENS DE INSPEÇÃO */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
              ITENS DE INSPEÇÃO
            </h2>
            <div className="space-y-2.5">
              {INSPECTION_ITEMS.map((item) => {
                const fieldName = `items.${item.id}` as FieldPath<ChecklistFormData>
                const selectedValue = selectedItems?.[item.id]

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-[#141824] border border-zinc-800/80 rounded-2xl transition hover:border-zinc-700"
                  >
                    <span className="text-sm font-bold text-zinc-200 tracking-wide">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <label
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition border ${
                          selectedValue === 'SIM'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <input
                          type="radio"
                          value="SIM"
                          {...register(fieldName)}
                          className="hidden"
                        />
                        SIM
                      </label>

                      <label
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition border ${
                          selectedValue === 'NÃO'
                            ? 'bg-red-600/90 text-white border-red-500 shadow-md shadow-red-600/20'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <input
                          type="radio"
                          value="NÃO"
                          {...register(fieldName)}
                          className="hidden"
                        />
                        NÃO
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* FOTOS DO VEÍCULO */}
          <div className="space-y-3 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              FOTOS DO VEÍCULO / AVARIAS (ATÉ 5 FOTOS)
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {photoPreviews.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700 group">
                  <Image
                    src={url}
                    alt={`Prévia ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 33vw, 20vw"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 z-10 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-800/40 flex flex-col items-center justify-center cursor-pointer transition p-2 text-center group">
                  <Camera className="w-6 h-6 text-zinc-400 group-hover:text-blue-400 mb-1" />
                  <span className="text-[11px] text-zinc-400 font-medium">Tirar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="space-y-1.5 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              OBSERVAÇÕES OU AVARIAS
            </label>
            <textarea
              rows={3}
              placeholder="Descreva arranhões, barulhos ou itens com defeito..."
              {...register('observacoes')}
              className="w-full p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={!isValid || uploading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando Dados e Fotos...</span>
              </>
            ) : (
              <span>Finalizando Inspeção...</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}