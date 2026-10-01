// Older records include the standard duration in the procedure string.
export const procedureName = (value: unknown): string =>
  String(value ?? '').replace(/\s*-\s*\d+\s*mins?\s*$/i, '').trim()

export const standardProcedureDuration = (value: unknown): number =>
  Number(String(value ?? '').match(/(\d+)\s*mins?\s*$/i)?.[1]) || 0

export const bookingDuration = (booking: { durationMinutes?: unknown; procedure?: unknown }): number => {
  const minutes = Number(booking.durationMinutes)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : standardProcedureDuration(booking.procedure)
}
