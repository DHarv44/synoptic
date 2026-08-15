/** Minimum severity a user is willing to be interrupted for. */
export const SEVERITY_LEVELS = ['Extreme', 'Severe', 'Moderate', 'Minor'] as const
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

const RANK: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

export function meetsSeverity(severity: string, minimum: SeverityLevel): boolean {
  return (RANK[severity] ?? 4) <= RANK[minimum]
}
