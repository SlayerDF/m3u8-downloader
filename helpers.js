const Promise = require('bluebird'),
      readline = require('readline'),
      axios = require('axios'),
      fs = require('fs-extra')

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

module.exports.validateFile = async function (url, path) {
  if (!await fs.pathExists(path)) return false
  return (await axios.head(url)).headers['content-length'] === (await fs.stat(path)).size.toString()
}

module.exports.readline = function (path, cb) {
  return new Promise((resolve, reject) => {
    readline.createInterface({ input: fs.createReadStream(path) })
      .on('line', cb)
      .on('close', resolve)
      .on('error', reject)
  })
}

module.exports.concatFiles = async function (fileInputs, fileOutput) {
  await fs.remove(fileOutput)

  return Promise.each(fileInputs, input => new Promise((resolve, reject) => {
    let writeStream = fs.createWriteStream(fileOutput, { flags: 'a' })
      .on('close', resolve)
      .on('error', reject)

    fs.createReadStream(input).pipe(writeStream)
  }))
}
