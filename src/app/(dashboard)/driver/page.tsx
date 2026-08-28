'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  useForm,
  useWatch,
  type FieldPath,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Camera,
  Car,
  Check,
  CheckCircle2,
  Loader2,
  LogOut,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

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

type InspectionItemId =
  (typeof INSPECTION_ITEMS)[number]['id']

const itemsShape = INSPECTION_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = z.enum(['SIM', 'NÃO'], {
      required_error: `Selecione SIM ou NÃO para ${item.label}`,
    })

    return acc
  },
  {} as Record<
    InspectionItemId,
    z.ZodEnum<['SIM', 'NÃO']>
  >
)

const checklistSchema = z.object({
  vehiclePlate: z
    .string()
    .min(1, 'Informe a placa do veículo'),

  kmAtual: z
    .string()
    .min(1, 'A quilometragem é obrigatória')
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) &&
        Number(value) > 0,
      {
        message: 'Informe um valor numérico válido para o KM',
      }
    ),

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
  mileage?: number | null
  driver_id: string | null
  current_branch_id: string | null
}

export default function DriverPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const router = useRouter()

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] =
    useState<string[]>([])

  const [uploading, setUploading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [vehicle, setVehicle] =
    useState<VehicleData | null>(null)

  const [loadingVehicle, setLoadingVehicle] =
    useState(true)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: {
      errors,
      isValid,
    },
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    mode: 'onChange',

    defaultValues: {
      vehiclePlate: '',
      kmAtual: '',
      observacoes: '',
    },
  })

  const selectedItems = useWatch({
    control,
    name: 'items',
  })

  useEffect(() => {
    async function fetchVehicle() {
      setLoadingVehicle(true)

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          return
        }

        let vehicleData: VehicleData | null = null

        // 1. Busca pela atribuição oficial //
         const {
          data: assignment,
          error: assignmentError,
        } = await supabase
          .from('driver_vehicle_assignments')
          .select('vehicle_id')
          .eq('driver_id', user.id)
          .is('ended_at', null)
          .maybeSingle()

        if (assignmentError) {
          console.error(
            'Erro ao buscar atribuição:',
            assignmentError
          )
        }

        if (assignment?.vehicle_id) {
          const {
            data,
            error,
          } = await supabase
            .from('vehicles')
            .select(`
              id,
              model,
              plate,
              year,
              status,
              mileage,
              driver_id,
              current_branch_id
            `)
            .eq('id', assignment.vehicle_id)
            .maybeSingle()

          if (error) {
            console.error(
              'Erro ao buscar veículo:',
              error
            )
          } else if (data) {
            vehicleData = data as VehicleData
          }
        }

        // 2. Fallback por driver_id
        if (!vehicleData) {
          const {
            data,
            error,
          } = await supabase
            .from('vehicles')
            .select(`
              id,
              model,
              plate,
              year,
              status,
              mileage,
              driver_id,
              current_branch_id
            `)
            .eq('driver_id', user.id)
            .maybeSingle()

          if (error) {
            console.error(
              'Erro ao buscar veículo por driver_id:',
              error
            )
          } else if (data) {
            vehicleData = data as VehicleData
          }
        }

        // 3. Compatibilidade com registros antigos
        if (!vehicleData && user.email) {
          const {
            data,
            error,
          } = await supabase
            .from('vehicles')
            .select(`
              id,
              model,
              plate,
              year,
              status,
              mileage,
              driver_id,
              current_branch_id
            `)
            .eq('driver_email', user.email)
            .maybeSingle()

          if (error) {
            console.error(
              'Erro ao buscar veículo por e-mail:',
              error
            )
          } else if (data) {
            vehicleData = data as VehicleData
          }
        }

        if (vehicleData) {
          setVehicle(vehicleData)

          setValue(
            'vehiclePlate',
            vehicleData.plate,
            {
              shouldValidate: true,
            }
          )

          if (vehicleData.mileage != null) {
            setValue(
              'kmAtual',
              String(vehicleData.mileage),
              {
                shouldValidate: true,
              }
            )
          }
        }
      } catch (error) {
        console.error(
          'Falha ao carregar veículo:',
          error
        )
      } finally {
        setLoadingVehicle(false)
      }
    }

    void fetchVehicle()
  }, [setValue, supabase])

  function handlePhotoSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (
      !event.target.files ||
      event.target.files.length === 0
    ) {
      return
    }

    const selectedFiles =
      Array.from(event.target.files)

    if (
      photos.length + selectedFiles.length > 5
    ) {
      alert(
        'Você pode anexar no máximo 5 fotos por inspeção.'
      )

      return
    }

    setPhotos((current) => [
      ...current,
      ...selectedFiles,
    ])

    const previews = selectedFiles.map(
      (file) => URL.createObjectURL(file)
    )

    setPhotoPreviews((current) => [
      ...current,
      ...previews,
    ])
  }

  function removePhoto(index: number) {
    const preview = photoPreviews[index]

    if (preview) {
      URL.revokeObjectURL(preview)
    }setPhotos((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    )

    setPhotoPreviews((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    router.push('/login')
    router.refresh()
  }

  async function onSubmit(
    data: ChecklistFormData
  ) {
    setUploading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Usuário não autenticado.'
        )
      }

      if (!vehicle) {
        throw new Error(
          'Nenhum veículo está atribuído ao motorista.'
        )
      }

      if (!vehicle.driver_id) {
        throw new Error(
          'O veículo não possui motorista vinculado.'
        )
      }

      if (!vehicle.current_branch_id) {
        throw new Error(
          'O veículo não possui uma base vinculada.'
        )
      }

      // =====================================================
      // VALIDAÇÃO DE QUILOMETRAGEM
      // =====================================================

      const currentKm = Number(data.kmAtual)
      const previousKm = Number(vehicle.mileage ?? 0)

      if (
        !Number.isFinite(currentKm) ||
        currentKm <= 0
      ) {
        throw new Error(
          'Informe uma quilometragem válida.'
        )
      }

      if (!Number.isInteger(currentKm)) {
        throw new Error(
          'A quilometragem deve ser informada sem casas decimais.'
        )
      }

      if (
        previousKm > 0 &&
        currentKm < previousKm
      ) {
        throw new Error(
          `O KM informado (${currentKm.toLocaleString(
            'pt-BR'
          )}) não pode ser menor que o último KM registrado (${previousKm.toLocaleString(
            'pt-BR'
          )}).`
        )
      }

      const kmDifference =
        currentKm - previousKm

      // Proteção contra erro de digitação
      if (
        previousKm > 0 &&
        kmDifference > 2000
      ) {
        throw new Error(
          `O KM informado está ${kmDifference.toLocaleString(
            'pt-BR'
          )} km acima do último registro. Confira o hodômetro antes de enviar o checklist.`
        )
      }

      // =====================================================
      // UPLOAD DAS FOTOS
      // =====================================================

      const uploadedPhotoUrls: string[] = []

      for (const photo of photos) {
        const fileExt =
          photo.name.split('.').pop() ?? 'jpg'

        const uniqueId =
          crypto.randomUUID()

        const fileName =
          `${user.id}/${uniqueId}.${fileExt}`

        const {
          error: uploadError,
        } = await supabase.storage
          .from('checklist-photos')
          .upload(
            fileName,
            photo,
            {
              cacheControl: '3600',
              upsert: false,
            }
          )

        if (uploadError) {
          throw new Error(
            `Falha no upload da foto: ${uploadError.message}`
          )
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from('checklist-photos')
          .getPublicUrl(fileName)

        uploadedPhotoUrls.push(
          publicUrlData.publicUrl
        )
      }

      // =====================================================
      // ITENS DO CHECKLIST
      // =====================================================

      const formattedItems =
        INSPECTION_ITEMS.map((item) => {
          const value =
            data.items[item.id]

          return {
            name: item.label,
            value,
            ok: value === 'SIM',
          }
        })

      const itensComDefeito =
        formattedItems
          .filter((item) => !item.ok)
          .map((item) => item.name)

      const hasIssue =
        itensComDefeito.length > 0
        let observacaoFinal =
        data.observacoes?.trim() ?? ''

      if (hasIssue) {
        observacaoFinal =
          `Itens incorretos/ausentes: ${itensComDefeito.join(
            ', '
          )}. KM: ${currentKm}. ${observacaoFinal}`.trim()
      } else {
        observacaoFinal =
          `KM Atual registrado: ${currentKm}. ${observacaoFinal}`.trim()
      }

      const today =
        new Date()
          .toISOString()
          .slice(0, 10)

      // =====================================================
      // SALVAR CHECKLIST
      // =====================================================

      const {
        error: insertError,
      } = await supabase
        .from('driver_checklists')
        .insert({
          id: crypto.randomUUID(),

          user_id: user.id,
          driver_id: vehicle.driver_id,
          vehicle_id: vehicle.id,
          branch_id:
            vehicle.current_branch_id,

          driver:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Motorista',

          driver_email:
            user.email ?? '',

          vehicle_model:
            vehicle.model,

          vehicle_plate:
            vehicle.plate.toUpperCase(),

          km_atual:
            currentKm,

          checklist_date:
            today,

          items:
            formattedItems,

          has_issue:
            hasIssue,

          observation:
            observacaoFinal,

          photos:
            uploadedPhotoUrls,
        })

      if (insertError) {
        throw insertError
      }

      // =====================================================
      // ATUALIZAR VEÍCULO
      // =====================================================

      const updatePayload:
        Record<string, unknown> = {
          mileage: currentKm,
          updated_at:
            new Date().toISOString(),
        }

      if (hasIssue) {
        updatePayload.status =
          'Manutenção'

        updatePayload.issues =
          observacaoFinal
      }

      const {
        error: updateVehicleError,
      } = await supabase
        .from('vehicles')
        .update(updatePayload)
        .eq('id', vehicle.id)

      if (updateVehicleError) {
        console.error(
          'Erro ao atualizar veículo:',
          updateVehicleError
        )
      }

      // =====================================================
      // CRIAR MANUTENÇÃO SE HOUVER OCORRÊNCIA
      // =====================================================

      if (hasIssue) {
        const {
          error: maintenanceError,
        } = await supabase
          .from('maintenance_records')
          .insert({
            vehicle_id:
              vehicle.id,

            branch_id:
              vehicle.current_branch_id,

            vehicle_plate:
              vehicle.plate.toUpperCase(),

            opened_by:
              user.id,

            mechanic_name:
              'Aguardando Atribuição',

            service_description:
              `Manutenção necessária identificada na inspeção: ${itensComDefeito.join(
                ', '
              )}`,

            maintenance_type:
              'corretiva',

            mileage:
              currentKm,

            cost: 0,
            labor_cost: 0,
            parts_cost: 0,
            total_cost: 0,

            notes:
              `${observacaoFinal}`,
          })

        if (maintenanceError) {
          console.error(
            'Erro ao criar manutenção:',
            maintenanceError
          )
        }
      }

      // =====================================================
      // SUCESSO
      // =====================================================

      setSuccessMsg(
        hasIssue
          ? 'Checklist enviado. Uma ocorrência de manutenção foi registrada.'
          : 'Checklist enviado com sucesso! Boa viagem.'
      )

      photoPreviews.forEach(
        (url) =>
          URL.revokeObjectURL(url)
      )

      setPhotos([])
      setPhotoPreviews([])
      setVehicle((current) =>
        current
          ? {
              ...current,
              mileage: currentKm,
              status:
                hasIssue
                  ? 'Manutenção'
                  : current.status,
            }
          : null
      )

      reset({
        vehiclePlate:
          vehicle.plate,

        kmAtual:
          String(currentKm),

        observacoes: '',
      })
    } catch (error: unknown) {
      console.error(
        'Erro ao enviar checklist:',
        error
      )

      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Erro ao enviar checklist.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f17] p-4 text-white md:p-8">
      <div className="mx-auto w-full max-w-2xl">

        {/* CABEÇALHO */}

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />

              Inspeção Pré-Viagem
            </h1>

            <p className="text-xs text-zinc-400">
              Verificação de Segurança Veicular
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-xl bg-zinc-800 p-2 text-xs text-zinc-300 transition hover:bg-zinc-700"
          >
            <LogOut className="h-4 w-4" />

            Sair
          </button>
        </div>

        {/* VEÍCULO */}

        {loadingVehicle ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />

            <span className="text-sm text-zinc-400">
              Carregando dados do veículo...
            </span>
          </div>
        ) : vehicle ? (
          <div className="mb-4 rounded-xl border border-blue-500/20 bg-zinc-900 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 shrink-0 text-blue-500" />

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold text-white">
                    {vehicle.model}
                  </span>

                  <span className="text-zinc-600">
                    |
                  </span>

                  <span className="font-mono font-bold text-blue-400">
                    {vehicle.plate}
                  </span>

                  <span className="text-zinc-600">
                    |
                  </span>

                  <span className="text-zinc-400">
                    {vehicle.year}
                  </span>
                </div>
              </div>

              <span
                className={[
                  'w-fit rounded-full border px-2.5 py-1 text-xs font-semibold',
                  vehicle.status ===
                  'Manutenção'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                ].join(' ')}
              >
                {vehicle.status || 'Ativo'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />

            <span className="text-sm">
              Nenhum veículo atribuído a você. Entre em contato com o gestor.
            </span>
          </div>
        )}

        {/* SUCESSO */}
{successMsg && (
  <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
    <Check className="h-5 w-5 shrink-0" />
    {successMsg}
  </div>
)}

{/* ERRO */}
{errorMsg && (
  <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400">
    <AlertTriangle className="h-5 w-5 shrink-0" />
    {errorMsg}
  </div>
)}{/* FORMULÁRIO */}
<form
  onSubmit={handleSubmit(onSubmit)}
  className="space-y-6"
>
  {/* PLACA E KM */}
  <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 md:grid-cols-2">
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-zinc-400">
        Placa do veículo *
      </label>

      <input
        type="text"
        readOnly
        {...register('vehiclePlate')}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 uppercase text-white outline-none"
      />

      {errors.vehiclePlate && (
        <p className="text-xs text-red-400">
          {errors.vehiclePlate.message}
        </p>
      )}
    </div>

    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-zinc-400">
        KM Atual *
      </label>

      {vehicle?.mileage != null && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <p className="text-xs text-zinc-400">
            Último KM registrado
          </p>

          <p className="mt-0.5 text-sm font-bold text-blue-400">
            {Number(vehicle.mileage).toLocaleString('pt-BR')} km
          </p>
        </div>
      )}

      <input
        type="number"
        min={vehicle?.mileage ?? 0}
        step="1"
        inputMode="numeric"
        placeholder="Ex: 120600"
        {...register('kmAtual')}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />

      <p className="text-[11px] leading-4 text-zinc-500">
        Informe a quilometragem atual exibida no painel do veículo.
      </p>

      {errors.kmAtual && (
        <p className="text-xs font-medium text-red-400">
          {errors.kmAtual.message}
        </p>
      )}
    </div>
  </div>

  {/* ITENS */}
  <div className="space-y-3">
    <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
      Itens de inspeção
    </h2>

    <div className="space-y-2.5">
      {INSPECTION_ITEMS.map((item) => {
        const fieldName =
          `items.${item.id}` as FieldPath<ChecklistFormData>

        const selectedValue =
          selectedItems?.[item.id]

        return (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#141824] p-4 transition hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-bold tracking-wide text-zinc-200">
              {item.label}
            </span>

            <div className="flex items-center gap-2">
              <label
                className={[
                  'cursor-pointer rounded-xl border px-4 py-1.5 text-xs font-bold transition',
                  selectedValue === 'SIM'
                    ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                ].join(' ')}
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
                className={[
                  'cursor-pointer rounded-xl border px-4 py-1.5 text-xs font-bold transition',
                  selectedValue === 'NÃO'
                    ? 'border-red-500 bg-red-600/90 text-white shadow-md shadow-red-600/20'
                    : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                ].join(' ')}
              >
                <input
                  type="radio"
                  value="NÃO"
                  {...register(fieldName)}
                  className="hidden"
                />NÃO
              </label>
            </div>
          </div>
        )
      })}
    </div>
  </div>

  {/* FOTOS */}
  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
      Fotos do veículo / avarias (até 5)
    </label>

    <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
      {photoPreviews.map((url, index) => (
        <div
          key={url}
          className="relative aspect-square overflow-hidden rounded-xl border border-zinc-700"
        >
          <Image
            src={url}
            alt={`Prévia ${index + 1}`}
            fill
            sizes="(max-width: 768px) 33vw, 20vw"
            className="object-cover"
            unoptimized
          />

          <button
            type="button"
            onClick={() => removePhoto(index)}
            className="absolute right-1 top-1 z-10 rounded-full bg-red-600/80 p-1 text-white transition hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {photos.length < 5 && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/40 p-2 text-center transition hover:border-blue-500">
          <Camera className="mb-1 h-6 w-6 text-zinc-400" />

          <span className="text-[11px] font-medium text-zinc-400">
            Tirar foto
          </span>

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
  <div className="space-y-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
      Observações ou avarias
    </label>

    <textarea
      rows={3}
      placeholder="Descreva arranhões, barulhos ou itens com defeito..."
      {...register('observacoes')}
      className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/60 p-3 text-white outline-none placeholder:text-zinc-500 focus:border-blue-500"
    />
  </div>

  {/* BOTÃO */}
  <button
    type="submit"
    disabled={!isValid || uploading || !vehicle}
    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {uploading ? (
      <>
        <Loader2 className="h-5 w-5 animate-spin" />
        Enviando checklist...
      </>
    ) : (
      <>
        <CheckCircle2 className="h-5 w-5" />
        Enviar checklist
      </>
    )}
  </button>
</form>

    </div>
  </div>
)
}