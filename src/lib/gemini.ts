import { parseAiMark, type AiMark } from '../domain/aiMark'

const MODEL = 'gemini-3.6-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const KEY_STORE = 'b1-exam:gemini-key'

/** The key lives only in this browser. It is never sent anywhere but Google. */
export function loadKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) ?? ''
  } catch {
    return ''
  }
}

export function saveKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORE, key.trim())
    else localStorage.removeItem(KEY_STORE)
  } catch {
    /* private mode — the key just won't persist between visits */
  }
}

function buildPrompt(topic: string, essay: string): string {
  return [
    'You are marking a Vietnamese university exit-exam essay at CEFR B1.',
    'Marks: ideas (task response, organisation) out of 3; language (grammar, vocabulary range) out of 3.',
    'Reply with JSON only, no prose around it, in this exact shape:',
    '{"ideas":<0-3>,"language":<0-3>,"comment_vi":"<2-3 sentences>","errors":[{"wrong":"<quote from the essay>","fix":"<corrected form>","why_vi":"<short reason>"}]}',
    'Give at most 5 errors, the most important ones. Quote "wrong" exactly as written in the essay.',
    'Write comment_vi and why_vi in Vietnamese. Be specific and kind; this is a student practising.',
    '',
    `TOPIC: ${topic}`,
    '',
    'ESSAY:',
    essay,
  ].join('\n')
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly kind: 'key' | 'busy' | 'quota' | 'network' | 'reply',
  ) {
    super(message)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Ask Gemini to mark one essay. The free tier returns 503 under load often
 * enough that a single attempt is not worth showing the user, so transient
 * failures are retried before surfacing.
 */
export async function gradeEssay(opts: {
  key: string
  topic: string
  essay: string
  signal?: AbortSignal
}): Promise<AiMark> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(opts.topic, opts.essay) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  })

  let lastBusy = ''

  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'x-goog-api-key': opts.key, 'Content-Type': 'application/json' },
        body,
        signal: opts.signal,
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new GeminiError('Không kết nối được tới Google. Kiểm tra mạng rồi thử lại.', 'network')
    }

    if (res.ok) {
      const data = await res.json()
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new GeminiError('Model trả về rỗng. Thử lại lần nữa.', 'reply')
      try {
        return parseAiMark(JSON.parse(text))
      } catch {
        throw new GeminiError('Model trả về nội dung không đọc được. Thử lại lần nữa.', 'reply')
      }
    }

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new GeminiError('Key không hợp lệ hoặc không có quyền dùng model này.', 'key')
    }
    if (res.status === 429) {
      throw new GeminiError('Đã chạm giới hạn của gói miễn phí. Chờ một lát rồi thử lại.', 'quota')
    }
    if (res.status === 503 || res.status >= 500) {
      lastBusy = `Google đang quá tải (HTTP ${res.status}).`
      await sleep(1500 * (attempt + 1))
      continue
    }

    throw new GeminiError(`Lỗi không mong đợi (HTTP ${res.status}).`, 'network')
  }

  throw new GeminiError(`${lastBusy} Đã thử 4 lượt. Chờ một phút rồi bấm lại.`, 'busy')
}
