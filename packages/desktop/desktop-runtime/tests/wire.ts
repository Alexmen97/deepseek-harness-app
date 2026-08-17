/** Decoded JSON-RPC line on the desktop test wire. */
export interface WireLine {
  jsonrpc: string
  id?: string
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: { code?: number; message?: string }
}
