/* globals
  CustomEvent,
  Headers,
  MutationObserver,
  URLSearchParams,
  browser,
  cloneInto,
  fetch,
  location,
*/
'use strict'

// 모바일 트위터웹의 main.{hash}.js에 하드코딩되어있는 값
const BEARER_TOKEN = `AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`

function getCSRFToken () {
  const match = /\bct0=([0-9a-f]{32})\b/.exec(document.cookie)
  if (match && match[1]) {
    return match[1]
  } else {
    throw new Error('Failed to get CSRF token.')
  }
}

function generateTwitterAPIOptions () {
  const csrfToken = getCSRFToken()
  const headers = new Headers()
  headers.set('authorization', `Bearer ${BEARER_TOKEN}`)
  headers.set('x-csrf-token', csrfToken)
  headers.set('x-twitter-active-user', 'yes')
  headers.set('x-twitter-auth-type', 'OAuth2Session')
  // headers.set('x-twitter-client-language', 'ko')
  const body = new URLSearchParams()
  return {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    referrer: location.href,
    headers,
    body
  }
}

async function addToBookmark (tweetId) {
  const url = 'https://api.twitter.com/1.1/bookmark/entries/add.json'
  const fetchOptions = generateTwitterAPIOptions()
  fetchOptions.body.append('tweet_id', tweetId)
  fetchOptions.body.append('tweet_mode', 'extended')
  const response = await fetch(url, fetchOptions)
  const responseJson = await response.json()
  if (responseJson.errors && responseJson.errors.length > 0) {
    const { errors } = responseJson
    const firstError = errors[0]
    // {"errors":[{"code":405,"message":"You have already bookmarked this Tweet"}]}
    if (firstError.code === 405) {
      return false
    }
    const errorMessage = `Error(${firstError.code}): ${firstError.message}`
    throw new Error(errorMessage)
  }
  return true
}

async function removeFromBookmark (tweetId) {
  const url = 'https://api.twitter.com/1.1/bookmark/entries/remove.json'
  const fetchOptions = generateTwitterAPIOptions()
  fetchOptions.body.append('tweet_id', tweetId)
  fetchOptions.body.append('tweet_mode', 'extended')
  const response = await fetch(url, fetchOptions)
  const responseJson = await response.json()
  if (responseJson.errors && responseJson.errors.length > 0) {
    const { errors } = responseJson
    const firstError = errors[0]
    // {"errors":[{"code":34,"message":"Sorry, that page does not exist."}]}
    if (firstError.code === 34) {
      return false
    }
    const errorMessage = `Error(${firstError.code}): ${firstError.message}`
    throw new Error(errorMessage)
  }
  return true
}

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

function showMessage (message) {
  triggerCustomEvent(document, '$$uiShowMessage', { message })
}

function showError (message) {
  triggerCustomEvent(document, '$$uiShowError', { message })
}

function closeDropdownMenu () {
  triggerCustomEvent(document, '$$uiCloseDropdowns')
}

function makeMenuItem (options, clickCallback) {
  const { className, text } = options
  const menuItem = document.createElement('li')
  menuItem.className = className
  menuItem.setAttribute('role', 'presentation')
  const button = document.createElement('button')
  button.className = 'dropdown-link'
  button.setAttribute('type', 'button')
  button.setAttribute('role', 'menuitem')
  button.textContent = text
  button.addEventListener('click', event => {
    closeDropdownMenu()
  })
  button.addEventListener('click', event => {
    clickCallback(event)
  })
  menuItem.appendChild(button)
  return menuItem
}

