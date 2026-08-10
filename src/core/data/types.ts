export type SourceStatus = 'idle' | 'ok' | 'stale' | 'error' | 'disabled'

export interface SourceRef {
  id: string
  label: string
}

export interface SourceHealth extends SourceRef {
  status: SourceStatus
  /** ms epoch of last successful fetch */
  lastSuccess?: number
  lastError?: string
}
