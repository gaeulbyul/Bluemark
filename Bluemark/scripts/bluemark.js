/* globals
  MutationObserver,
  addToBookmark,
  removeFromBookmark,
  showMessage,
  showError,
  closeDropdownMenu,
  injectScript,
*/
'use strict'

const bookmarked = new Set()

function makeMenuItem (options) {
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
    event.preventDefault()
    closeDropdownMenu()
  })
  menuItem.appendChild(button)
  return menuItem
}

function insertBookmarkMenu (tweet) {
  const tweetId = tweet.getAttribute('data-tweet-id')
  tweet.classList.toggle('bluemark-added', bookmarked.has(tweetId))
  const dropdownMenu = tweet.querySelector('.dropdown-menu')
  const addBookmarkMenuItem = makeMenuItem({
    className: 'bluemark-menu bluemark-add-bookmark',
    text: '트윗을 북마크에 넣기'
  })
  const removeBookmarkMenuItem = makeMenuItem({
    className: 'bluemark-menu bluemark-remove-bookmark',
    text: '트윗을 북마크에서 빼기'
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

function insertBookmarkListMenu () {
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

function handleMenuEvent () {
  document.body.addEventListener('click', event => {
    const { target } = event
    const tweet = target.closest('.tweet')
    if (!tweet) {
      return
    }
    const tweetId = tweet.getAttribute('data-tweet-id')
    const userNickName = tweet.getAttribute('data-name')
    const parent = target.parentElement
    if (parent.matches('.bluemark-add-bookmark')) {
      addToBookmark(tweetId).then(result => {
        tweet.classList.add('bluemark-added')
        bookmarked.add(tweetId)
        if (result) {
          showMessage(`${userNickName}님의 트윗을 북마크에 추가했습니다.`)
        } else {
          showMessage('이미 북마크에 있는 트윗입니다.')
        }
      }, errorMessage => {
        showError(`북마크 추가도중 오류가 발생했습니다:\n${errorMessage}`)
      })
    } else if (parent.matches('.bluemark-remove-bookmark')) {
      removeFromBookmark(tweetId).then(result => {
        tweet.classList.remove('bluemark-added')
        bookmarked.delete(tweetId)
        if (result) {
          showMessage(`${userNickName}님의 트윗을 북마크에서 삭제했습니다.`)
        } else {
          showMessage('이미 삭제된 북마크입니다.')
        }
      }, errorMessage => {
        showError(`북마크 삭제도중 오류가 발생했습니다:\n${errorMessage}`)
      })
    }
  })
}

function main () {
  const loggedOut = document.body.classList.contains('logged-out')
  if (loggedOut) {
    return
  }

  injectScript('scripts/ui-event-handler.js')

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
  handleMenuEvent()
  applyToRendered()
  insertBookmarkListMenu()
}

main()
