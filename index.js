const ffmpeg = require('fluent-ffmpeg'),
      async = require('async'),
      fs = require('fs-extra'),
      path = require('path'),
      util = require('util'),
      helpers = require('./helpers'),
      parser = require('./parser')

const eachOfLimit = util.promisify(async.eachOfLimit),
      tmpPath = path.join(__dirname, 'tmp')

async function run () {
  try {
    await fs.ensureDir(tmpPath)

    const url = process.argv[2]

    console.time('1')

    console.log('Downloading .m3u8\n')
    let iterable = await parser(url, tmpPath)

    console.log('Downloading video...\n')
    await eachOfLimit(iterable, 50, async (item) => {
      if (await helpers.validateFile(item.link, item.path)) return
      await helpers.download(item.link, item.path)
    })

    console.log('Converting video...\n')
    await helpers.concatFiles(Array.from({ length: iterable.counter }, (v, k) => path.join(tmpPath, `${++k}.ts`)), path.join(tmpPath, 'all.ts'))

    await new Promise((resolve, reject) => {
      ffmpeg(path.join(tmpPath, 'all.ts'))
        .audioCodec('copy')
        .videoCodec('copy')
        .on('progress', (progress) => {
          console.log(`Processing video file: ${progress.timemark}`)
        })
        .on('error', reject)
        .on('end', resolve)
        .save(path.join(__dirname, 'result.mp4'))
    })

    console.log('\nDeleting temporary files...\n')
    await fs.remove(tmpPath)

    console.log('Completed')
    console.timeEnd('1')
  }
  catch (err) {
    console.error(err)
  }
}

run()
