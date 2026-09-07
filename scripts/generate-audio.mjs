/**
 * Builds the listening audio from src/data/listening.json.
 *
 * Every scripted line is spoken by edge-tts (free, no API key) using a voice
 * chosen per speaker tag, then the lines are stitched together with short
 * pauses so a two-person conversation actually sounds like two people.
 *
 *   node scripts/generate-audio.mjs            build anything missing
 *   node scripts/generate-audio.mjs --force    rebuild everything
 */
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'public', 'audio')
const tmpDir = join(root, '.audio-tmp')

const VOICES = {
  f1: 'en-US-JennyNeural',
  m1: 'en-US-GuyNeural',
  f2: 'en-GB-SoniaNeural',
  m2: 'en-GB-RyanNeural',
}

const GAP_SECONDS = 0.45
const force = process.argv.includes('--force')

/** Flatten the listening paper into one audio job per playable recording. */
function collectListeningJobs(data) {
  const jobs = []
  for (const part of data.parts) {
    if (part.sharedAudio && part.script) {
      jobs.push({ id: part.sharedAudio, lines: part.script })
    }
    for (const item of part.items ?? []) {
      if (item.script) jobs.push({ id: item.id, lines: item.script })
    }
  }
  return jobs
}

/**
 * Speaking model answers, spoken slightly slower than exam pace so they work
 * as pronunciation models. Round 1 is voiced as an examiner/candidate exchange.
 */
function collectSpeakingJobs(data) {
  const jobs = []

  for (const topic of data.round1.topics) {
    for (const q of topic.questions) {
      jobs.push({
        id: `SP_${q.id}`,
        rate: '-8%',
        lines: [
          { voice: 'm2', text: q.q },
          { voice: 'f1', text: q.a },
        ],
      })
    }
  }

  for (const topic of data.round2.topics) {
    for (const sample of topic.samples) {
      jobs.push({
        id: sample.audio,
        rate: '-8%',
        lines: [{ voice: 'f1', text: sample.body }],
      })
    }
  }

  return jobs
}

async function speak(line, file, rate) {
  const voice = VOICES[line.voice] ?? VOICES.f1
  const args = ['--voice', voice, '--text', line.text, '--write-media', file]
  if (rate) args.push(`--rate=${rate}`)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await run('edge-tts', args, { windowsHide: true })
      return
    } catch (err) {
      if (attempt === 3) throw err
      await new Promise((r) => setTimeout(r, 1200 * attempt))
    }
  }
}

async function makeSilence(file) {
  await run('ffmpeg', [
    '-y', '-f', 'lavfi',
    '-i', `anullsrc=r=24000:cl=mono`,
    '-t', String(GAP_SECONDS),
    '-c:a', 'libmp3lame', '-b:a', '48k',
    file,
  ], { windowsHide: true })
}

async function concat(files, target) {
  const listFile = join(tmpDir, 'concat.txt')
  const body = files.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n')
  await writeFile(listFile, body, 'utf8')
  await run('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0',
    '-i', listFile,
    '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '24000', '-ac', '1',
    target,
  ], { windowsHide: true })
}

async function readJson(name) {
  return JSON.parse(await readFile(join(root, 'src', 'data', name), 'utf8'))
}

/**
 * Every listening paper, not just the first: listening.json, listening2.json…
 * Recording ids have to be unique across papers, since they all land in the
 * same public/audio folder.
 */
async function listeningPaperFiles() {
  const names = await readdir(join(root, 'src', 'data'))
  return names.filter((n) => /^listening\d*\.json$/.test(n)).sort()
}

async function main() {
  const files = await listeningPaperFiles()
  const jobs = []

  for (const file of files) {
    jobs.push(...collectListeningJobs(await readJson(file)))
  }
  jobs.push(...collectSpeakingJobs(await readJson('speaking.json')))

  const ids = jobs.map((j) => j.id)
  const clash = ids.find((id, i) => ids.indexOf(id) !== i)
  if (clash) {
    throw new Error(
      `Hai bản ghi cùng id "${clash}" — chúng sẽ ghi đè nhau trong public/audio. ` +
        'Đặt id khác nhau giữa các đề.',
    )
  }

  console.log(`Đề nghe: ${files.join(', ')} — ${jobs.length} bản ghi`)

  await mkdir(outDir, { recursive: true })
  await mkdir(tmpDir, { recursive: true })

  const silence = join(tmpDir, 'silence.mp3')
  await makeSilence(silence)

  let built = 0
  let skipped = 0

  for (const job of jobs) {
    const target = join(outDir, `${job.id}.mp3`)
    if (!force && existsSync(target)) {
      skipped++
      continue
    }

    const pieces = []
    for (const [i, line] of job.lines.entries()) {
      const piece = join(tmpDir, `${job.id}-${i}.mp3`)
      await speak(line, piece, job.rate)
      if (pieces.length) pieces.push(silence)
      pieces.push(piece)
    }

    await concat(pieces, target)
    built++
    console.log(`  built ${job.id}.mp3  (${job.lines.length} line${job.lines.length > 1 ? 's' : ''})`)
  }

  await rm(tmpDir, { recursive: true, force: true })
  console.log(`\nAudio ready: ${built} built, ${skipped} already present, ${jobs.length} total.`)
}

main().catch((err) => {
  console.error('Audio build failed:', err.message)
  process.exit(1)
})
