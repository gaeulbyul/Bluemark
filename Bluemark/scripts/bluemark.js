/* globals browser, CustomEvent, MutationObserver, fetch, Headers, URLSearchParams, location */
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

function showMessage (message) {
  document.dispatchEvent(new CustomEvent('$$uiShowMessage', {
    detail: { message }
  }))
}

function showError (message) {
  document.dispatchEvent(new CustomEvent('$$uiShowError', {
    detail: { message }
  }))
}

function closeDropdownMenu () {
  document.dispatchEvent(new CustomEvent('$$uiCloseDropdowns'))
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
    closeDropdownMenu()
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
    closeDropdownMenu()
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
  dropdownMenu.insertBefore(addBookmarkMenuItem, dropdownMenu.firstChild)
  dropdownMenu.insertBefore(removeBookmarkMenuItem, dropdownMenu.firstChild)
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
  const listmenu = document.querySelector('#user-dropdown li[data-name=lists]')
  listmenu.after(menuItem)
}

function main () {
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
