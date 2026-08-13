import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  Cpu,
  FilmSlate,
  Image as ImageIcon,
  LinkSimple,
  LockKey,
  Lightning,
  Leaf,
  Trash,
  WarningCircle,
  Waveform,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ModalApp = Record<string, unknown>

type ComputeAccount = {
  id: string
  label: string
  workspaceName?: string
  connected: boolean
  health?: string
  connectedAt?: string
  creditRemaining?: number | null
  apps?: ModalApp[]
  errors?: string[]
  setupStatus?: "setting-up" | "ready" | "failed"
  setupStage?: string
  setupError?: string | null
  setupUpdatedAt?: string | null
  setupTools?: Record<string, "setting-up" | "ready" | "failed">
}

type ComputeStatus = {
  accounts: ComputeAccount[]
  generatedAt?: string
}
type PerformanceMode = "Economy" | "Fast"
type Performance = {
  mode: PerformanceMode
  alwaysOn: boolean
  audio: { gpu: string; minimumContainers: number; idleSeconds: number }
  background: { gpu: string; minimumContainers: number; idleSeconds: number }
  video?: { previewGpu: string; fullGpu: string; minimumContainers: number; idleSeconds: number }
}
type HuggingFaceAccess = { configured: boolean; updatedAt?: string }

type Target = { accountId: string; enabled: boolean }
type Workload = {
  slug: string
  name: string
  revisions: Array<{ number: number; targets: Target[] }>
}
type Catalog = { applications: Array<{ slug: string; workloads: Workload[] }> }
type ComputeJob = {
  id: string
  workloadSlug?: string
  workloadName?: string
  selectedAccountLabel?: string
  status: string
  submittedAt?: string
  durationSeconds?: number
  estimatedCostUsd?: number
  error?: string
}

const JOBS_PER_PAGE = 5

const tools = [
  {
    slug: "separate-audio",
    label: "Audio Separator",
    icon: Waveform,
    appName: "mediakeepa-audio-separator",
    estimatedCost: 0.5,
  },
  {
    slug: "remove-background",
    label: "Background Remover",
    icon: ImageIcon,
    appName: "mediakeepa-background-remover",
    estimatedCost: 0.05,
  },
  {
    slug: "enhance-video",
    label: "Video Enhancer",
    icon: FilmSlate,
    appName: "mediakeepa-video-enhancer",
    estimatedCost: 2,
  },
] as const

