import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Cpu,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}

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
  error?: string
}

const tools = [
  {
    slug: "separate-audio",
    label: "Audio Separator",
    description: "Separates an audio file into clean Vocals and Music stems.",
    icon: Waveform,
    href: "/audio-separator",
    appName: "mediakeepa-audio-separator",
    estimatedCost: 0.5,
  },
  {
    slug: "remove-background",
    label: "Background Remover",
    description: "Removes image backgrounds and returns a full-resolution transparent PNG.",
    icon: ImageIcon,
    href: "/background-remover",
    appName: "mediakeepa-background-remover",
    estimatedCost: 0.05,
  },
] as const

const extractCredential = (text: string) => ({
  tokenId: text.match(/--token-id(?:=|\s+)["']?(ak-[A-Za-z0-9_-]+)/i)?.[1] || text.match(/(?:^|\s)(ak-[A-Za-z0-9_-]+)(?:\s|$)/i)?.[1],
  tokenSecret: text.match(/--token-secret(?:=|\s+)["']?(as-[A-Za-z0-9_-]+)/i)?.[1] || text.match(/(?:^|\s)(as-[A-Za-z0-9_-]+)(?:\s|$)/i)?.[1],
})

const jobTool = (job: ComputeJob) => tools.find((tool) => tool.slug === job.workloadSlug) || tools[0]

function statusStyle(status: string) {
  const value = status.toLowerCase()
  if (value === "succeeded" || value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
  if (value === "failed" || value === "error") return "border-destructive/20 bg-destructive/10 text-destructive"
  return "border-border bg-muted text-muted-foreground"
}

function formatTime(value?: string) {
  if (!value) return "Just now"
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

function formatCredit(value?: number | null) {
  return value == null ? "Balance unavailable" : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} credits available`
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
  const [performance, setPerformance] = useState<Performance>({
    mode: "Economy",
    alwaysOn: false,
    audio: { gpu: "L40S", minimumContainers: 0, idleSeconds: 60 },
    background: { gpu: "L4", minimumContainers: 0, idleSeconds: 60 },
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [credential, setCredential] = useState("")
  const [hfToken, setHfToken] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState("")
  const [applyingMode, setApplyingMode] = useState(false)

  const accounts = useMemo(() => status.accounts.filter((account) => account.connected), [status.accounts])

  useEffect(() => {
    const previous = document.title
    document.title = "MediaKeepa Compute"
    return () => { document.title = previous }
  }, [])

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const [statusResponse, catalogResponse, jobsResponse, performanceResponse] = await Promise.all([
        fetch(`/compute/api/status${refresh ? "?refresh=1" : ""}`, { cache: "no-store" }),
        fetch("/compute/api/applications", { cache: "no-store" }),
        fetch("/compute/api/jobs", { cache: "no-store" }),
        fetch("/compute/api/performance", { cache: "no-store" }),
      ])
      const [statusResult, catalogResult, jobsResult, performanceResult] = await Promise.all([
        statusResponse.json(), catalogResponse.json(), jobsResponse.json(), performanceResponse.json(),
      ])
      if (!statusResponse.ok) throw new Error(statusResult.error || "Could not read the connected Modal accounts")
      if (!catalogResponse.ok) throw new Error(catalogResult.error || "Could not read MediaKeepa jobs")
      if (!jobsResponse.ok) throw new Error(jobsResult.error || "Could not read job history")
      if (!performanceResponse.ok) throw new Error(performanceResult.error || "Could not read the performance mode")
      setStatus(statusResult)
      setCatalog(catalogResult)
      setJobs(jobsResult.jobs || [])
      setPerformance(performanceResult)
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
    if (!isBound(account.id, tool.slug)) return { ready: false, label: "Link missing" }
    if (account.health === "not-refreshed") return { ready: false, label: "Checking" }
    if (!["healthy", "degraded"].includes(account.health || "")) return { ready: false, label: "Connection issue" }
    if (!appIsDeployed(account, tool.appName)) return { ready: false, label: "Deployment needed" }
    if (account.creditRemaining == null) return { ready: false, label: "Balance unavailable" }
    if (account.creditRemaining < tool.estimatedCost) return { ready: false, label: "Insufficient credit" }
    return { ready: true, label: "Ready" }
  }, [isBound])

  const readyAccountsByTool = useMemo(() => new Map(tools.map((tool) => [
    tool.slug,
    accounts.filter((account) => toolState(account, tool).ready),
  ])), [accounts, toolState])

  const highestCreditId = useMemo(() => [...accounts]
    .filter((account) => account.creditRemaining != null && ["healthy", "degraded"].includes(account.health || ""))
    .sort((left, right) => (right.creditRemaining || 0) - (left.creditRemaining || 0))[0]?.id, [accounts])

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
    if (!hfToken.trim().startsWith("hf_")) {
      setFormError("Paste your Hugging Face access token beginning with hf_.")
      return
    }
    setSubmitting(true)
    setFormError("")
    try {
      const response = await fetch("/compute/api/accounts/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), credential: credential.trim(), hfToken: hfToken.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not set up this Modal account")
      setDialogOpen(false)
      setCredential("")
      setHfToken("")
      toast.success(result.message)
      await load(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not set up this Modal account")
    } finally {
      setSubmitting(false)
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
        <section className="flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <Cpu size={25} weight="fill" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">MediaKeepa Compute</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Add each Modal account once. MediaKeepa installs both GPU workers, prepares their models, and routes jobs to the ready account with the most available credit.
              </p>
            </div>
          </div>
          <Button onClick={openConnection} className="shrink-0 gap-2">
            <LinkSimple size={17} weight="bold" /> Add Modal account
          </Button>
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">Performance</CardTitle>
                <CardDescription>Choose how quickly a recently used worker is ready for your next job. Neither option keeps a GPU always on.</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">Always-on: Off</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
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
            {applyingMode && <p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2"><ArrowClockwise size={16} className="animate-spin" /> Applying the mode to {accounts.length || "your"} connected {accounts.length === 1 ? "account" : "accounts"}...</p>}
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
                <h2 className="text-xl font-semibold">Add your first Modal account</h2>
                <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
                  Paste your Modal and Hugging Face tokens once. MediaKeepa handles verification, secrets, deployment, model preparation, and tool linking automatically.
                </p>
              </div>
              <Button size="lg" onClick={openConnection} className="gap-2">
                <LinkSimple size={18} weight="bold" /> Add Modal account
              </Button>
              <p className="text-xs text-muted-foreground">Modal calls this an account's workspace. Your token stays encrypted for your Windows user.</p>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compute pool</h2>
                <p className="text-sm text-muted-foreground">{accounts.length} connected {accounts.length === 1 ? "account" : "accounts"}. Highest available credit is tried first.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void load(true)} disabled={refreshing} className="w-fit gap-2">
                <ArrowClockwise size={16} className={cn(refreshing && "animate-spin")} /> Refresh all
              </Button>
            </div>
            <div className="grid gap-3">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted font-semibold">
                          {account.label.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{account.label}</h3>
                            {account.id === highestCreditId && <Badge variant="outline">Highest credit</Badge>}
                            <Badge variant="outline" className={cn("gap-1", ["healthy", "degraded"].includes(account.health || "") && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300")}>
                              {["healthy", "degraded"].includes(account.health || "") ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
                              {["healthy", "degraded"].includes(account.health || "") ? "Verified" : account.health === "not-refreshed" ? "Checking" : "Attention needed"}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{formatCredit(account.creditRemaining)}{account.workspaceName ? ` · Modal workspace: ${account.workspaceName}` : ""}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="w-fit gap-2 text-destructive hover:text-destructive"><Trash size={16} /> Remove</Button></AlertDialogTrigger>
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
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tools.map((tool) => {
                        const state = toolState(account, tool)
                        const Icon = tool.icon
                        return (
                          <div key={tool.slug} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2"><Icon size={17} weight="fill" /><span className="truncate text-sm font-medium">{tool.label}</span></div>
                            <Badge variant="outline" className={cn(state.ready && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300")}>{state.label}</Badge>
                          </div>
                        )
                      })}
                    </div>
                    {account.errors && account.errors.length > 0 && <p className="text-xs text-muted-foreground">{account.errors[0]}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {!loading && <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">MediaKeepa tools</h2>
            <p className="text-sm text-muted-foreground">There is no separate Modal connection per tool. Every ready account serves both tools.</p>
          </div>
          <Tabs defaultValue="separate-audio">
            <TabsList className="grid h-12 w-full grid-cols-2">
              {tools.map(({ slug, label: toolLabel, icon: Icon }) => (
                <TabsTrigger key={slug} value={slug} className="gap-2"><Icon size={17} weight="bold" /><span>{toolLabel}</span></TabsTrigger>
              ))}
            </TabsList>
            {tools.map((tool) => {
              const Icon = tool.icon
              const readyAccounts = readyAccountsByTool.get(tool.slug) || []
              return (
                <TabsContent key={tool.slug} value={tool.slug} className="mt-3">
                  <Card>
                    <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon size={22} weight="fill" /></div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{tool.label}</h3>
                            <Badge variant="outline" className={cn(readyAccounts.length > 0 && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300")}>
                              {readyAccounts.length > 0 ? `Ready on ${readyAccounts.length} ${readyAccounts.length === 1 ? "account" : "accounts"}` : accounts.length > 0 ? "Pool setup needed" : "Waiting for an account"}
                            </Badge>
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">{tool.description}</p>
                          <p className="text-xs text-muted-foreground">Jobs automatically use the ready account with the highest known available credit.</p>
                        </div>
                      </div>
                      <Button variant="outline" asChild><a href={tool.href}>Open {tool.label}</a></Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </section>}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><ClockCounterClockwise size={19} weight="bold" /></div>
              <div><CardTitle className="text-lg">Recent jobs</CardTitle><CardDescription>Every routed job shows the MediaKeepa tool and Modal account that ran it.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">No MediaKeepa Compute jobs yet.</div>
            ) : (
              <div className="divide-y rounded-xl border">
                {jobs.map((job) => {
                  const tool = jobTool(job)
                  const Icon = tool.icon
                  return (
                    <div key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon size={20} weight="fill" /></div>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{tool.label}</p><p className="truncate text-xs text-muted-foreground">{job.selectedAccountLabel || "Modal account"} · {formatTime(job.submittedAt)}</p></div>
                      </div>
                      <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                        {job.durationSeconds != null && <span className="text-xs tabular-nums text-muted-foreground">{Math.max(1, Math.round(job.durationSeconds))}s</span>}
                        <Badge variant="outline" className={statusStyle(job.status)}>{job.status}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Modal account</DialogTitle>
            <DialogDescription>Two private credentials are all MediaKeepa needs. The complete setup runs here—no PowerShell, profile activation, or manual deployment.</DialogDescription>
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
            <div className="space-y-2">
              <Label htmlFor="compute-hf-token">Hugging Face access token</Label>
              <Input id="compute-hf-token" type="password" value={hfToken} onChange={(event) => { setHfToken(event.target.value); setFormError("") }} placeholder="hf_..." className="font-mono text-xs" autoComplete="off" />
              <p className="text-xs leading-5 text-muted-foreground">Before setup, accept the <a href="https://huggingface.co/briaai/RMBG-2.0" target="_blank" rel="noreferrer" className="underline underline-offset-4">RMBG-2.0 model terms</a>. MediaKeepa sends this token from memory into a private Modal secret and never writes it to disk.</p>
            </div>
            <Alert><LockKey size={16} /><AlertDescription>Your Modal token is encrypted locally for your Windows user. Neither credential is written to a shell profile or command history.</AlertDescription></Alert>
            {submitting && <Alert><ArrowClockwise size={16} className="animate-spin" /><AlertDescription><span className="font-medium text-foreground">Setting up everything...</span><br />MediaKeepa is verifying the account, creating the secret, deploying both workers in {performance.mode} mode, and preparing the background model. The first setup can take several minutes; keep this page open.</AlertDescription></Alert>}
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void connect()} disabled={submitting || !credential.trim() || !hfToken.trim()}>{submitting ? "Setting up..." : "Set up account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
