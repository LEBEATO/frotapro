'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useForm,
  useWatch,
  type FieldPath,
} from 'react-hook-form'

import {
  zodResolver,
} from '@hookform/resolvers/zod'

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

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// ITENS DO CHECKLIST
// =====================================================

const INSPECTION_ITEMS = [
  {
    id: 'limpadorParabrisa',
    label: 'LIMPADOR PARABRISA',
  },
  {
    id: 'buzina',
    label: 'BUZINA',
  },
  {
    id: 'farois',
    label: 'FARÓIS',
  },
  {
    id: 'lanternasDianteiras',
    label: 'LANTERNAS DIANTEIRAS',
  },
  {
    id: 'lanternasTraseiras',
    label: 'LANTERNAS TRASEIRAS',
  },
  {
    id: 'setasDianteiras',
    label: 'SETAS DIANTEIRAS',
  },
  {
    id: 'setasTraseiras',
    label: 'SETAS TRASEIRAS',
  },
  {
    id: 'luzFreio',
    label: 'LUZ DE FREIO',
  },
  {
    id: 'luzRe',
    label: 'LUZ DE RÉ',
  },
  {
    id: 'triangulo',
    label: 'TRIÂNGULO',
  },
  {
    id: 'macaco',
    label: 'MACACO',
  },
  {
    id: 'chaveRoda',
    label: 'CHAVE DE RODA',
  },
  {
    id: 'espelhosRetrovisores',
    label: 'ESPELHOS RETROVISORES',
  },
  {
    id: 'painel',
    label: 'PAINEL',
  },
  {
    id: 'pneus',
    label: 'PNEUS',
  },
  {
    id: 'estepe',
    label: 'ESTEPE',
  },
  {
    id: 'vidros',
    label: 'VIDROS',
  },
  {
    id: 'tapetes',
    label: 'TAPETES',
  },
  {
    id: 'lataria',
    label: 'LATARIA',
  },
  {
    id: 'plotagem',
    label: 'PLOTAGEM (ADESIVO)',
  },
  {
    id: 'suporteEscada',
    label: 'SUPORTE DE ESCADA',
  },
] as const

type InspectionItemId =
  (typeof INSPECTION_ITEMS)[number]['id']

const itemsShape =
  INSPECTION_ITEMS.reduce(
    (acc, item) => {
      acc[item.id] =
        z.enum(
          [
            'SIM',
            'NÃO',
          ],
          {
            required_error:
              `Selecione SIM ou NÃO para ${item.label}`,
          }
        )

      return acc
    },
    {} as Record<
      InspectionItemId,
      z.ZodEnum<
        [
          'SIM',
          'NÃO',
        ]
      >
    >
  )

// =====================================================
// VALIDAÇÃO
// =====================================================

const checklistSchema =
  z.object({
    vehiclePlate:
      z
        .string()
        .min(
          1,
          'Informe a placa do veículo'
        ),

    kmAtual:
      z
        .string()
        .min(
          1,
          'A quilometragem é obrigatória'
        )
        .refine(
          (value) =>
            !Number.isNaN(
              Number(value)
            ) &&
            Number(value) > 0,
          {
            message:
              'Informe um valor numérico válido para o KM',
          }
        ),

    items:
      z.object(
        itemsShape
      ),

    observacoes:
      z
        .string()
        .optional(),
  })

type ChecklistFormData =
  z.infer<
    typeof checklistSchema
  >

// =====================================================
// VEÍCULO
// =====================================================

type VehicleData = {
  id: string
  model: string
  plate: string
  year: string
  status: string
  mileage: number | null
  current_branch_id: string | null
}

type DriverProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

// =====================================================
// PÁGINA
// =====================================================

