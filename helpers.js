const readline = require('readline'),
      axios = require('axios'),
      fs = require('fs')

module.exports.exists = function (path) {
  return new Promise((resolve, reject) => fs.access(path, fs.constants.F_OK, err => resolve(!err)))
}

module.exports.download = function (url, path) {
  return new Promise((resolve, reject) =>
    axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    }).then(response =>
      response.data.pipe(fs.createWriteStream(path))
        .on('error', reject)
        .on('close', resolve)
    )
  )
}

module.exports.readline = function (path, cb) {
  return new Promise((resolve, reject) => {
    readline.createInterface({ input: fs.createReadStream(path) })
      .on('line', cb)
      .on('close', resolve)
      .on('error', reject)
  })
}
