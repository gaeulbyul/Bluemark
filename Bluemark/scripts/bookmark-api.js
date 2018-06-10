/* globals
  Headers,
  URLSearchParams,
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

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
