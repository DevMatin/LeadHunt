export interface EmailMatch {
  email: string
  source_url: string
  confidence_score: number
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const EMAIL_REGEX_WITH_SPACES = /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g
const EMAIL_VALIDATION_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const MAX_EMAIL_LENGTH = 254

const BLOCKED_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /example@/i,
  /test@/i,
  /placeholder@/i,
  /your-email@/i,
  /email@example\.com/i,
]

const FREEMAILER_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'yandex.com',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'gmx.ch',
  'web.de',
  't-online.de',
  't-online.com',
  'freenet.de',
  '1und1.de',
  'online.de',
  'arcor.de',
  'live.com',
  'msn.com',
  'ymail.com',
  'rocketmail.com',
  'yahoo.de',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.it',
  'yahoo.es',
  'zoho.com',
  'mail.ru',
  'inbox.com',
  'fastmail.com',
  'tutanota.com',
  'mailbox.org',
  'posteo.de',
  'hey.com',
  'proton.me',
  'pm.me',
]

function isBlockedEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase()
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(lowerEmail))
}

function isFreemailer(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? FREEMAILER_DOMAINS.includes(domain) : false
}

function validateEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false
  }
  const trimmed = email.trim().replace(/[.,;:!?]+$/, '')
  return EMAIL_VALIDATION_REGEX.test(trimmed)
}

function normalizeObfuscatedEmail(text: string): string | null {
  let normalized = text.trim()

  normalized = normalized.replace(/\s*\[at\]\s*/gi, '@')
  normalized = normalized.replace(/\s*\(at\)\s*/gi, '@')
  normalized = normalized.replace(/\s*\[AT\]\s*/gi, '@')
  normalized = normalized.replace(/\s*\(AT\)\s*/gi, '@')
  normalized = normalized.replace(/\s+at\s+/gi, '@')
  normalized = normalized.replace(/\s+AT\s+/gi, '@')
  normalized = normalized.replace(/\s*\[dot\]\s*/gi, '.')
  normalized = normalized.replace(/\s*\(dot\)\s*/gi, '.')
  normalized = normalized.replace(/\s*\[DOT\]\s*/gi, '.')
  normalized = normalized.replace(/\s*\(DOT\)\s*/gi, '.')
  normalized = normalized.replace(/\s+dot\s+/gi, '.')
  normalized = normalized.replace(/\s+DOT\s+/gi, '.')
  normalized = normalized.replace(/\s*@\s*(\w+)\s+dot\s+(\w+)/gi, '@$1.$2')
  normalized = normalized.replace(/\s*@\s*(\w+)\s+DOT\s+(\w+)/gi, '@$1.$2')
  normalized = normalized.replace(/\s+/g, '')

  normalized = normalized.toLowerCase().trim().replace(/[.,;:!?]+$/, '')

  if (validateEmail(normalized)) {
    return normalized
  }

  return null
}

export function extractObfuscatedEmails(
  text: string,
  url: string
): EmailMatch[] {
  const results: EmailMatch[] = []
  const obfuscationPatterns = [
    /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+(?:\s*\[dot\]\s*[a-zA-Z]{2,})?/gi,
    /[a-zA-Z0-9._%+-]+\(at\)[a-zA-Z0-9.-]+(?:\(dot\)[a-zA-Z]{2,})?/gi,
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9._%+-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9._%+-]+\s+AT\s+[a-zA-Z0-9.-]+\s+DOT\s+[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9._%+-]+\s*\[AT\]\s*[a-zA-Z0-9.-]+(?:\s*\[DOT\]\s*[a-zA-Z]{2,})?/gi,
    /[a-zA-Z0-9._%+-]+\(AT\)[a-zA-Z0-9.-]+(?:\(DOT\)[a-zA-Z]{2,})?/gi,
  ]

  for (const pattern of obfuscationPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    for (const match of matches) {
      const normalized = normalizeObfuscatedEmail(match[0])
      if (normalized && !isBlockedEmail(normalized)) {
        results.push({
          email: normalized,
          source_url: url,
          confidence_score: 85,
        })
      }
    }
  }

  return Array.from(new Map(results.map((r) => [r.email, r])).values())
}

export function extractEmailsFromFooter(
  html: string,
  url: string
): EmailMatch[] {
  const footerSelectors = [
    'footer',
    '[role="contentinfo"]',
    '[role="footer"]',
    '.footer',
    '.site-footer',
    '.page-footer',
    '.main-footer',
  ]

  const results: EmailMatch[] = []
  
  for (const selector of footerSelectors) {
    const footerRegex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'i')
    const match = html.match(footerRegex)
    if (match) {
      const footerText = match[1]
      const mailtoEmails = extractEmailsFromMailtoLinks(footerText, url)
      const textEmails = extractEmailsFromText(footerText, url, 'footer')
      const obfuscatedEmails = extractObfuscatedEmails(footerText, url)
      const labelEmails = extractEmailsWithLabels(footerText, url, 'footer')
      
      results.push(...mailtoEmails, ...textEmails, ...obfuscatedEmails, ...labelEmails)
    }
  }

  return Array.from(new Map(results.map((r) => [r.email, r])).values())
}