export default function DriverChecklistPage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )

  const router =
    useRouter()

  const [
    photos,
    setPhotos,
  ] =
    useState<
      File[]
    >([])

  const [
    photoPreviews,
    setPhotoPreviews,
  ] =
    useState<
      string[]
    >([])

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [
    successMsg,
    setSuccessMsg,
  ] =
    useState('')

  const [
    errorMsg,
    setErrorMsg,
  ] =
    useState('')

  const [
    vehicle,
    setVehicle,
  ] =
    useState<
      VehicleData | null
    >(null)

  const [
    loadingVehicle,
    setLoadingVehicle,
  ] =
    useState(true)

  const [
    profile,
    setProfile,
  ] =
    useState<
      DriverProfile | null
    >(null)

  const [
    submissionId,
    setSubmissionId,
  ] = useState(
    () =>
      crypto.randomUUID()
  )

  const submissionInFlightRef =
    useRef(false)

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
  } =
    useForm<
      ChecklistFormData
    >({
      resolver:
        zodResolver(
          checklistSchema
        ),

      mode:
        'onChange',

      defaultValues: {
        vehiclePlate:
          '',
        kmAtual:
          '',
        observacoes:
          '',
      },
    })

  const selectedItems =
    useWatch({
      control,
      name:
        'items',
    })

  // =====================================================
  // CARREGAR VEÍCULO
  // =====================================================

  useEffect(() => {
    let mounted =
      true

    async function fetchVehicle() {
      setLoadingVehicle(
        true
      )

      setErrorMsg(
        ''
      )

      try {
        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase
            .auth
            .getUser()

        if (
          userError ||
          !user
        ) {
          throw new Error(
            'Usuário não autenticado.'
          )
        }

        const {
          data:
            profileData,
          error:
            profileError,
        } =
          await supabase
            .from(
              'profiles'
            )
            .select(
              'id, full_name, email, role, branch_id, active'
            )
            .eq(
              'id',
              user.id
            )
            .single()

        if (
          profileError ||
          !profileData
        ) {
          throw new Error(
            'Perfil do motorista não encontrado.'
          )
        }

        const driverProfile =
          profileData as DriverProfile

        if (
          !driverProfile.active ||
          driverProfile.role !==
            'driver' ||
          !driverProfile.branch_id
        ) {
          throw new Error(
            'O perfil do motorista não está ativo ou não possui base válida.'
          )
        }

        const {
          data:
            assignment,
          error:
            assignmentError,
        } =
          await supabase
            .from(
              'driver_vehicle_assignments'
            )
            .select(
              'vehicle_id, branch_id'
            )
            .eq(
              'driver_id',
              user.id
            )
            .is(
              'ended_at',
              null
            )
            .maybeSingle()

        if (assignmentError) {
          throw assignmentError
        }

        if (!assignment) {
          if (mounted) {
            setProfile(
              driverProfile
            )
            setVehicle(null)
          }

          return
        }

        if (
          assignment.branch_id !==
          driverProfile.branch_id
        ) {
          throw new Error(
            'A atribuição ativa pertence a uma base diferente do motorista.'
          )
        }

        const {
          data:
            vehicleData,
          error:
            vehicleError,
        } =
          await supabase
            .from(
              'vehicles'
            )
            .select(`
              id,
              model,
              plate,
              year,
              status,
              mileage,
              current_branch_id
            `)
            .eq(
              'id',
              assignment.vehicle_id
            )
            .single()

        if (
          vehicleError ||
          !vehicleData
        ) {
          throw new Error(
            'Veículo da atribuição ativa não encontrado.'
          )
        }

        if (
          vehicleData.current_branch_id !==
          driverProfile.branch_id
        ) {
          throw new Error(
            'O veículo atribuído pertence a uma base diferente do motorista.'
          )
        }

        if (
          !mounted
        ) {
          return
        }

        setProfile(
          driverProfile
        )
        setVehicle(
          vehicleData as VehicleData
        )

        setValue(
          'vehiclePlate',
          vehicleData.plate,
          {
            shouldValidate:
              true,
          }
        )

        if (
          vehicleData
            .mileage !=
          null
        ) {
          setValue(
            'kmAtual',
            String(
              vehicleData.mileage
            ),
            {
              shouldValidate:
                true,
            }
          )
        }
      } catch (
        error
      ) {
        console.error(
          'Falha ao carregar veículo:',
          error
        )

        if (
          mounted
        ) {
          setErrorMsg(
            error instanceof
              Error
              ? error.message
              : 'Erro ao carregar veículo.'
          )
        }
      } finally {
        if (
          mounted
        ) {
          setLoadingVehicle(
            false
          )
        }
      }
    }

    void fetchVehicle()

    return () => {
      mounted =
        false
    }
  }, [
    setValue,
    supabase,
  ])

  // =====================================================
  // FOTOS
  // =====================================================

  function handlePhotoSelect(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    if (
      !event
        .target
        .files ||
      event
        .target
        .files
        .length ===
        0
    ) {
      return
    }

    const selectedFiles =
      Array.from(
        event
          .target
          .files
      )

    if (
      photos.length +
        selectedFiles.length >
      5
    ) {
      setErrorMsg(
        'Você pode anexar no máximo 5 fotos por inspeção.'
      )

      return
    }

    setPhotos(
      (current) => [
        ...current,
        ...selectedFiles,
      ]
    )

    const previews =
      selectedFiles.map(
        (file) =>
          URL.createObjectURL(
            file
          )
      )

    setPhotoPreviews(
      (current) => [
        ...current,
        ...previews,
      ]
    )
  }

  function removePhoto(
    index: number
  ) {
    const preview =
      photoPreviews[
        index
      ]

    if (preview) {
      URL.revokeObjectURL(
        preview
      )
    }

    setPhotos(
      (current) =>
        current.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    )

    setPhotoPreviews(
      (current) =>
        current.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    )
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    await supabase
      .auth
      .signOut()

    router.push(
      '/login'
    )

    router.refresh()
  }

  // =====================================================
  // ENVIAR CHECKLIST
  // =====================================================

  async function onSubmit(
    data:
      ChecklistFormData
  ) {
    setUploading(
      true
    )

    setErrorMsg(
      ''
    )

    setSuccessMsg(
      ''
    )

    try {
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase
          .auth
          .getUser()

      if (
        userError ||
        !user
      ) {
        throw new Error(
          'Usuário não autenticado.'
        )
      }

      if (
        !vehicle ||
        !profile
      ) {
        throw new Error(
          'Nenhum veículo está atribuído ao motorista.'
        )
      }

      if (
        !vehicle
          .current_branch_id
      ) {
        throw new Error(
          'O veículo não possui uma base vinculada.'
        )
      }

      // ===============================================
      // KM
      // ===============================================

      const currentKm =
        Number(
          data.kmAtual
        )

      const previousKm =
        Number(
          vehicle.mileage ??
            0
        )

      if (
        !Number.isFinite(
          currentKm
        ) ||
        currentKm <=
          0
      ) {
        throw new Error(
          'Informe uma quilometragem válida.'
        )
      }

      if (
        !Number.isInteger(
          currentKm
        )
      ) {
        throw new Error(
          'A quilometragem deve ser informada sem casas decimais.'
        )
      }

      if (
        previousKm >
          0 &&
        currentKm <
          previousKm
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
        currentKm -
        previousKm

      if (
        previousKm >
          0 &&
        kmDifference >
          2000
      ) {
        setErrorMsg(
          `O KM informado está ${kmDifference.toLocaleString(
            'pt-BR'
          )} km acima do último registro. Confira o hodômetro antes de enviar o checklist.`
        )

        return
      }

      // ===============================================
      // UPLOAD DAS FOTOS
      // ===============================================

      const uploadedPhotoUrls:
        string[] =
        []

      for (
        const photo of
        photos
      ) {
        const fileExt =
          photo
            .name
            .split('.')
            .pop() ??
          'jpg'

        const uniqueId =
          crypto.randomUUID()

        const fileName =
          `${user.id}/${uniqueId}.${fileExt}`

        const {
          error:
            uploadError,
        } =
          await supabase
            .storage
            .from(
              'checklist-photos'
            )
            .upload(
              fileName,
              photo,
              {
                cacheControl:
                  '3600',
                upsert:
                  false,
              }
            )

        if (
          uploadError
        ) {
          throw new Error(
            `Falha no upload da foto: ${uploadError.message}`
          )
        }

        const {
          data:
            publicUrlData,
        } =
          supabase
            .storage
            .from(
              'checklist-photos'
            )
            .getPublicUrl(
              fileName
            )

        uploadedPhotoUrls.push(
          publicUrlData.publicUrl
        )
      }

      // ===============================================
      // FORMATAR ITENS
      // ===============================================

      const formattedItems =
        INSPECTION_ITEMS.map(
          (item) => {
            const value =
              data.items[
                item.id
              ]

            return {
              name:
                item.label,
              value,
              ok:
                value ===
                'SIM',
            }
          }
        )

      const itensComDefeito =
        formattedItems
          .filter(
            (item) =>
              !item.ok
          )
          .map(
            (item) =>
              item.name
          )

      const hasIssue =
        itensComDefeito.length >
        0

      let observacaoFinal =
        data.observacoes
          ?.trim() ??
        ''

      if (
        hasIssue
      ) {
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
          .slice(
            0,
            10
          )

      // ===============================================
      // SALVAR NO BANCO
      // ===============================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            'driver_checklists'
          )
          .insert({
            id:
              submissionId,

            user_id:
              user.id,

            driver_id:
              user.id,

            vehicle_id:
              vehicle.id,

            branch_id:
              profile.branch_id,

            driver:
              profile.full_name,

            driver_email:
              profile.email,

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

      if (
        insertError
      ) {
        if (
          insertError.code !==
          '23505'
        ) {
          throw insertError
        }

        const {
          data:
            existingSubmission,
          error:
            existingError,
        } =
          await supabase
            .from(
              'driver_checklists'
            )
            .select('id')
            .eq(
              'id',
              submissionId
            )
            .eq(
              'user_id',
              user.id
            )
            .maybeSingle()

        if (
          existingError ||
          !existingSubmission
        ) {
          throw insertError
        }
      }

      // O trigger do banco já atualiza:
      // vehicles.mileage
      // vehicles.status
      // vehicles.issues
      // maintenance_records

      setSuccessMsg(
        hasIssue
          ? 'Checklist enviado. Uma ocorrência de manutenção foi registrada.'
          : 'Checklist enviado com sucesso! Boa viagem.'
      )

      photoPreviews.forEach(
        (url) =>
          URL.revokeObjectURL(
            url
          )
      )

      setPhotos(
        []
      )

      setPhotoPreviews(
        []
      )

      setSubmissionId(
        crypto.randomUUID()
      )

      setVehicle(
        (current) =>
          current
            ? {
                ...current,

                mileage:
                  currentKm,

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
          String(
            currentKm
          ),

        observacoes:
          '',
      })
    } catch (
      error:
        unknown
    ) {
      console.error(
        'Erro ao enviar checklist:',
        error
      )

      setErrorMsg(
        error instanceof
          Error
          ? error.message
          : 'Erro ao enviar checklist.'
      )
    } finally {
      setUploading(
        false
      )
    }
  }

  function handleChecklistFormSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    if (
      submissionInFlightRef.current
    ) {
      event.preventDefault()
      return
    }

    submissionInFlightRef.current =
      true

    void handleSubmit(
      onSubmit
    )(event).finally(
      () => {
        submissionInFlightRef.current =
          false
      }
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* CABEÇALHO */}

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

          <div>

            <p className="text-sm font-semibold text-blue-400">
              Operação do motorista
            </p>

            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">

              <CheckCircle2 className="h-6 w-6 text-blue-500" />

              Checklist diário

            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Faça a inspeção do veículo antes de iniciar a viagem.
            </p>

          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />

            Sair
          </button>

        </section>

        {/* VEÍCULO */}

        {loadingVehicle ? (
          <section className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />

            <span className="text-sm text-zinc-400">
              Carregando veículo...
            </span>

          </section>
        ) : vehicle ? (
          <section className="rounded-2xl border border-blue-500/20 bg-zinc-900/60 p-5 sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                  <Car className="h-5 w-5" />
                </div>

                <div>

                  <p className="font-semibold text-white">
                    {vehicle.model}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {vehicle.plate} • {vehicle.year}
                  </p>

                </div>

              </div>

              <span
                className={[
                  'w-fit rounded-full border px-3 py-1.5 text-xs font-semibold',

                  vehicle.status ===
                  'Manutenção'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                ].join(
                  ' '
                )}
              >
                {vehicle.status ||
                  'Ativo'}
              </span>

            </div>

          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-400">

            <AlertTriangle className="h-5 w-5 shrink-0" />

            <span className="text-sm">
              Nenhum veículo atribuído a você. Entre em contato com o gestor.
            </span>

          </section>
        )}

        {/* SUCESSO */}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">

            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            {successMsg}

          </div>
        )}

        {/* ERRO */}

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            {errorMsg}

          </div>
        )}

        {/* FORMULÁRIO */}

        {vehicle && (
          <form
            onSubmit={
              handleChecklistFormSubmit
            }
            className="space-y-6"
          >

            {/* PLACA + KM */}

            <section className="grid grid-cols-1 gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 md:grid-cols-2">

              <div className="space-y-2">

                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Placa do veículo
                </label>

                <input
                  type="text"
                  readOnly
                  {...register(
                    'vehiclePlate'
                  )}
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 uppercase text-zinc-300 outline-none"
                />

                {errors
                  .vehiclePlate && (
                  <p className="text-xs text-red-400">
                    {
                      errors
                        .vehiclePlate
                        .message
                    }
                  </p>
                )}

              </div>

              <div className="space-y-2">

                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  KM atual
                </label>

                {vehicle
                  .mileage !=
                  null && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">

                    <p className="text-xs text-zinc-500">
                      Último KM registrado
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-blue-400">
                      {Number(
                        vehicle.mileage
                      ).toLocaleString(
                        'pt-BR'
                      )}{' '}
                      km
                    </p>

                  </div>
                )}

                <input
                  type="number"
                  min={
                    vehicle
                      .mileage ??
                    0
                  }
                  step="1"
                  inputMode="numeric"
                  placeholder="Ex: 120600"
                  {...register(
                    'kmAtual'
                  )}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                {errors
                  .kmAtual && (
                  <p className="text-xs text-red-400">
                    {
                      errors
                        .kmAtual
                        .message
                    }
                  </p>
                )}

              </div>

            </section>

            {/* ITENS */}

            <section className="space-y-4">

              <div>

                <h2 className="font-semibold text-white">
                  Itens de inspeção
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Marque SIM quando o item estiver em condições adequadas.
                </p>

              </div>

              <div className="space-y-3">

                {INSPECTION_ITEMS.map(
                  (item) => {
                    const fieldName =
                      `items.${item.id}` as FieldPath<ChecklistFormData>

                    const selectedValue =
                      selectedItems?.[
                        item.id
                      ]

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <span className="text-sm font-semibold text-zinc-200">
                          {
                            item.label
                          }
                        </span>

                        <div className="flex items-center gap-2">

                          <label
                            className={[
                              'cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition',

                              selectedValue ===
                              'SIM'
                                ? 'border-emerald-500 bg-emerald-600 text-white'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-800',
                            ].join(
                              ' '
                            )}
                          >

                            <input
                              type="radio"
                              value="SIM"
                              {...register(
                                fieldName
                              )}
                              className="hidden"
                            />

                            SIM

                          </label>

                          <label
                            className={[
                              'cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition',

                              selectedValue ===
                              'NÃO'
                                ? 'border-red-500 bg-red-600 text-white'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-800',
                            ].join(
                              ' '
                            )}
                          >

                            <input
                              type="radio"
                              value="NÃO"
                              {...register(
                                fieldName
                              )}
                              className="hidden"
                            />

                            NÃO

                          </label>

                        </div>

                      </div>
                    )
                  }
                )}

              </div>

            </section>

            {/* FOTOS */}

            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

              <div>

                <h2 className="font-semibold text-white">
                  Fotos do veículo
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Opcional. Anexe até 5 fotos de avarias ou irregularidades.
                </p>

              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">

                {photoPreviews.map(
                  (
                    url,
                    index
                  ) => (
                    <div
                      key={
                        url
                      }
                      className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800"
                    >

                      <Image
                        src={
                          url
                        }
                        alt={`Prévia ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 33vw, 20vw"
                        className="object-cover"
                        unoptimized
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removePhoto(
                            index
                          )
                        }
                        className="absolute right-1 top-1 z-10 rounded-full bg-red-600/90 p-1.5 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  )
                )}

                {photos.length <
                  5 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/40 p-2 text-center transition hover:border-blue-500">

                    <Camera className="mb-2 h-6 w-6 text-zinc-500" />

                    <span className="text-[11px] font-medium text-zinc-400">
                      Adicionar foto
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={
                        handlePhotoSelect
                      }
                      className="hidden"
                    />

                  </label>
                )}

              </div>

            </section>

            {/* OBSERVAÇÃO */}

            <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

              <div>

                <h2 className="font-semibold text-white">
                  Observações
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Informe avarias, ruídos ou qualquer irregularidade identificada.
                </p>

              </div>

              <textarea
                rows={
                  4
                }
                placeholder="Descreva aqui..."
                {...register(
                  'observacoes'
                )}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

            </section>

            <button
              type="submit"
              disabled={
                !isValid ||
                uploading ||
                !vehicle
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
        )}

      </div>
    </AppShell>
  )
}
