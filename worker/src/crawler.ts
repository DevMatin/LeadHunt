import { chromium, Browser, Page, BrowserContext } from 'playwright'
import {
  extractEmailsFromText,
  extractEmailsFromMailtoLinks,
  extractObfuscatedEmails,
  extractEmailsFromFooter,
  extractEmailsWithLabels,
  matchesDomain,
  EmailMatch,
} from './extractEmails.js'
import { config, HARD_LIMITS } from './config.js'

export interface CrawlResult {
  emails: EmailMatch[]
  pagesCrawled: number
}

export class CrawlSkippedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly skipCode: string
  ) {
    super(`Crawl skipped: ${reason}`)
    this.name = 'CrawlSkippedError'
  }
}

const IMPRINT_PATTERNS = [
  '/impressum',
  '/imprint',
  '/legal',
  '/rechtliches',
  '/datenschutz',
  '/privacy',
  '/agb',
  '/terms',
]

const CONTACT_PATTERNS = [
  '/kontakt',
  '/contact',
  '/kontaktformular',
  '/contact-form',
  '/anfrage',
  '/anfragen',
  '/request',
]

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserInstance
}

async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isSameDomain(baseUrl: string, url: string): boolean {
  try {
    const base = new URL(baseUrl)
    const target = new URL(url, baseUrl)
    return base.hostname === target.hostname
  } catch {
    return false
  }
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const baseUrl = new URL(url)
    const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) })
    
    if (!response.ok) {
      return false
    }

    const text = await response.text()
    const lines = text.split('\n').map((l) => l.trim().toLowerCase())
    
    for (const line of lines) {
      if (line === 'disallow: /' || line === 'disallow:/') {
        return true
      }
    }
    
    return false
  } catch {
    return false
  }
}

async function checkSkipAfterLoad(
  page: Page,
  response: any,
  url: string
): Promise<{ skip: boolean; reason?: string; code?: string }> {
  try {
    if (!response) {
      return { skip: false }
    }

    const status = response.status()

    if (status === 403) {
      return { skip: true, reason: 'HTTP 403 Forbidden', code: 'HTTP_403' }
    }

    if (status === 429) {
      return { skip: true, reason: 'HTTP 429 Too Many Requests', code: 'HTTP_429' }
    }

    const title = await page.title().catch(() => '')
    const lowerTitle = title.toLowerCase()
    
    if (
      lowerTitle.includes('just a moment') ||
      lowerTitle.includes('checking your browser') ||
      lowerTitle.includes('please wait')
    ) {
      return { skip: true, reason: 'Captcha/Bot Protection detected (title)', code: 'CAPTCHA' }
    }

    const content = await page.content()
    const lowerContent = content.toLowerCase()

    const hasCloudflareChallenge = 
      (lowerContent.includes('cf-browser-verification') ||
       lowerContent.includes('cf-challenge') ||
       lowerContent.includes('challenge-platform') ||
       lowerContent.includes('cf-ray')) &&
      (lowerContent.includes('just a moment') ||
       lowerContent.includes('checking your browser') ||
       lowerContent.includes('ddos protection'))

    if (hasCloudflareChallenge) {
      return { skip: true, reason: 'Cloudflare Bot Protection detected', code: 'CAPTCHA' }
    }

    const bodyText = await page.textContent('body').catch(() => '') || ''
    const lowerBodyText = bodyText.toLowerCase()
    
    if (
      lowerBodyText.includes('captcha') &&
      (lowerBodyText.includes('verify') || lowerBodyText.includes('human') || lowerBodyText.includes('robot'))
    ) {
      const hasCaptchaForm = await page.$('form[action*="captcha"], iframe[src*="captcha"], div[id*="captcha"]').catch(() => null)
      if (hasCaptchaForm) {
        return { skip: true, reason: 'Captcha form detected', code: 'CAPTCHA' }
      }
    }

    const metaRobots = await page.$eval('meta[name="robots"]', (el) =>
      el.getAttribute('content')
    ).catch(() => null)

    if (metaRobots) {
      const content = metaRobots.toLowerCase()
      if (content.includes('noindex') && content.includes('nofollow')) {
        return { skip: true, reason: 'Meta robots noindex,nofollow', code: 'META_ROBOTS' }
      }
    }

    const xRobotsTag = response.headers()['x-robots-tag']
    if (xRobotsTag) {
      const tag = xRobotsTag.toLowerCase()
      if (tag.includes('noindex') && tag.includes('nofollow')) {
        return { skip: true, reason: 'X-Robots-Tag noindex,nofollow', code: 'X_ROBOTS_TAG' }
      }
    }

    return { skip: false }
  } catch (error) {
    return { skip: false }
  }
}