const extractCredential = (text: string) => ({
  tokenId: text.match(/--token-id(?:=|\s+)["']?(ak-[A-Za-z0-9_-]+)/i)?.[1] || text.match(/(?:^|\s)(ak-[A-Za-z0-9_-]+)(?:\s|$)/i)?.[1],
  tokenSecret: text.match(/--token-secret(?:=|\s+)["']?(as-[A-Za-z0-9_-]+)/i)?.[1] || text.match(/(?:^|\s)(as-[A-Za-z0-9_-]+)(?:\s|$)/i)?.[1],
})

const jobTool = (job: ComputeJob) => tools.find((tool) => tool.slug === (job.workloadSlug === "enhance-video-preview" ? "enhance-video" : job.workloadSlug)) || tools[0]

function statusStyle(status: string) {
  const value = status.toLowerCase()
  if (value === "succeeded" || value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
  if (value === "failed" || value === "error") return "border-destructive/20 bg-destructive/10 text-destructive"
  return "border-border bg-muted text-muted-foreground"
}

function formatCredit(value?: number | null) {
  return value == null ? "Balance unavailable" : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} credits available`
}

function formatDuration(value?: number) {
  if (value == null) return null
  const seconds = Math.max(1, Math.round(value))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatCost(value?: number) {
  if (value == null) return "—"
  return `~${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function formatJobDate(value?: string) {
  if (!value) return { date: "Today", time: "Just now" }
  const date = new Date(value)
  return {
    date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date),
  }
}

function statusLabel(status: string) {
  const value = status.toLowerCase()
  if (["succeeded", "completed"].includes(value)) return "Completed"
  if (["failed", "error"].includes(value)) return "Failed"
  if (["queued", "routing", "resolving"].includes(value)) return "Queued"
  if (value === "detached") return "Interrupted"
  return "Processing"
}

function appIsDeployed(account: ComputeAccount, expectedName: string) {
  const expected = expectedName.toLowerCase()
  return (account.apps || []).some((app) => {
    const values = Object.values(app).filter((value): value is string => typeof value === "string")
    const nameMatches = values.some((value) => value.toLowerCase() === expected) || JSON.stringify(app).toLowerCase().includes(`"${expected}"`)
    const state = String(app.state || app.State || "").toLowerCase()
    return nameMatches && !["deleted", "stopped"].includes(state)
  })
}

export function ComputePage() {
  const [status, setStatus] = useState<ComputeStatus>({ accounts: [] })
  const [catalog, setCatalog] = useState<Catalog>({ applications: [] })
  const [jobs, setJobs] = useState<ComputeJob[]>([])
  const [jobPage, setJobPage] = useState(1)
  const [performance, setPerformance] = useState<Performance>({
    mode: "Economy",
    alwaysOn: false,
    audio: { gpu: "L40S", minimumContainers: 0, idleSeconds: 60 },
    background: { gpu: "L4", minimumContainers: 0, idleSeconds: 60 },
  })
  const [huggingFaceAccess, setHuggingFaceAccess] = useState<HuggingFaceAccess>({ configured: false })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [credential, setCredential] = useState("")
  const [hfToken, setHfToken] = useState("")
  const [hfDialogOpen, setHfDialogOpen] = useState(false)
  const [replacementHfToken, setReplacementHfToken] = useState("")
  const [hfError, setHfError] = useState("")
  const [savingHfToken, setSavingHfToken] = useState(false)
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState("")
  const [settingUpId, setSettingUpId] = useState("")
  const [applyingMode, setApplyingMode] = useState(false)
  const previousSetupStatuses = useRef<Record<string, string>>({})

  const accounts = useMemo(() => status.accounts.filter((account) => account.connected), [status.accounts])
  const settingUpCount = accounts.filter((account) => account.setupStatus === "setting-up").length

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const [statusResponse, catalogResponse, jobsResponse, performanceResponse, huggingFaceResponse] = await Promise.all([
        fetch(`/compute/api/status${refresh ? "?refresh=1" : ""}`, { cache: "no-store" }),
        fetch("/compute/api/applications", { cache: "no-store" }),
        fetch("/compute/api/jobs", { cache: "no-store" }),
        fetch("/compute/api/performance", { cache: "no-store" }),
        fetch("/compute/api/hugging-face", { cache: "no-store" }),
      ])
      const [statusResult, catalogResult, jobsResult, performanceResult, huggingFaceResult] = await Promise.all([
        statusResponse.json(), catalogResponse.json(), jobsResponse.json(), performanceResponse.json(), huggingFaceResponse.json(),
      ])
      if (!statusResponse.ok) throw new Error(statusResult.error || "Could not read the connected Modal accounts")
      if (!catalogResponse.ok) throw new Error(catalogResult.error || "Could not read MediaKeepa jobs")
      if (!jobsResponse.ok) throw new Error(jobsResult.error || "Could not read job history")
      if (!performanceResponse.ok) throw new Error(performanceResult.error || "Could not read the performance mode")
      if (!huggingFaceResponse.ok) throw new Error(huggingFaceResult.error || "Could not read Hugging Face model access")
      setStatus(statusResult)
      setCatalog(catalogResult)
      setJobs(jobsResult.jobs || [])
      setPerformance(performanceResult)
      setHuggingFaceAccess(huggingFaceResult)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MediaKeepa Compute is unavailable")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load(false) }, [load])

  const workloads = useMemo(
    () => catalog.applications.find((application) => application.slug === "mediakeepa")?.workloads || [],
    [catalog],
  )

  const isBound = useCallback((accountId: string, workloadSlug: string) => {
    const workload = workloads.find((item) => item.slug === workloadSlug)
    const latest = [...(workload?.revisions || [])].sort((a, b) => b.number - a.number)[0]
    return Boolean(latest?.targets?.some((target) => target.enabled && target.accountId === accountId))
  }, [workloads])

  const toolState = useCallback((account: ComputeAccount, tool: typeof tools[number]) => {
    const setupTool = account.setupTools?.[tool.slug]
    if (account.setupStatus === "setting-up") {
      if (setupTool === "ready") return { ready: true, label: "Ready" }
      return { ready: false, label: "Setting up" }
    }
    if (account.setupStatus === "failed") {
      if (setupTool === "ready") return { ready: true, label: "Ready" }
      return { ready: false, label: "Setup failed" }
    }
    if (!isBound(account.id, tool.slug)) return { ready: false, label: "Link missing" }
    if (account.health === "not-refreshed") return { ready: false, label: "Checking" }
    if (!["healthy", "degraded"].includes(account.health || "")) return { ready: false, label: "Connection issue" }
    if (!appIsDeployed(account, tool.appName)) return { ready: false, label: "Deployment needed" }
    if (account.creditRemaining == null) return { ready: false, label: "Balance unavailable" }
    if (account.creditRemaining < tool.estimatedCost) return { ready: false, label: "Insufficient credit" }
    return { ready: true, label: "Ready" }
  }, [isBound])

  const highestCreditId = useMemo(() => [...accounts]
    .filter((account) => account.creditRemaining != null && ["healthy", "degraded"].includes(account.health || ""))
    .sort((left, right) => (right.creditRemaining || 0) - (left.creditRemaining || 0))[0]?.id, [accounts])

  const totalJobPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * JOBS_PER_PAGE
    return jobs.slice(start, start + JOBS_PER_PAGE)
  }, [jobPage, jobs])
  const newestJobId = jobs[0]?.id
  const setupPollingKey = accounts.filter((account) => account.setupStatus === "setting-up").map((account) => account.id).join("|")

  useEffect(() => { setJobPage(1) }, [newestJobId])
  useEffect(() => { setJobPage((page) => Math.min(page, totalJobPages)) }, [totalJobPages])
  useEffect(() => {
    if (!setupPollingKey) return
    const timer = window.setInterval(() => { void load(false) }, 2000)
    return () => window.clearInterval(timer)
  }, [load, setupPollingKey])
  useEffect(() => {
    let shouldRefreshLiveStatus = false
    const nextStatuses: Record<string, string> = {}
    for (const account of accounts) {
      const current = account.setupStatus || "ready"
      const previous = previousSetupStatuses.current[account.id]
      nextStatuses[account.id] = current
      if (previous === "setting-up" && current === "ready") {
        toast.success(`${account.label} is ready for every MediaKeepa tool.`)
        shouldRefreshLiveStatus = true
      }
      if (previous === "setting-up" && current === "failed") {
        toast.error(`${account.label} needs setup attention.`)
      }
    }
    previousSetupStatuses.current = nextStatuses
    if (shouldRefreshLiveStatus) void load(true)
  }, [accounts, load])

  const openConnection = () => {
    setLabel("")
    setCredential("")
    setHfToken("")
    setFormError("")
    setDialogOpen(true)
  }

  const connect = async () => {
    const parsed = extractCredential(credential)
    if (!parsed.tokenId || !parsed.tokenSecret) {
      setFormError("Paste the complete Modal token command containing both the ak- token ID and as- token secret.")
      return
    }
    if (!huggingFaceAccess.configured && !hfToken.trim().startsWith("hf_")) {
      setFormError("Paste your Hugging Face access token beginning with hf_.")
      return
    }
    setSubmitting(true)
    setFormError("")
    try {
      const response = await fetch("/compute/api/accounts/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), credential: credential.trim(), hfToken: huggingFaceAccess.configured ? undefined : hfToken.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not set up this Modal account")
      setDialogOpen(false)
      setCredential("")
      setHfToken("")
      toast.success(result.message)
      await load(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not set up this Modal account")
    } finally {
      setSubmitting(false)
    }
  }

  const openHuggingFaceDialog = () => {
    setReplacementHfToken("")
    setHfError("")
    setHfDialogOpen(true)
  }

  const saveHuggingFaceToken = async () => {
    if (!replacementHfToken.trim().startsWith("hf_")) {
      setHfError("Paste a Hugging Face access token beginning with hf_.")
      return
    }
    setSavingHfToken(true)
    setHfError("")
    try {
      const response = await fetch("/compute/api/hugging-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hfToken: replacementHfToken.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not save Hugging Face model access")
      setHuggingFaceAccess(result)
      setHfDialogOpen(false)
      setReplacementHfToken("")
      toast.success(result.message)
    } catch (error) {
      setHfError(error instanceof Error ? error.message : "Could not save Hugging Face model access")
    } finally {
      setSavingHfToken(false)
    }
  }

  const removeAccount = async (account: ComputeAccount) => {
    setRemovingId(account.id)
    try {
      const response = await fetch("/compute/api/accounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not remove this Modal account")
      toast.success(`${account.label} removed from the compute pool`)
      await load(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this Modal account")
    } finally {
      setRemovingId("")
    }
  }

  const setupExistingAccount = async (account: ComputeAccount) => {
    setSettingUpId(account.id)
    try {
      const response = await fetch("/compute/api/accounts/provision-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not set up the latest MediaKeepa tools")
      toast.success(result.message)
      await load(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not set up the latest MediaKeepa tools")
    } finally {
      setSettingUpId("")
    }
  }

  const applyPerformanceMode = async (mode: PerformanceMode) => {
    if (mode === performance.mode || applyingMode) return
    setApplyingMode(true)
    try {
      const response = await fetch("/compute/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Could not apply ${mode} mode`)
      setPerformance(result)
      toast.success(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not apply ${mode} mode`)
    } finally {
      setApplyingMode(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <AppHeader />

      <main className="space-y-6 pb-8">
        <section className="flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <Cpu size={25} weight="fill" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">MediaKeepa Compute</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Add each Modal account once. MediaKeepa installs its GPU tools, prepares their models, and routes jobs to the ready account with the most available credit.
              </p>
            </div>
          </div>
          <Button onClick={openConnection} className="shrink-0 gap-2">
            <LinkSimple size={17} weight="bold" /> Add Account
          </Button>
        </section>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><LockKey size={19} weight="fill" /></div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">Hugging Face model access</h2>
                  <Badge variant="outline" className={cn(huggingFaceAccess.configured && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300")}>
                    {huggingFaceAccess.configured ? "Connected" : "One-time setup"}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">One encrypted token provides private model access across every Modal account.</p>
              </div>
            </div>
            <Button variant="outline" onClick={openHuggingFaceDialog} className="shrink-0">
              {huggingFaceAccess.configured ? "Replace token" : "Add token"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
            <CardDescription>Choose how quickly a recently used worker is ready for your next job. Neither option keeps a GPU always on.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void applyPerformanceMode("Economy")}
              disabled={applyingMode}
              aria-pressed={performance.mode === "Economy"}
              className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70", performance.mode === "Economy" && "border-foreground bg-muted/60 ring-1 ring-foreground")}
            >
              <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><Leaf size={19} weight="fill" /> Economy</span>{performance.mode === "Economy" && <CheckCircle size={18} weight="fill" />}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">Scales down about 1 minute after a job. Best when saving credits matters most.</span>
            </button>
            <button
              type="button"
              onClick={() => void applyPerformanceMode("Fast")}
              disabled={applyingMode}
              aria-pressed={performance.mode === "Fast"}
              className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70", performance.mode === "Fast" && "border-foreground bg-muted/60 ring-1 ring-foreground")}
            >
              <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><Lightning size={19} weight="fill" /> Fast <Badge variant="outline">Recommended</Badge></span>{performance.mode === "Fast" && <CheckCircle size={18} weight="fill" />}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">After use, Audio stays ready for 10 minutes and Background Remover for 5 minutes, then both turn off.</span>
            </button>
            {applyingMode && <p className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2"><ArrowClockwise size={16} className="animate-spin" /> Applying the mode to {accounts.length || "your"} connected {accounts.length === 1 ? "account" : "accounts"}...</p>}
          </CardContent>
        </Card>

        {loading ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Loading MediaKeepa Compute...</Card>
        ) : accounts.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center gap-5 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <LockKey size={25} weight="fill" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Connect your first account</h2>
                <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
                  Add Hugging Face model access once, then connect Modal accounts with only their Modal token. MediaKeepa handles deployment and tool linking automatically.
                </p>
              </div>
              <Button size="lg" onClick={openConnection} className="gap-2">
                <LinkSimple size={18} weight="bold" /> Add Account
              </Button>
              <p className="text-xs text-muted-foreground">Modal calls this an account's workspace. Your token stays encrypted for your Windows user.</p>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compute pool</h2>
                <p className="text-sm text-muted-foreground">{accounts.length} connected {accounts.length === 1 ? "account" : "accounts"}{settingUpCount > 0 ? ` · ${settingUpCount} setting up` : ""}. Highest available credit is tried first.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void load(true)} disabled={refreshing} className="w-fit gap-2">
                <ArrowClockwise size={16} className={cn(refreshing && "animate-spin")} /> Refresh all
              </Button>
            </div>
            <div className="grid gap-3">
              {accounts.map((account) => {
                const needsVideoSetup = account.setupStatus !== "setting-up" && !appIsDeployed(account, "mediakeepa-video-enhancer")
                return (
                <Card key={account.id}>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted font-semibold">
                          {account.label.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{account.label}</h3>
                            {account.id === highestCreditId && account.setupStatus !== "setting-up" && <Badge variant="outline">Highest credit</Badge>}
                            <Badge variant="outline" className={cn("gap-1", account.setupStatus === "ready" && ["healthy", "degraded"].includes(account.health || "") && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300", account.setupStatus === "failed" && "border-destructive/20 bg-destructive/10 text-destructive")}>
                              {account.setupStatus === "setting-up" ? <ArrowClockwise size={13} className="animate-spin" /> : account.setupStatus === "failed" ? <WarningCircle size={13} weight="fill" /> : ["healthy", "degraded"].includes(account.health || "") ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
                              {account.setupStatus === "setting-up" ? "Setting up" : account.setupStatus === "failed" ? "Setup failed" : ["healthy", "degraded"].includes(account.health || "") ? "Verified" : account.health === "not-refreshed" ? "Checking" : "Attention needed"}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{account.setupStatus === "setting-up" ? account.setupStage || "Setting up in the background" : account.setupStatus === "failed" ? "Setup needs attention" : formatCredit(account.creditRemaining)}{account.workspaceName ? ` · Modal workspace: ${account.workspaceName}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {needsVideoSetup && <Button variant="outline" size="sm" onClick={() => void setupExistingAccount(account)} disabled={settingUpId === account.id} className="gap-2"><FilmSlate size={16} weight="fill" />{settingUpId === account.id ? "Starting..." : "Set up Video Enhancer"}</Button>}
                        <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={account.setupStatus === "setting-up"} className="w-fit gap-2 text-destructive hover:text-destructive"><Trash size={16} /> Remove</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {account.label}?</AlertDialogTitle>
                            <AlertDialogDescription>This removes the encrypted local credential, job links, and this account's local routed job history. It does not revoke the token in Modal.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void removeAccount(account)} disabled={removingId === account.id}>Remove account</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {tools.map((tool) => {
                        const state = toolState(account, tool)
                        const Icon = tool.icon
                        return (
                          <div key={tool.slug} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2"><Icon size={17} weight="fill" /><span className="truncate text-sm font-medium">{tool.label}</span></div>
                            <Badge variant="outline" className={cn(state.ready && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300", state.label === "Setup failed" && "border-destructive/20 bg-destructive/10 text-destructive")}>{state.label === "Setting up" && <ArrowClockwise size={12} className="mr-1 animate-spin" />}{state.label}</Badge>
                          </div>
                        )
                      })}
                    </div>
                    {account.setupError ? <p className="text-xs text-destructive">{account.setupError} Add the same account again to retry setup.</p> : account.errors && account.errors.length > 0 && <p className="text-xs text-muted-foreground">{account.errors[0]}</p>}
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </section>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><ClockCounterClockwise size={19} weight="bold" /></div>
              <div><CardTitle className="text-lg">Recent jobs</CardTitle><CardDescription>Duration and estimated cost are shown for every routed Compute job.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">No MediaKeepa Compute jobs yet.</div>
            ) : (
              <div>
                <div className="overflow-hidden rounded-xl border">
                  <Table className="min-w-[760px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[230px] px-4">Job</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="px-4 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedJobs.map((job) => {
                        const tool = jobTool(job)
                        const Icon = tool.icon
                        const duration = formatDuration(job.durationSeconds)
                        const submitted = formatJobDate(job.submittedAt)
                        return (
                          <TableRow key={job.id}>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon size={18} weight="fill" /></div>
                                <span className="font-medium">{tool.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{job.selectedAccountLabel || "Modal account"}</TableCell>
                            <TableCell>
                              <span className="block">{submitted.date}</span>
                              <span className="block text-xs text-muted-foreground">{submitted.time}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{duration || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums" title="Estimated Modal cost">{formatCost(job.estimatedCostUsd)}</TableCell>
                            <TableCell className="px-4 text-right"><Badge variant="outline" className={statusStyle(job.status)}>{statusLabel(job.status)}</Badge></TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {jobs.length > JOBS_PER_PAGE && (
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-muted-foreground">Showing {(jobPage - 1) * JOBS_PER_PAGE + 1}–{Math.min(jobPage * JOBS_PER_PAGE, jobs.length)} of {jobs.length} jobs</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setJobPage((page) => Math.max(1, page - 1))} disabled={jobPage === 1} className="gap-1"><CaretLeft size={15} /> Previous</Button>
                      <span className="min-w-20 text-center text-xs text-muted-foreground">Page {jobPage} of {totalJobPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setJobPage((page) => Math.min(totalJobPages, page + 1))} disabled={jobPage === totalJobPages} className="gap-1">Next <CaretRight size={15} /></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>{huggingFaceAccess.configured ? "Paste this account's Modal credential. MediaKeepa will reuse your saved Hugging Face model access automatically." : "Paste the Modal credential and add Hugging Face model access once. Future accounts will only need their Modal credential."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="compute-label">Label <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="compute-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Defaults to the verified Modal name" maxLength={64} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compute-token">Modal token command</Label>
              <Textarea id="compute-token" value={credential} onChange={(event) => { setCredential(event.target.value); setFormError("") }} placeholder="modal token set --token-id ak-... --token-secret as-..." rows={4} className="font-mono text-xs" autoComplete="off" />
            </div>
            {huggingFaceAccess.configured ? (
              <Alert><CheckCircle size={16} weight="fill" /><AlertDescription>Hugging Face model access is connected and will be reused for this account.</AlertDescription></Alert>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="compute-hf-token">Hugging Face access token <span className="font-normal text-muted-foreground">(one-time setup)</span></Label>
                <Input id="compute-hf-token" type="password" value={hfToken} onChange={(event) => { setHfToken(event.target.value); setFormError("") }} placeholder="hf_..." className="font-mono text-xs" autoComplete="off" />
                <p className="text-xs leading-5 text-muted-foreground">Before setup, accept the <a href="https://huggingface.co/briaai/RMBG-2.0" target="_blank" rel="noreferrer" className="underline underline-offset-4">RMBG-2.0 model terms</a>. MediaKeepa encrypts this token for your Windows user and reuses it across connected accounts.</p>
              </div>
            )}
            <Alert><LockKey size={16} /><AlertDescription>Your credentials are encrypted locally for your Windows user and are never written to a shell profile or command history.</AlertDescription></Alert>
            {submitting && <Alert><ArrowClockwise size={16} className="animate-spin" /><AlertDescription><span className="font-medium text-foreground">Verifying this account...</span><br />Once verified, this window closes and every MediaKeepa worker continues setting up in the background.</AlertDescription></Alert>}
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void connect()} disabled={submitting || !credential.trim() || (!huggingFaceAccess.configured && !hfToken.trim())}>{submitting ? "Adding..." : "Add account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hfDialogOpen} onOpenChange={(open) => { if (!savingHfToken) setHfDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{huggingFaceAccess.configured ? "Replace Hugging Face token" : "Add Hugging Face token"}</DialogTitle>
            <DialogDescription>Enter this once for Background Remover. MediaKeepa encrypts it locally and applies it to every connected Modal account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="shared-hf-token">Hugging Face access token</Label>
              <Input id="shared-hf-token" type="password" value={replacementHfToken} onChange={(event) => { setReplacementHfToken(event.target.value); setHfError("") }} placeholder="hf_..." className="font-mono text-xs" autoComplete="off" />
              <p className="text-xs leading-5 text-muted-foreground">Accept the <a href="https://huggingface.co/briaai/RMBG-2.0" target="_blank" rel="noreferrer" className="underline underline-offset-4">RMBG-2.0 model terms</a> before saving.</p>
            </div>
            {savingHfToken && <Alert><ArrowClockwise size={16} className="animate-spin" /><AlertDescription>Updating private model access across {accounts.length || "your future"} connected {accounts.length === 1 ? "account" : "accounts"}...</AlertDescription></Alert>}
            {hfError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{hfError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHfDialogOpen(false)} disabled={savingHfToken}>Cancel</Button>
            <Button onClick={() => void saveHuggingFaceToken()} disabled={savingHfToken || !replacementHfToken.trim()}>{savingHfToken ? "Saving..." : "Save token"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
