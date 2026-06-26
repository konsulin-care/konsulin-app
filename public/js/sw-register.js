if ('serviceWorker' in navigator) {
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    console.warn('[SW] registration failed')
  }
}
