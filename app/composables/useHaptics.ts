/**
 * Composable for haptic feedback via navigator.vibrate().
 * No-ops gracefully on unsupported browsers (desktop, older Safari, etc.).
 */
export function useHaptics() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

  function vibrate(pattern: number | number[]) {
    if (canVibrate) navigator.vibrate(pattern)
  }

  /** 10 ms — taps, toggles, tab switches */
  const light = () => vibrate(10)

  /** 25 ms — confirmations, selections */
  const medium = () => vibrate(25)

  /** 50 ms — destructive actions */
  const heavy = () => vibrate(50)

  /** Pattern [10, 50, 10] — generation complete */
  const success = () => vibrate([10, 50, 10])

  return { light, medium, heavy, success }
}
