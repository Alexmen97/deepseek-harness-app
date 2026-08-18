/**
 * Desktop language store: the System preference plus the seven shipped
 * languages and its resolved language. Desktop-only strings translate
 * through this store; the upstream UI locale follows the resolved language
 * (the upstream client ships all seven dictionaries).
 *
 * @module @deepseek-ai/dsh-desktop-client/locale
 */

import { desktopBindings } from './transport.ts'

/** The persisted preference identifier values. */
export type DesktopLanguageSetting = 'system' | 'en' | 'zh' | 'it' | 'es' | 'fr' | 'de' | 'pt-BR'
/** One resolved language (never 'system'). */
export type DesktopLanguage = Exclude<DesktopLanguageSetting, 'system'>

/** The seven supported application languages in display order. */
export const SUPPORTED_DESKTOP_LANGUAGES: readonly DesktopLanguage[] = ['en', 'zh', 'it', 'es', 'fr', 'de', 'pt-BR']

/** Desktop preference key carrying the language setting. */
export const LANGUAGE_PREFERENCE = 'language' as const

type LanguageListener = (language: DesktopLanguage, setting: DesktopLanguageSetting) => void

/**
 * System language resolution from a macOS locale tag: regional variants map
 * to their shipped language, every Portuguese variant maps to Brazilian
 * Portuguese, Chinese variants follow the upstream zh model, and anything
 * else resolves to English. English is the only desktop fallback.
 * @param primary - the first navigator language, or undefined when unavailable.
 * @returns the resolved desktop language.
 */
export function resolveSystemLanguage(primary: string | undefined): DesktopLanguage {
  if (primary === undefined) return 'en'
  const subtag = primary.toLowerCase().split('-')[0] ?? ''
  switch (subtag) {
    case 'zh': return 'zh'
    case 'it': return 'it'
    case 'es': return 'es'
    case 'fr': return 'fr'
    case 'de': return 'de'
    case 'pt': return 'pt-BR'
    default: return 'en'
  }
}

class DesktopLocale {
  private setting: DesktopLanguageSetting = 'system'
  private resolved: DesktopLanguage = 'en'
  private readonly listeners = new Set<LanguageListener>()
  private loaded: Promise<void> | undefined

  /** Load the saved preference once; the default stays System. */
  init(): Promise<void> {
    this.loaded ??= desktopBindings().host.prefsGet(LANGUAGE_PREFERENCE)
      .then((value) => {
        if (value !== undefined && (value === 'system' || (SUPPORTED_DESKTOP_LANGUAGES as readonly string[]).includes(value))) {
          this.setting = value as DesktopLanguageSetting
          this.resolved = this.resolve()
          for (const listener of [...this.listeners]) listener(this.resolved, this.setting)
        }
      })
      .catch(() => {})
    return this.loaded
  }

  get(): DesktopLanguage {
    return this.resolved
  }

  getSetting(): DesktopLanguageSetting {
    return this.setting
  }

  subscribe(listener: LanguageListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Persist and apply a language setting; applies without a runtime restart. */
  async set(next: DesktopLanguageSetting): Promise<void> {
    this.setting = next
    this.resolved = this.resolve()
    for (const listener of [...this.listeners]) listener(this.resolved, this.setting)
    await desktopBindings().host.prefsSet(LANGUAGE_PREFERENCE, next)
    await desktopBindings().host.setMenuLanguage(this.resolved)
  }

  private resolve(): DesktopLanguage {
    if (this.setting !== 'system') return this.setting
    const primary = typeof navigator === 'undefined' ? undefined : (navigator.languages[0] ?? navigator.language)
    return resolveSystemLanguage(primary)
  }
}

/** The singleton desktop language store. */
export const desktopLocale = new DesktopLocale()
