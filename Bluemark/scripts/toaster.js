/* globals
  browser
*/

class Toaster {
  constructor () {
    const rootElem = this.rootElem = document.createElement('div')
    const shadowRoot = this.shadowRoot = rootElem.attachShadow({ mode: 'closed' })
    const cssUrl = browser.runtime.getURL('styles/toaster.css')
    shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${cssUrl}" />
      <div class="container"></div>`
    document.body.appendChild(rootElem)
  }
  toast (message, toastType, timeout = 3500) {
    const container = this.shadowRoot.querySelector('.container')
    const toast = document.createElement('div')
    toast.className = (toastType === 'error') ? 'toast error' : 'toast'
    toast.innerHTML = `
      <div class="content"></div>
      <div class="ctrl">
        <input type="button" class="close button" value="×" />
      </div>
    `
    const closeToast = () => {
      toast.addEventListener('animationend', event => {
        toast.remove()
      }, { once: true })
      toast.classList.add('hiding')
    }
    const timer = window.setTimeout(closeToast, timeout)
    const content = toast.querySelector('.content')
    content.textContent = message
    const closeButton = toast.querySelector('.close.button')
    closeButton.addEventListener('click', event => {
      event.preventDefault()
      window.clearTimeout(timer)
      closeToast()
    })
    container.appendChild(toast)
  }
}

/* globals window */

function loadToaster () {
  const toaster = new Toaster()
  document.addEventListener('$$uiShowMessage', event => {
    const { message } = event.detail
    toaster.toast(message, 'normal')
  })
  document.addEventListener('$$uiShowError', event => {
    const { message } = event.detail
    toaster.toast(message, 'error')
  })
}

if (location.hostname === 'tweetdeck.twitter.com') {
  loadToaster()
}
