const fs = require('fs'),
      path = require('path'),
      miss = require('mississippi'),
      byoneline = require('byoneline'),
      axios = require('axios'),
      helpers = require('./helpers')

module.exports = async function (url, directoryPath) {
  let link = url.replace('.m3u8', ''),
      regex = new RegExp(link.split('/').pop().replace('.', '\\.') + '(.+\\.ts)'),
      parsedPath = path.join(directoryPath, 'parsed.m3u8'),
      parts = []

  if (!await helpers.exists(parsedPath)) {
    await new Promise(async (resolve, reject) => {
      miss.pipe(
        byoneline.createStream((await axios({
          method: 'get',
          url: url,
          responseType: 'stream'
        })).data),
        miss.through(
          (chunk, enc, cb) => {
            let match = chunk.toString().match(regex)
            cb(null, match ? match[1] + '\r\n' : '')
          },
          cb => cb(null, '')
        ),
        fs.createWriteStream(parsedPath),
        err => err ? reject(err) : resolve()
      )
    })
  }

  await helpers.readline(parsedPath, line => parts.push(line))

  return {
    counter: 0,
    to: parts.length,

    [Symbol.iterator] () {
      this.counter = 0
      return this
    },

    next () {
      if (this.counter < this.to) {
        return {
          done: false,
          value: {
            path: path.join(directoryPath, `${++this.counter}.ts`),
            link: link + parts[this.counter - 1]
          }
        }
      } else return { done: true }
    }
  }
}
