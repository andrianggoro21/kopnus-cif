import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  useForm,
  useWatch,
} from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ResultSkeleton } from '@/components/ResultSkeleton'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, checkCif } from '@/lib/api'
import { formatInteger } from '@/lib/format'
import { LOAN_LABELS, MARITAL_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  applicantSchema,
  type CifCheckBody,
  type FormValues,
  LOAN_TYPES,
  localToday,
  MARITAL_STATUSES,
  TENORS,
} from '@/lib/validation'

const EMPTY: FormValues = {
  full_name: '',
  nik: '',
  dob: '',
  phone: '',
  marital_status: '',
  spouse_name: '',
  spouse_forgotten: false,
  loan_type: '',
  loan_amount: '',
  loan_tenor_months: '',
}

const STEPS = ['Isi data diri dan pinjaman', 'Data diperiksa otomatis', 'Unggah dokumen bila diminta']

const INPUT = 'h-10'
const SELECT = 'w-full [&>select]:h-10'

type TextFieldName = Exclude<FieldPath<FormValues>, 'spouse_forgotten'>

type ControlProps = Omit<ControllerRenderProps<FormValues, TextFieldName>, 'value'> & {
  value: string
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

function FormField({
  control,
  name,
  label,
  description,
  className,
  children,
}: {
  control: Control<FormValues, unknown, CifCheckBody>
  name: TextFieldName
  label: string
  description?: string
  className?: string
  children: (props: ControlProps) => ReactNode
}) {
  const id = `field-${name}`
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {children({
            ...field,
            value: field.value as string,
            id,
            'aria-invalid': fieldState.invalid,
            'aria-describedby': [descriptionId, fieldState.invalid && errorId].filter(Boolean).join(' ') || undefined,
          })}
          {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
          <FieldError id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

function SectionLegend({ number, children }: { number: number; children: ReactNode }) {
  return (
    <FieldLegend className="mb-1 flex items-center gap-3 text-lg font-semibold">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
        {number}
      </span>
      {children}
    </FieldLegend>
  )
}

export default function ApplyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormValues, unknown, CifCheckBody>({
    resolver: zodResolver(applicantSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  })
  const { control, setValue, setError } = form
  const marital = useWatch({ control, name: 'marital_status' })
  const forgotten = useWatch({ control, name: 'spouse_forgotten' })
  const married = marital === 'KAWIN'

  const check = useMutation({
    mutationFn: checkCif,
    onSuccess: (application) => {
      queryClient.setQueryData(['application', application.application_id], application)
      navigate(`/applications/${application.application_id}`)
    },
    onError: (error) => {
      if (!(error instanceof ApiError) || error.status !== 422 || !error.errors) return
      Object.entries(error.errors).forEach(([name, messages], index) =>
        setError(name as TextFieldName, { type: 'server', message: messages[0] }, { shouldFocus: index === 0 }),
      )
    },
  })

  const failure = check.error instanceof ApiError && check.error.status === 422 ? null : check.error
  const failureMessage =
    failure instanceof ApiError && failure.status === 429
      ? 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'
      : failure?.message

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-8">
      <aside className="flex flex-col justify-between gap-10 rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8 lg:sticky lg:top-6 lg:min-h-[calc(100dvh-3.5rem-3rem)]">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Ajukan pinjaman</h1>
          <p className="max-w-prose text-primary-foreground/80">
            Data Anda dicocokkan dengan data anggota koperasi. Hasilnya langsung tampil setelah Anda menekan Periksa
            data.
          </p>
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary-foreground/40 text-sm font-semibold">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-3 border-t border-primary-foreground/20 pt-6 text-sm">
          <p className="font-semibold">Dokumen yang mungkin diminta</p>
          <p className="text-primary-foreground/80">
            KTP, NPWP, slip gaji, atau buku nikah dalam bentuk JPG, PNG, atau PDF. Siapkan agar bisa langsung diunggah
            bila data Anda perlu diverifikasi.
          </p>
        </div>
      </aside>

      <section className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm sm:p-8 lg:min-h-[calc(100dvh-3.5rem-3rem)] lg:p-10">
        {check.isPending && <ResultSkeleton label="Memeriksa data Anda…" />}

        <form
          noValidate
          onSubmit={form.handleSubmit((body) => check.mutate(body))}
          className={cn('flex flex-1 flex-col gap-10', check.isPending && 'hidden')}
        >
          {failure && (
            <Alert variant="destructive">
              <AlertTitle>Pemeriksaan belum berhasil</AlertTitle>
              <AlertDescription>{failureMessage}</AlertDescription>
              <AlertAction>
                <Button type="button" variant="outline" size="sm" onClick={() => check.mutate(check.variables!)}>
                  Coba lagi
                </Button>
              </AlertAction>
            </Alert>
          )}

          <FieldSet className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <SectionLegend number={1}>Data diri</SectionLegend>
            <FormField
              control={control}
              name="full_name"
              label="Nama lengkap"
              description="Sesuai KTP. Gelar boleh ditulis."
              className="md:col-span-2"
            >
              {(props) => <Input {...props} className={INPUT} autoComplete="name" />}
            </FormField>
            <FormField control={control} name="nik" label="NIK" description="16 digit sesuai KTP.">
              {(props) => <Input {...props} className={INPUT} inputMode="numeric" autoComplete="off" maxLength={19} />}
            </FormField>
            <FormField control={control} name="dob" label="Tanggal lahir">
              {(props) => <Input {...props} className={INPUT} type="date" max={localToday()} />}
            </FormField>
            <FormField
              control={control}
              name="phone"
              label="Nomor HP (opsional)"
              description="Diawali 08, 628, atau +628."
            >
              {(props) => <Input {...props} className={INPUT} type="tel" autoComplete="tel" />}
            </FormField>
            <FormField control={control} name="marital_status" label="Status perkawinan">
              {({ onChange, ...props }) => (
                <NativeSelect
                  {...props}
                  className={SELECT}
                  onChange={(event) => {
                    onChange(event)
                    if (event.target.value !== 'KAWIN') {
                      setValue('spouse_name', '', { shouldValidate: true })
                      setValue('spouse_forgotten', false)
                    }
                  }}
                >
                  <NativeSelectOption value="">Pilih status</NativeSelectOption>
                  {MARITAL_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {MARITAL_LABELS[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <div className="space-y-3 md:col-span-2">
              <FormField
                control={control}
                name="spouse_name"
                label="Nama pasangan"
                description={married ? 'Opsional. Membantu pencocokan data.' : 'Diisi bila status Kawin.'}
              >
                {(props) => <Input {...props} className={INPUT} disabled={!married || forgotten} />}
              </FormField>
              <Controller
                control={control}
                name="spouse_forgotten"
                render={({ field }) => (
                  <Field orientation="horizontal" data-disabled={!married || undefined}>
                    <Checkbox
                      id="field-spouse_forgotten"
                      ref={field.ref}
                      checked={field.value}
                      disabled={!married}
                      onBlur={field.onBlur}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true)
                        if (checked === true) setValue('spouse_name', '', { shouldValidate: true })
                      }}
                    />
                    <FieldLabel htmlFor="field-spouse_forgotten" className="font-normal">
                      Saya lupa nama pasangan
                    </FieldLabel>
                  </Field>
                )}
              />
            </div>
          </FieldSet>

          <FieldSet className="grid gap-x-6 gap-y-5 border-t pt-8 md:grid-cols-2 xl:grid-cols-[minmax(0,4fr)_minmax(0,4fr)_minmax(0,3fr)]">
            <SectionLegend number={2}>Data pinjaman</SectionLegend>
            <FormField
              control={control}
              name="loan_type"
              label="Jenis pinjaman"
              className="md:col-span-2 xl:col-span-1"
            >
              {(props) => (
                <NativeSelect {...props} className={SELECT}>
                  <NativeSelectOption value="">Pilih jenis pinjaman</NativeSelectOption>
                  {LOAN_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {LOAN_LABELS[type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField
              control={control}
              name="loan_amount"
              label="Jumlah pinjaman"
              description="Rp5 juta sampai Rp500 juta."
            >
              {({ value, onChange, ...props }) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    {...props}
                    className={cn(INPUT, 'pl-9')}
                    inputMode="numeric"
                    autoComplete="off"
                    value={value ? formatInteger(Number(value)) : ''}
                    onChange={(event) =>
                      onChange(event.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12))
                    }
                  />
                </div>
              )}
            </FormField>
            <FormField control={control} name="loan_tenor_months" label="Tenor">
              {(props) => (
                <NativeSelect {...props} className={SELECT}>
                  <NativeSelectOption value="">Pilih tenor</NativeSelectOption>
                  {TENORS.map((tenor) => (
                    <NativeSelectOption key={tenor} value={String(tenor)}>
                      {tenor} bulan
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </FieldSet>

          <div className="mt-auto flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Pastikan data sesuai KTP sebelum diperiksa.</p>
            <Button type="submit" size="lg" className="h-11 w-full px-6 text-base sm:w-auto" disabled={check.isPending}>
              Periksa data
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
