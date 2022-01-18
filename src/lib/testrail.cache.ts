const fs = require('fs')
const Logger = require('./testrail.logger')

var cacheFileName = 'testrail-cache.txt'
var cacheData = {}
var fileExists = () => {
  return fs.existsSync(cacheFileName)
}
var createFile = () => {
  fs.writeFileSync(cacheFileName, '')
}
var persist = () => {
  fs.writeFileSync(cacheFileName, JSON.stringify(cacheData), {
    flag: 'w',
  })
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

const TestRailCache = {
  store: (key, val) => {
    cacheData[key] = val
    persist()
    Logger.debug('Storing cache', key, val)
  },
  retrieve: (key) => {
    load()
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
