/* globals
  MutationObserver,
  addToBookmark,
  removeFromBookmark,
  showMessage,
  showError,
  injectScript,
*/
'use strict'

const bookmarked = new Set()

function makeMenuItem (options) {
  const { action, text, href } = options
  const menuItem = document.createElement('li')
  menuItem.className = `is-selectable`
  menuItem.style.cursor = 'pointer'
  menuItem.addEventListener('mouseenter', event => {
    event.target.classList.add('is-selected')
  })
  menuItem.addEventListener('mouseleave', event => {
    event.target.classList.remove('is-selected')
  })
  const link = document.createElement('a')
  link.setAttribute('data-action', action)
  link.className = action
  link.textContent = text
  if (href) {
    link.href = href
    link.target = '_blank'
  } else {
    link.addEventListener('click', event => {
      event.preventDefault()
    })
  }
  menuItem.appendChild(link)
  return menuItem
}

/*
* 주의: 트위터와 달리 트윗덱에선 .tweet이 *아닌*
* 그 위에 위치한 article.stream-item에 data-tweet-id속성이 들어있다.
* 아래 함수의 tweet은 article.stream-item Element이다.
* 또한, 트위터에서 드롭다운메뉴는 트윗 Element 생성 시점에 만들어지지만,
* 트윗덱에선 3점메뉴를 클릭할 때 마다 생성한다.
*/
function insertBookmarkMenu (tweet) {
  const tweetId = tweet.getAttribute('data-tweet-id') || tweet.getAttribute('data-key')
  const userNickName = tweet.querySelector('b.fullname').textContent
  const addBookmarkMenuItem = makeMenuItem({
    action: 'bluemark-add-bookmark',
    text: 'Add to Bookmark',
    href: null
  })
  const removeBookmarkMenuItem = makeMenuItem({
    action: 'bluemark-remove-bookmark',
    text: 'Remove from Bookmark',
    href: null
  })
  const insertMe = bookmarked.has(tweetId) ? removeBookmarkMenuItem : addBookmarkMenuItem
  insertMe.setAttribute('data-bm-tweet-id', tweetId)
  insertMe.setAttribute('data-bm-user-nickname', userNickName)
  const whoQuote = tweet.querySelector('a[data-action="search-for-quoted"]')
  // DM 등에선 whoQuote가 없다.
  if (whoQuote) {
    whoQuote.parentElement.before(insertMe)
    return
  }
}

function insertBookmarkListMenu (dropdown) {
  const menuItem = makeMenuItem({
    action: 'bluemark-goto-bookmarks',
    text: 'My Bookmarks... [Mobile]',
    href: 'https://mobile.twitter.com/i/bookmarks'
  })
  const insertTarget = dropdown.querySelector('.js-dropdown-content > ul')
  insertTarget.appendChild(menuItem)
}

function handleMenuEvent () {
  document.body.addEventListener('click', event => {
    const { target } = event
    const parent = target.parentElement
    // modal 등
    if (!parent) {
      return
    }
    const tweetId = parent.getAttribute('data-bm-tweet-id')
    const userNickName = parent.getAttribute('data-bm-user-nickname')
    if (target.matches('.bluemark-add-bookmark')) {
      addToBookmark(tweetId).then(result => {
        bookmarked.add(tweetId)
        if (result) {
          showMessage(`Added ${userNickName}'s tweet to Bookmark.`)
        } else {
          showMessage('Already added in Bookmark.')
        }
      }, errorMessage => {
        showError(`Failed to add Bookmark:\n${errorMessage}`)
      })
    } else if (target.matches('.bluemark-remove-bookmark')) {
      removeFromBookmark(tweetId).then(result => {
        bookmarked.delete(tweetId)
        if (result) {
          showMessage(`Removed ${userNickName}'s tweet from Bookmark.`)
        } else {
          showMessage('Already removed from Bookmark.')
        }
      }, errorMessage => {
        showError(`Failed to remove Bookmark:\n${errorMessage}`)
      })
    }
  })
}

function main () {
  injectScript('vendor/moduleraid.js')
  injectScript('scripts/ui-event-handler-td.js')

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== node.ELEMENT_NODE) {
          continue
        }
        if (!node.matches('.js-dropdown')) {
          continue
        }
        const shouldInsertListMenuItem = node.closest('.s-thats-you')
        if (shouldInsertListMenuItem) {
          insertBookmarkListMenu(node)
          continue
        }
        const tweet = node.closest('[data-tweet-id]')
        if (tweet) {
          insertBookmarkMenu(tweet)
          continue
        }
        // 자기 자신의 트윗은 data-tweet-id 속성이 없다.
        const tweet2 = node.closest('[data-key]')
        const key = tweet2.getAttribute('data-key')
        if (/^\d+$/.test(key)) {
          insertBookmarkMenu(tweet2)
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  handleMenuEvent()
}

main()
