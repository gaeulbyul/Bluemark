/* globals window */

function Webhack (webpack) {
  webpack([], {
    webhack (_module, _exports, _require) {
      const modules = _require.c
      const keys = Object.keys(modules)
      _module.exports = {
        _require,
        extractModuleByMethodName (name) {
          for (const key of keys) {
            const mod = modules[key].exports
            if (typeof mod === 'object' && typeof mod[name] === 'function') {
              return mod
            }
          }
        }
      }
    }
  })
  return webpack([], [], ['webhack'])
}

function handleUIEvent () {
  const webhack = Webhack(window.webpackJsonp)
  const toaster = webhack.extractModuleByMethodName('showNotification')
  if (!toaster) {
    throw new Error('Fail to load module:toaster')
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
}

handleUIEvent()
