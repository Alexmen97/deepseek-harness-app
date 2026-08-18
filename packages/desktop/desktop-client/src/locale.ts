/**
 * Desktop language store: the System/English/Italiano preference and its
 * resolved two-letter language. Desktop-only strings translate through this
 * store; the upstream UI locale stays pinned to English by the desktop host
 * (the upstream client ships English/Chinese dictionaries only).
 *
 * @module @deepseek-ai/dsh-desktop-client/locale
 */

import { desktopBindings } from './transport.ts'

/** The persisted preference identifier values. */
export type DesktopLanguageSetting = 'system' | 'en' | 'it'
/** The resolved two-letter language (never 'system'). */
export type DesktopLanguage = 'en' | 'it'

/** Desktop preference key carrying the language setting. */
export const LANGUAGE_PREFERENCE = 'language' as const

type LanguageListener = (language: DesktopLanguage, setting: DesktopLanguageSetting) => void

/**
 * System language resolution: Italian macOS resolves to Italian, everything
 * else English. Chinese is never a desktop fallback.
 * @param primary - the first navigator language, or undefined when unavailable.
 * @returns the resolved desktop language.
 */
export function resolveSystemLanguage(primary: string | undefined): DesktopLanguage {
  if (primary === undefined) return 'en'
  return primary.toLowerCase().startsWith('it') ? 'it' : 'en'
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
        if (value === 'en' || value === 'it' || value === 'system') {
          this.setting = value
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
