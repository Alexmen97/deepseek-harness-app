// @vitest-environment jsdom
/**
 * Desktop localization contract: system-locale normalization, the
 * seven-language dictionary completeness, placeholder parity, live
 * switching without a runtime restart, and the English-only fallback.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { desktopLocale, resolveSystemLanguage, SUPPORTED_DESKTOP_LANGUAGES, type DesktopLanguageSetting } from '../src/locale.ts'
import { desktopText, de, en, es, fr, it as itDict, ptBr, zh, type DesktopStringKey } from '../src/ui/strings.ts'
import { installDesktopBindings, type DesktopBindings, type DesktopHost } from '../src/transport.ts'

type FakeHost = { [K in keyof DesktopHost]: (...args: Parameters<DesktopHost[K]>) => ReturnType<DesktopHost[K]> }

function fakeHost(): FakeHost {
  return {
    pickWorkspace: vi.fn(async () => null),
    credentialStatus: vi.fn(async () => ({ configured: false })),
    credentialSet: vi.fn(async () => {}),
    credentialDelete: vi.fn(async () => {}),
    fsList: vi.fn(async () => []),
    fsReadText: vi.fn(async () => ''),
    revealInPath: vi.fn(async () => {}),
    gitStatus: vi.fn(async () => ({ repository: false })),
    gitStageFile: vi.fn(async () => {}),
    gitUnstageFile: vi.fn(async () => {}),
    gitStatusV2: vi.fn(async () => ({ repository: false })),
    gitDiff: vi.fn(async () => ({ repository: false })),
    openLogs: vi.fn(async () => {}),
    openExternal: vi.fn(async () => {}),
    prefsGet: vi.fn(async () => undefined),
    prefsSet: vi.fn(async () => {}),
    restartRuntime: vi.fn(async () => {}),
    stopRuntime: vi.fn(async () => {}),
    diagnostics: vi.fn(async () => ({})),
    setMenuLanguage: vi.fn(async () => {}),
    notify: vi.fn(async () => {}),
    subscribeFocus: vi.fn(() => () => {}),
    pickAttachments: vi.fn(async () => []),
    runtimeStatus: vi.fn(async () => ({ state: 'stopped' as const, generation: 0 })),
    subscribeWorkspaceChanged: vi.fn(() => () => {}),
    quitGuardArm: vi.fn(async () => {}),
    subscribeQuitGuard: vi.fn(() => () => {}),
    quitNow: vi.fn(async () => {}),
    workspaceFiles: vi.fn(async () => []),
  }
}

describe('resolveSystemLanguage', () => {
  it.each([
    ['it-IT', 'it'], ['it', 'it'],
    ['es-ES', 'es'], ['es-MX', 'es'], ['es-AR', 'es'],
    ['fr-FR', 'fr'], ['fr-CA', 'fr'],
    ['de-DE', 'de'], ['de-AT', 'de'], ['de-CH', 'de'],
    ['pt-BR', 'pt-BR'], ['pt-PT', 'pt-BR'], ['pt', 'pt-BR'],
    ['zh-CN', 'zh'], ['zh-Hant-TW', 'zh'],
    ['en-US', 'en'], ['en-GB', 'en'],
  ])('maps %s to %s', (primary, expected) => {
    expect(resolveSystemLanguage(primary)).toBe(expected)
  })

  it.each([['nl-NL'], ['ko-KR'], ['ja-JP'], ['ru-RU']])('falls back to English for unsupported %s', (primary) => {
    expect(resolveSystemLanguage(primary)).toBe('en')
  })

  it('falls back to English when the system locale is unavailable', () => {
    expect(resolveSystemLanguage(undefined)).toBe('en')
  })
})

describe('desktop dictionaries', () => {
  const dicts = { en, zh, it: itDict, es, fr, de, 'pt-BR': ptBr }
  const keys = Object.keys(en) as DesktopStringKey[]
  const placeholders = (value: string): string[] => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1] as string).sort()

  it('ships exactly the seven supported languages', () => {
    expect(SUPPORTED_DESKTOP_LANGUAGES).toEqual(['en', 'zh', 'it', 'es', 'fr', 'de', 'pt-BR'])
  })

  it('keeps every locale complete and non-empty', () => {
    for (const [locale, dict] of Object.entries(dicts)) {
      for (const key of keys) {
        expect(dict[key], locale + ':' + key).toBeTruthy()
      }
      expect(Object.keys(dict).sort(), locale).toEqual([...keys].sort())
    }
  })

  it('keeps placeholder parity with English', () => {
    for (const [locale, dict] of Object.entries(dicts)) {
      if (locale === 'en') continue
      for (const key of keys) {
        expect(placeholders(dict[key]), locale + ':' + key).toEqual(placeholders(en[key]))
      }
    }
  })

  it('renders representative surfaces in each added language', () => {
    const surfaces: DesktopStringKey[] = ['onboarding.welcome.title', 'settings.title', 'credentials.replace', 'status.running', 'notification.approval', 'settings.language']
    for (const locale of ['it', 'es', 'fr', 'de', 'pt-BR'] as const) {
      for (const key of surfaces) {
        const value = desktopText(locale, key)
        expect(value.length).toBeGreaterThan(0)
        expect(value).not.toContain('{{')
      }
    }
  })
})

describe('live language switching', () => {
  let host: FakeHost

  beforeEach(async () => {
    host = fakeHost()
    const bindings: DesktopBindings = {
      host,
      transport: {
        request: vi.fn(async () => ({})),
        subscribeFrames: vi.fn(() => () => {}),
        subscribeState: vi.fn(() => () => {}),
      },
    }
    installDesktopBindings(bindings)
    await desktopLocale.init()
  })

  afterEach(async () => {
    await desktopLocale.set('system')
  })

  it('persists only the preference identifier and rebuilds only the native menu', async () => {
    await desktopLocale.set('fr')
    expect(desktopLocale.get()).toBe('fr')
    expect(host.prefsSet).toHaveBeenCalledWith('language', 'fr')
    expect(host.setMenuLanguage).toHaveBeenCalledWith('fr')
    expect(host.restartRuntime).not.toHaveBeenCalled()
    expect(host.stopRuntime).not.toHaveBeenCalled()
  })

  it('walks every supported language and System without touching the runtime', async () => {
    const sequence: DesktopLanguageSetting[] = ['en', 'it', 'es', 'fr', 'de', 'pt-BR', 'zh', 'system']
    for (const next of sequence) {
      await desktopLocale.set(next)
      expect(desktopLocale.getSetting()).toBe(next)
    }
    expect(host.restartRuntime).not.toHaveBeenCalled()
    expect(host.setMenuLanguage).toHaveBeenCalledTimes(sequence.length)
  })
})
