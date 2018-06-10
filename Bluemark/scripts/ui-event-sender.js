/* globals
  browser,
  CustomEvent,
  cloneInto,
*/
'use strict'

/*
* 파이어폭스에선 event.detail을 그냥 넘기면 Permission denied 오류가 발생한다.
* 따라서, 파이어폭스에 존재하는 cloneInto함수로 detail을 복제해서 넘겨줘야 한다.
* 참고: https://stackoverflow.com/a/46081249
* 참고: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent#Firing_from_privileged_code_to_non-privileged_code
*/
function triggerCustomEvent (target, name, detail_ = null) {
  let detail = detail_
  if (typeof cloneInto === 'function' && detail != null) {
    detail = cloneInto(detail, document.defaultView)
  }
  target.dispatchEvent(new CustomEvent(name, { detail }))
}

// eslint-disable-next-line no-unused-vars
function showMessage (message) {
  triggerCustomEvent(document, '$$uiShowMessage', { message })
}

// eslint-disable-next-line no-unused-vars
function showError (message) {
  triggerCustomEvent(document, '$$uiShowError', { message })
}

// eslint-disable-next-line no-unused-vars
function closeDropdownMenu () {
  triggerCustomEvent(document, '$$uiCloseDropdowns')
}

/*
* 확장기능 content_script로는 페이지 내에서 정의한 함수/변수를 사용할 수 없고,
* jQuery로 정의한 이벤트는 DOM dispatchEvent로 trigger할 수도 없다.
* 따라서, jQuery에 접근할 수 있는 별도의 스크립트를 만들어 이벤트를 처리하도록 한다.
*/
// eslint-disable-next-line no-unused-vars
function injectScript (path) {
  const script = document.createElement('script')
  script.src = browser.runtime.getURL(path)
  const appendTarget = (document.head || document.documentElement)
  appendTarget.appendChild(script)
}
