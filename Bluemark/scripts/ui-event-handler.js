/* globals $ */

document.addEventListener('$$uiCloseDropdowns', event => {
  $(document).trigger('uiCloseDropdowns')
})

document.addEventListener('$$uiShowMessage', event => {
  const { message } = event.detail
  $(document).trigger('uiShowMessage', {
    timeout: 3500,
    message
  })
})

document.addEventListener('$$uiShowError', event => {
  $(document).trigger('uiShowError', event.detail)
})
