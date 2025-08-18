export async function copyToClipboard(text, onSuccess, onError) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    if (onSuccess) onSuccess()
  } catch (err) {
    console.error('Copy failed', err)
    if (onError) onError(err)
  }
}