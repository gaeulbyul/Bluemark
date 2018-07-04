/* globals window */

let toaster
try {
  toaster = window.findModule('showNotification')[0]
} catch (e) {
  console.warn('Fail to find notification module: ', e)
  toaster = {
    showNotification () {},
    showErrorNotification () {}
  }
}

document.addEventListener('$$uiShowMessage', event => {
  const { message } = event.detail
  toaster.showNotification({
    title: 'Bluemark',
    message
  })
})

document.addEventListener('$$uiShowError', event => {
  const { message } = event.detail
  toaster.showErrorNotification({ message })
})