function calculateConfidenceScore(
  email: string,
  pageType: 'homepage' | 'contact' | 'impressum' | 'footer' | 'mailto',
  isMailto: boolean
): number {
  if (isMailto) {
    return 100
  }

  if (pageType === 'contact' || pageType === 'impressum') {
    return 90
  }

  if (pageType === 'footer') {
    return 75
  }

  if (pageType === 'homepage') {
    return 60
  }

  return 50
}

export function extractEmailsWithLabels(
  text: string,
  url: string,
  pageType: 'homepage' | 'contact' | 'impressum' | 'footer' | 'mailto'
): EmailMatch[] {
  const results: EmailMatch[] = []
  const emailLabelPatterns = [
    /(?:e-?mail|kontakt|contact|adresse|address|e-?mail-?adresse|kontakt-?e-?mail)[\s:]*([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})/gi,
    /(?:e-?mail|kontakt|contact|adresse|address|e-?mail-?adresse|kontakt-?e-?mail)[\s:]*([a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+(?:\s*\[dot\]\s*[a-zA-Z]{2,})?)/gi,
    /(?:e-?mail|kontakt|contact|adresse|address|e-?mail-?adresse|kontakt-?e-?mail)[\s:]*([a-zA-Z0-9._%+-]+\(at\)[a-zA-Z0-9.-]+(?:\(dot\)[a-zA-Z]{2,})?)/gi,
    /(?:e-?mail|kontakt|contact|adresse|address|e-?mail-?adresse|kontakt-?e-?mail)[\s:]*([a-zA-Z0-9._%+-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,})/gi,
    /(?:e-?mail|kontakt|contact)[\s:]+([a-zA-Z0-9._%+-]+)\s*(?:@|at|\[at\]|\(at\))\s*([a-zA-Z0-9.-]+)\s*(?:\.|dot|\[dot\]|\(dot\))\s*([a-zA-Z]{2,})/gi,
  ]

  for (const pattern of emailLabelPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    for (const match of matches) {
      if (match[1]) {
        let emailText = match[1].trim()
        
        if (match[2] && match[3]) {
          emailText = `${match[1]}@${match[2]}.${match[3]}`
        }
        
        let normalized = emailText.toLowerCase().trim()
        normalized = normalized.replace(/\s+/g, '')
        
        const obfuscated = normalizeObfuscatedEmail(emailText)
        if (obfuscated) {
          normalized = obfuscated
        }
        
        normalized = normalized.replace(/[.,;:!?]+$/, '')
        
        if (!validateEmail(normalized) || isBlockedEmail(normalized)) {
          continue
        }

        const isFreemail = isFreemailer(normalized)
        let confidence = calculateConfidenceScore(normalized, pageType, false)
        
        if (isFreemail) {
          confidence = Math.max(confidence - 10, 50)
        }
        
        if (confidence >= 50) {
          results.push({
            email: normalized,
            source_url: url,
            confidence_score: Math.max(confidence, 80),
          })
        }
      }
    }
  }

  return Array.from(new Map(results.map((r) => [r.email, r])).values())
}

export function extractEmailsFromText(
  text: string,
  url: string,
  pageType: 'homepage' | 'contact' | 'impressum' | 'footer' | 'mailto',
  limit: number = 10
): EmailMatch[] {
  const labelEmails = extractEmailsWithLabels(text, url, pageType)
  
  const matches1 = text.match(EMAIL_REGEX) || []
  const matches2 = text.match(EMAIL_REGEX_WITH_SPACES) || []
  
  const allMatches = [...matches1, ...matches2]
  if (allMatches.length === 0 && labelEmails.length === 0) {
    return []
  }

  const uniqueEmails = Array.from(new Set(allMatches))
  const results: EmailMatch[] = [...labelEmails]

  for (const email of uniqueEmails) {
    if (results.length >= limit) {
      break
    }

    if (isBlockedEmail(email)) {
      continue
    }

    let normalized = email.toLowerCase().trim()
    normalized = normalized.replace(/\s+/g, '')
    normalized = normalized.replace(/[.,;:!?]+$/, '')
    
    if (!validateEmail(normalized)) {
      continue
    }

    const isFreemail = isFreemailer(normalized)
    let confidence = calculateConfidenceScore(normalized, pageType, false)

    if (isFreemail) {
      confidence = Math.max(confidence - 10, 50)
    }

    if (confidence < 50) {
      continue
    }

    const existingEmail = results.find((r) => r.email === normalized)
    if (!existingEmail) {
      results.push({
        email: normalized,
        source_url: url,
        confidence_score: confidence,
      })
    }
  }

  return results
}

export function extractEmailsFromMailtoLinks(
  html: string,
  url: string,
  limit: number = 10
): EmailMatch[] {
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  const matches = Array.from(html.matchAll(mailtoRegex))
  const results: EmailMatch[] = []

  for (const match of matches) {
    if (results.length >= limit) {
      break
    }

    const email = match[1]?.toLowerCase().trim()
    if (!email || isBlockedEmail(email) || !validateEmail(email)) {
      continue
    }

    results.push({
      email,
      source_url: url,
      confidence_score: 100,
    })
  }

  return Array.from(
    new Map(results.map((r) => [r.email, r])).values()
  )
}

export function matchesDomain(email: string, websiteUrl: string): boolean {
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase()
    const urlDomain = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, '')
    return emailDomain === urlDomain || emailDomain?.endsWith('.' + urlDomain)
  } catch {
    return false
  }
}