function insertBookmarkMenu (tweet) {
  const tweetId = tweet.getAttribute('data-tweet-id')
  const userNickName = tweet.getAttribute('data-name')
  const dropdownMenu = tweet.querySelector('.dropdown-menu')
  const addBookmarkMenuItem = makeMenuItem({
    className: 'bluemark-menu bluemark-add-bookmark',
    text: '트윗을 북마크에 넣기'
  }, event => {
    event.preventDefault()
    addToBookmark(tweetId).then(result => {
      tweet.classList.add('bluemark-added')
      if (result) {
        showMessage(`${userNickName}님의 트윗을 북마크에 추가했습니다.`)
      } else {
        showMessage('이미 북마크에 있는 트윗입니다.')
      }
    }, errorMessage => {
      showError(`북마크 추가도중 오류가 발생했습니다:\n${errorMessage}`)
    })
  })
  const removeBookmarkMenuItem = makeMenuItem({
    className: 'bluemark-menu bluemark-remove-bookmark',
    text: '트윗을 북마크에서 빼기'
  }, event => {
    event.preventDefault()
    removeFromBookmark(tweetId).then(result => {
      tweet.classList.remove('bluemark-added')
      if (result) {
        showMessage(`${userNickName}님의 트윗을 북마크에서 삭제했습니다.`)
      } else {
        showMessage('이미 삭제된 북마크입니다.')
      }
    }, errorMessage => {
      showError(`북마크 삭제도중 오류가 발생했습니다:\n${errorMessage}`)
    })
  })
  const embedLink = tweet.querySelector('li.embed-link')
  if (embedLink) {
    embedLink.before(addBookmarkMenuItem)
    embedLink.before(removeBookmarkMenuItem)
    return
  }
  // 비공개계정의 경우 "트윗 담아가기"(li.embed-link) 메뉴항목이 없다.
  const ul = dropdownMenu.querySelector('ul')
  ul.insertBefore(addBookmarkMenuItem, ul.firstChild)
  ul.insertBefore(removeBookmarkMenuItem, ul.firstChild)
}

function applyToRendered () {
  const dropdownMenus = document.getElementsByClassName('dropdown-menu')
  for (const menu of dropdownMenus) {
    const tweet = menu.closest('.tweet')
    if (!tweet) {
      continue
    }
    const alreadyInserted = tweet.getElementsByClassName('bluemark-menu').length > 0
    if (!alreadyInserted) {
      insertBookmarkMenu(tweet)
    }
  }
}

function addBookmarkListMenu () {
  const listmenu = document.querySelector('#user-dropdown li[data-name=lists]')
  if (!listmenu) {
    // 사용자메뉴가 없으면 북마크 메뉴를 추가하지 않는다.
    // (예: 로그인하지 않은 경우)
    return
  }
  const menuItem = document.createElement('li')
  menuItem.setAttribute('data-name', 'bluemark-bookmarks')
  menuItem.setAttribute('role', 'presentation')
  const link = document.createElement('a')
  link.className = 'js-nav'
  link.setAttribute('data-nav', 'bluemarks_bookmarks')
  link.setAttribute('role', 'menuitem')
  link.href = 'https://mobile.twitter.com/i/bookmarks'
  link.innerHTML = `
    <span class="DashUserDropdown-linkIcon Icon Icon--medium Icon--bookmark"></span>북마크 [모바일]
  `
  menuItem.appendChild(link)
  listmenu.after(menuItem)
}

function main () {
  const loggedOut = document.body.classList.contains('logged-out')
  if (loggedOut) {
    return
  }
  /*
  * 확장기능 content_script로는 페이지 내에서 정의한 함수/변수를 사용할 수 없고,
  * jQuery로 정의한 이벤트는 DOM dispatchEvent로 trigger할 수도 없다.
  * 따라서, jQuery에 접근할 수 있는 별도의 스크립트를 만들어 이벤트를 처리하도록 한다.
  */
  const script = document.createElement('script')
  script.src = browser.runtime.getURL('scripts/ui-event-handler.js')
  const appendTarget = (document.head || document.documentElement)
  appendTarget.appendChild(script)

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== node.ELEMENT_NODE) {
          continue
        }
        const dropdownMenus = node.getElementsByClassName('dropdown-menu')
        for (const menu of dropdownMenus) {
          const tweet = menu.closest('.tweet')
          if (!tweet) {
            continue
          }
          const alreadyInserted = tweet.getElementsByClassName('bluemark-menu').length > 0
          if (!alreadyInserted) {
            insertBookmarkMenu(tweet)
          }
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  applyToRendered()
  addBookmarkListMenu()
}

main()
