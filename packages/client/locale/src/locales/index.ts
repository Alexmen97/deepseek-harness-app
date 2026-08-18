/**
 * The common-namespace dictionary pair. zh is the source of truth for the
 * key set (Chinese-first repo convention); en is checked complete against it
 * — a missing or extra en key is a compile error.
 */
export { zh } from './zh.ts'
export { en } from './en.ts'
export { it } from './it.ts'
export { es } from './es.ts'
export { fr } from './fr.ts'
export { de } from './de.ts'
export { ptBr } from './pt-BR.ts'
export type { CommonKey } from './zh.ts'