function checkEarlyExit(
  emails: EmailMatch[],
  websiteUrl: string
): boolean {
  for (const email of emails) {
    if (
      email.confidence_score >= HARD_LIMITS.EARLY_EXIT_MIN_CONFIDENCE &&
      !email.email.includes('noreply') &&
      !email.email.includes('no-reply') &&
      matchesDomain(email.email, websiteUrl)
    ) {
      return true
    }
  }
  return false
}

export async function crawlCompanyWebsite(website: string): Promise<CrawlResult> {
  const crawlStartTime = Date.now()
  const deadline = crawlStartTime + HARD_LIMITS.MAX_CRAWL_DURATION_MS

  if (!isValidUrl(website)) {
    throw new Error(`Invalid URL: ${website}`)
  }

  const browser = await getBrowser()
  const allEmails: EmailMatch[] = []
  let pagesCrawled = 0
  let context: BrowserContext | null = null

  try {
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      ignoreHTTPSErrors: config.ignoreSSLErrors,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    const homepagePage = await context.newPage()
    try {
      if (!config.ignoreRobotsTxt) {
        const robotsTxtBlocked = await checkRobotsTxt(website)
        if (robotsTxtBlocked) {
          throw new CrawlSkippedError('robots.txt Disallow: /', 'ROBOTS_TXT')
        }
      }

      let response
      try {
        response = await homepagePage.goto(website, {
          waitUntil: 'domcontentloaded',
          timeout: config.pageTimeoutMs,
        })
      } catch (gotoError) {
        const errorMsg = gotoError instanceof Error ? gotoError.message : String(gotoError)
        if (errorMsg.includes('net::ERR_NAME_NOT_RESOLVED') || errorMsg.includes('DNS')) {
          throw new CrawlSkippedError('DNS resolution failed', 'DNS_ERROR')
        }
        if (
          errorMsg.includes('SSL') ||
          errorMsg.includes('certificate') ||
          errorMsg.includes('ERR_CERT') ||
          errorMsg.includes('CERT_')
        ) {
          throw new CrawlSkippedError('SSL/Certificate error', 'SSL_ERROR')
        }
        if (errorMsg.includes('timeout')) {
          throw new CrawlSkippedError('Request timeout', 'TIMEOUT')
        }
        throw gotoError
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))

      const skipCheck = await checkSkipAfterLoad(homepagePage, response, website)
      if (skipCheck.skip) {
        throw new CrawlSkippedError(skipCheck.reason || 'Unknown reason', skipCheck.code || 'UNKNOWN')
      }

      const footerEmails = extractEmailsFromFooter(
        await homepagePage.content(),
        website
      )
      allEmails.push(...footerEmails)

      if (Date.now() >= deadline) {
        const uniqueEmails = Array.from(
          new Map(allEmails.map((e) => [e.email, e])).values()
        )
        return {
          emails: uniqueEmails,
          pagesCrawled: 1,
        }
      }

      const maxLinksPerPage = HARD_LIMITS.MAX_LINKS_PER_PAGE
      const allLinks = await homepagePage.$$eval(
        'a[href]',
        (links: Element[], maxLinks: number) =>
          links
            .map((link: Element) => (link as HTMLAnchorElement).href)
            .filter((href: string) => href)
            .slice(0, maxLinks),
        maxLinksPerPage
      )

      let impressumUrl: string | null = null
      let contactUrl: string | null = null

      for (const link of allLinks) {
        if (Date.now() >= deadline) break

        if (isSameDomain(website, link)) {
          try {
            const linkPath = new URL(link).pathname.toLowerCase()
            if (!impressumUrl && IMPRINT_PATTERNS.some((pattern) => linkPath.includes(pattern))) {
              impressumUrl = link
            }
            if (!contactUrl && CONTACT_PATTERNS.some((pattern) => linkPath.includes(pattern))) {
              contactUrl = link
            }
            if (impressumUrl && contactUrl) break
          } catch {
            continue
          }
        }
      }

      const pagesToCrawl: Array<{ url: string; type: 'impressum' | 'contact' }> = []

      if (impressumUrl) {
        pagesToCrawl.push({ url: impressumUrl, type: 'impressum' })
      }

      if (contactUrl) {
        pagesToCrawl.push({ url: contactUrl, type: 'contact' })
      }

      pagesCrawled = 1

      if (pagesToCrawl.length === 0) {
        const uniqueEmails = Array.from(
          new Map(allEmails.map((e) => [e.email, e])).values()
        )
        return {
          emails: uniqueEmails,
          pagesCrawled: 1,
        }
      }

      for (let i = 0; i < Math.min(pagesToCrawl.length, HARD_LIMITS.MAX_PAGES_PER_CRAWL - 1); i++) {
        if (Date.now() >= deadline) break

        const { url, type } = pagesToCrawl[i]
        const crawlPage = await context.newPage()

        try {
          const response = await crawlPage.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: config.pageTimeoutMs,
          })

          await new Promise((resolve) => setTimeout(resolve, 2000))

          const skipCheck = await checkSkipAfterLoad(crawlPage, response, url)
          if (skipCheck.skip) {
            continue
          }

          if (Date.now() >= deadline) break

          const html = await crawlPage.content()
          const text = await crawlPage.textContent('body') || ''

          const mailtoEmails = extractEmailsFromMailtoLinks(
            html,
            url,
            HARD_LIMITS.MAX_EMAILS_PER_PAGE
          )
          const obfuscatedEmails = extractObfuscatedEmails(text, url)
          const textEmails = extractEmailsFromText(
            text,
            url,
            type === 'impressum' ? 'impressum' : 'contact',
            HARD_LIMITS.MAX_EMAILS_PER_PAGE
          )
          const labelEmails = extractEmailsWithLabels(
            text,
            url,
            type === 'impressum' ? 'impressum' : 'contact'
          )

          allEmails.push(...mailtoEmails, ...obfuscatedEmails, ...textEmails, ...labelEmails)

          if (checkEarlyExit(allEmails, website)) {
            break
          }

          pagesCrawled++
        } catch (error) {
          if (error instanceof CrawlSkippedError) {
            throw error
          }
          const errorMsg = error instanceof Error ? error.message : String(error)
          if (errorMsg.includes('net::ERR_NAME_NOT_RESOLVED') || errorMsg.includes('DNS')) {
            throw new CrawlSkippedError('DNS resolution failed', 'DNS_ERROR')
          }
          if (
            errorMsg.includes('SSL') ||
            errorMsg.includes('certificate') ||
            errorMsg.includes('ERR_CERT') ||
            errorMsg.includes('CERT_')
          ) {
            throw new CrawlSkippedError('SSL/Certificate error', 'SSL_ERROR')
          }
          if (errorMsg.includes('timeout')) {
            throw new CrawlSkippedError('Request timeout', 'TIMEOUT')
          }
        } finally {
          await crawlPage.close()
        }
      }
    } finally {
      await homepagePage.close()
    }

    const uniqueEmails = Array.from(
      new Map(allEmails.map((e) => [e.email, e])).values()
    )

    return {
      emails: uniqueEmails,
      pagesCrawled,
    }
  } finally {
    if (context) {
      await context.close()
    }
  }
}

process.on('SIGTERM', async () => {
  await closeBrowser()
})

process.on('SIGINT', async () => {
  await closeBrowser()
})
