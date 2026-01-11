import 'dotenv/config'
import { createWorkerClient } from './supabase.js'
import { processCrawlJob, CrawlJob, handleGracefulShutdown } from './processJob.js'
import { config, HARD_LIMITS } from './config.js'

let isShuttingDown = false
let activeJobs = new Map<Promise<void>, { job: CrawlJob; startTime: number }>()

const jobMetrics = {
  totalJobs: 0,
  failedJobs: 0,
  jobDurations: [] as number[],
  lastReset: Date.now(),
}

async function claimNextJob(): Promise<CrawlJob | null> {
  const supabase = createWorkerClient()
  const claimStartTime = Date.now()

  const { data, error } = await supabase.rpc('claim_next_crawl_job', {
    limit_count: 1,
  })

  const claimDuration = Date.now() - claimStartTime

  if (error) {
    console.error(`[Worker] ❌ Error claiming job (${claimDuration}ms):`, error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  const job = data[0] as CrawlJob
  console.log(`[Worker] ✅ Claimed job ${job.id} (${claimDuration}ms)`)
  return job
}

function logStartupInfo() {
  const workerVersion = process.env.WORKER_VERSION || 'unknown'
  const supabaseUrl = process.env.SUPABASE_URL || 'not set'
  const crawlEnabled = process.env.CRAWL_ENABLED === 'true'

  console.log(`\n[Worker] 🚀 Starting worker`)
  console.log(`[Worker] ⏰ ${new Date().toISOString()}`)
  console.log(`[Worker] 📋 Configuration:`)
  console.log(`[Worker]   - Version: ${workerVersion}`)
  console.log(`[Worker]   - Concurrency: ${config.workerConcurrency}`)
  console.log(`[Worker]   - Poll interval (job found): ${config.pollIntervalMs}ms`)
  console.log(`[Worker]   - Poll interval (no job): ${config.pollIntervalNoJobMs}ms`)
  console.log(`[Worker]   - Max attempts: ${HARD_LIMITS.MAX_ATTEMPTS}`)
  console.log(`[Worker]   - Page timeout: ${config.pageTimeoutMs}ms`)
  console.log(`[Worker]   - Max crawl duration: ${HARD_LIMITS.MAX_CRAWL_DURATION_MS}ms`)
  console.log(`[Worker]   - Max pages per crawl: ${HARD_LIMITS.MAX_PAGES_PER_CRAWL}`)
  console.log(`[Worker]   - Max emails per page: ${HARD_LIMITS.MAX_EMAILS_PER_PAGE}`)
  console.log(`[Worker]   - Crawl enabled: ${crawlEnabled}`)
  console.log(`[Worker]   - Ignore robots.txt: ${config.ignoreRobotsTxt}`)
  console.log(`[Worker]   - Ignore SSL errors: ${config.ignoreSSLErrors}`)
  console.log(`[Worker]   - Supabase URL: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`)

  if (!crawlEnabled) {
    console.log(`[Worker] ⚠️  CRAWL_ENABLED is not 'true', exiting`)
    process.exit(0)
  }
}

function logMetrics() {
  const now = Date.now()
  const hoursElapsed = (now - jobMetrics.lastReset) / (1000 * 60 * 60)
  
  if (hoursElapsed >= 1) {
    const jobsPerHour = jobMetrics.totalJobs / hoursElapsed
    const failedPerHour = jobMetrics.failedJobs / hoursElapsed
    const avgDuration =
      jobMetrics.jobDurations.length > 0
        ? jobMetrics.jobDurations.reduce((a, b) => a + b, 0) / jobMetrics.jobDurations.length
        : 0

    console.log(`[Worker] 📊 Metrics (last hour):`)
    console.log(`[Worker]   - Jobs/hour: ${jobsPerHour.toFixed(2)}`)
    console.log(`[Worker]   - Failed jobs/hour: ${failedPerHour.toFixed(2)}`)
    console.log(`[Worker]   - Avg job duration: ${avgDuration.toFixed(0)}ms`)

    jobMetrics.totalJobs = 0
    jobMetrics.failedJobs = 0
    jobMetrics.jobDurations = []
    jobMetrics.lastReset = now
  }
}

async function runWorker() {
  logStartupInfo()

  let lastMetricsLog = Date.now()

  while (!isShuttingDown) {
    try {
      const currentActiveCount = activeJobs.size

      if (currentActiveCount >= config.workerConcurrency) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      const job = await claimNextJob()

      if (!job) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.pollIntervalNoJobMs)
        )
        
        if (Date.now() - lastMetricsLog >= 60000) {
          logMetrics()
          lastMetricsLog = Date.now()
        }
        continue
      }

      console.log(`[Worker] 🔄 Starting new job processing cycle`)

      const jobStartTime = Date.now()
      jobMetrics.totalJobs++

      const jobPromise = processCrawlJob(job)
        .then(() => {
          const duration = Date.now() - jobStartTime
          jobMetrics.jobDurations.push(duration)
          if (jobMetrics.jobDurations.length > 100) {
            jobMetrics.jobDurations.shift()
          }
        })
        .catch(() => {
          jobMetrics.failedJobs++
        })
        .finally(() => {
          activeJobs.delete(jobPromise)
          const activeCount = activeJobs.size
          console.log(`[Worker] ✅ Job ${job.id} finished, active jobs: ${activeCount}/${config.workerConcurrency}`)
          if (activeCount > 0) {
            console.log(`[Worker] 📊 Active jobs: ${activeCount}/${config.workerConcurrency}`)
          }
        })

      activeJobs.set(jobPromise, { job, startTime: jobStartTime })
      console.log(`[Worker] 📊 Active jobs: ${activeJobs.size}/${config.workerConcurrency}`)

      if (Date.now() - lastMetricsLog >= 60000) {
        logMetrics()
        lastMetricsLog = Date.now()
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Worker] ❌ Error in main loop: ${errorMsg}`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

async function gracefulShutdown() {
  console.log(`[Worker] 🛑 Shutting down gracefully...`)
  isShuttingDown = true

  const shutdownTimeout = setTimeout(() => {
    console.log(`[Worker] ⚠️  Shutdown timeout reached, forcing exit`)
    process.exit(1)
  }, config.shutdownTimeoutMs)

  while (activeJobs.size > 0) {
    console.log(`[Worker] ⏳ Waiting for ${activeJobs.size} active jobs...`)
    
    for (const [jobPromise, { job, startTime }] of activeJobs.entries()) {
      try {
        await Promise.race([
          jobPromise,
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ])
      } catch {
        await handleGracefulShutdown(job, startTime)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  clearTimeout(shutdownTimeout)
  console.log(`[Worker] ✅ All jobs completed, exiting`)
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

runWorker().catch((error) => {
  console.error(`[Worker] ❌ Fatal error:`, error)
  process.exit(1)
})

