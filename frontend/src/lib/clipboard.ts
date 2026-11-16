export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const field = document.createElement('textarea')
  field.value = text
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.readOnly = true
  document.body.append(field)
  const focused = document.activeElement
  try {
    field.select()
    if (!document.execCommand('copy')) throw new Error('Copy failed')
  } finally {
    field.remove()
    if (focused instanceof HTMLElement) focused.focus()
  }
}
