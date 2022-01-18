const fs = require('fs')
const Logger = require('./testrail.logger')

var cacheFileName = 'testrail-cache.txt'
var cacheData = null
var fileExists = () => {
  return fs.existsSync(cacheFileName)
}
var createFile = () => {
  fs.writeFileSync(cacheFileName, '')
}
var persist = () => {
  if (cacheData) {
    fs.writeFileSync(cacheFileName, JSON.stringify(cacheData), {
      flag: 'w',
    })
  }
}
var load = () => {
  if (!fileExists()) {
    Logger.debug('Cache file', cacheFileName, 'does not exist, creating new one...')
    createFile()
  }
  var dataStr = fs.readFileSync(cacheFileName)
  if (dataStr && dataStr != '') {
    try {
      cacheData = JSON.parse(dataStr)
      Logger.debug('Cache file loaded with content', cacheData)
    } catch (e) {
      Logger.warn('Cache file parsing failed', e)
    }
  } else {
    cacheData = {}
  }
}

const loadIfNeeded = () => {
  if (cacheData == null) {
    load()
  }
}

const TestRailCache = {
  store: (key, val) => {
    loadIfNeeded()
    cacheData[key] = val
    persist()
    Logger.debug('Storing cache', key, val)
  },
  retrieve: (key) => {
    loadIfNeeded()
    Logger.debug('Loading from cache', key, cacheData[key])
    return cacheData[key]
  },
  purge: () => {
    if (fileExists()) {
      fs.unlink(cacheFileName, (err) => {
        if (err) throw err
      })
    }
    cacheData = {}
    Logger.debug('Clearing cache...')
  },
}

module.exports = TestRailCache
