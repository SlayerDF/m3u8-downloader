const ffmpeg = require('fluent-ffmpeg'),
      concat = require('concat-files'),
      rimraf = require('rimraf'),
      async = require('async'),
      path = require('path'),
      util = require('util'),
      fs = require('fs'),
      helpers = require('./helpers'),
      parser = require('./parser')

const mkdir = util.promisify(fs.mkdir),
      eachOfLimit = util.promisify(async.eachOfLimit),
      tmpPath = path.join(__dirname, 'tmp')

async function run () {
  if (!await helpers.exists(tmpPath)) await mkdir(tmpPath)

  const url = process.argv[2]

  console.time('1')

  console.log('Downloading .m3u8\n')
  let iterable = await parser(url, tmpPath)

  console.log('Downloading video...\n')
  await eachOfLimit(iterable, 50, async (item, index) => {
    if (await helpers.exists(item.path)) return
    await helpers.download(item.link, item.path)
  })

  console.log('Converting video...\n')
  await new Promise((resolve, reject) => {
    concat(Array.from({ length: iterable.counter }, (v, k) => path.join(tmpPath, `${++k}.ts`)), path.join(tmpPath, 'all.ts'), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

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
  await new Promise((resolve, reject) => rimraf(path.join(tmpPath, '*'), resolve))
  await new Promise((resolve, reject) => rimraf(tmpPath, resolve))

  console.log('Completed')
  console.timeEnd('1')
}

run()
