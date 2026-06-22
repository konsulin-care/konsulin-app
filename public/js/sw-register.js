if ('serviceWorker' in navigator) {
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('[SW] registration failed:', err);
  }
}
