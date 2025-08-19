import { logInfo, logError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

interface ScheduledJob {
  id: string
  type: string
  data: any
  executeAt: Date
  attempts: number
  maxAttempts: number
}

// Simple in-memory job queue
class SimpleJobQueue {
  private jobs: Map<string, ScheduledJob> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  add(type: string, data: any, options: { delay?: number } = {}): string {
    const jobId = Math.random().toString(36).substring(7)
    const executeAt = new Date(Date.now() + (options.delay || 0))
    
    const job: ScheduledJob = {
      id: jobId,
      type,
      data,
      executeAt,
      attempts: 0,
      maxAttempts: 3
    }

    this.jobs.set(jobId, job)
    this.scheduleJob(job)
    
    return jobId
  }

  private scheduleJob(job: ScheduledJob): void {
    const delay = job.executeAt.getTime() - Date.now()
    
    if (delay <= 0) {
      this.executeJob(job)
      return
    }

    const timer = setTimeout(() => {
      this.executeJob(job)
    }, delay)

    this.timers.set(job.id, timer)
  }

  private async executeJob(job: ScheduledJob): Promise<void> {
    try {
      if (job.type === 'response-deadline-notification') {
        await this.processResponseDeadlineNotification(job.data)
      }
      
      this.jobs.delete(job.id)
      this.timers.delete(job.id)
      
      logInfo('Job completed successfully', { jobId: job.id, type: job.type })
    } catch (error) {
      job.attempts++
      
      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.executeAt = new Date(Date.now() + (1000 * Math.pow(2, job.attempts)))
        this.scheduleJob(job)
        logInfo('Job failed, retrying', { jobId: job.id, attempt: job.attempts })
      } else {
        this.jobs.delete(job.id)
        this.timers.delete(job.id)
        logError(error as any, { jobId: job.id, type: job.type, message: 'Job failed permanently' })
      }
    }
  }

  private async processResponseDeadlineNotification(data: any): Promise<void> {
    const { matchId, talentId, talentRequestId } = data
    
    logInfo('Processing response deadline notification', {
      matchId,
      talentId,
      talentRequestId
    })

    // Check if match is still pending
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!match || match.status !== 'pending') {
      logInfo('Match no longer pending, skipping notification', { matchId })
      return
    }

    // For now, just log the notification
    // In production, this would send actual emails/notifications
    logInfo('Response deadline reminder would be sent', {
      matchId,
      talentId,
      message: 'Reminder: Please respond to the project match before the deadline'
    })
  }

  getStats() {
    return {
      totalJobs: this.jobs.size,
      scheduledJobs: Array.from(this.jobs.values()).filter(j => j.executeAt > new Date()).length,
      failedJobs: Array.from(this.jobs.values()).filter(j => j.attempts > 0).length
    }
  }

  cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.jobs.clear()
  }
}

export const jobQueue = new SimpleJobQueue()
