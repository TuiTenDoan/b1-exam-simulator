import { askGemini, GeminiError } from './gemini'
import {
  balanceAnswerKeys,
  validatePart,
  type GeneratedPart,
  type PartSpec,
} from './aiPaperCheck'
import { reportPart } from './paperQuality'

/**
 * Builds a fresh Reading paper with Gemini, inside the syllabus the revision
 * document sets out.
 *
 * Each part is asked for separately. One request for fifty questions plus four
 * passages runs long, and a single malformed item would cost the whole paper;
 * five smaller requests run at once, fail independently, and can be retried on
 * their own. Nothing reaches the learner until it has been through
 * `validatePart` — see aiPaperCheck.ts for why that matters.
 */

const SYLLABUS = `
PHẠM VI (bắt buộc, lấy từ tài liệu ôn thi B1 - Đại học Nam Cần Thơ, trang 27-30):

NGỮ PHÁP chỉ gồm 4 điểm, không được ra ngoài:
  1. Present simple  2. Present continuous  3. Past simple
  4. So sánh: hơn, nhất, as...as, not as...as, the same...as.
     Bất quy tắc: good-better-best, bad-worse-worst, much-more-most,
     little-less-least, far-farther, old-older/elder.
  CẤM: present perfect, future, passive, conditional, relative clause,
  reported speech, modal perfect.

TỪ VỰNG chỉ lấy trong 6 bộ từ sau (đáp án phần từ vựng BẮT BUỘC nằm trong đây):
  A. lazy, active, kind, popular, funny, polite, friendly, quiet, helpful, creative
  B. map, tourists, guidebook, suitcase, guests, luggage, receptionist, visitors
  C. fridge, washing machine, air conditioning, bookcase, roof, barbecue, stairs,
     drawer, lights, seat, heating, bin
  D. polite, funny, friendly, careless, miserable, confident
  E. have a brilliant time, spend time, a fantastic feeling, enjoy yourself, be glad
  F. make somebody angry, have problems, have an argument, be on your own,
     do something, have fun, do somebody a favour, make friends, be annoyed,
     have a lot in common

Trình độ B1 (CEFR). Người học: sinh viên Việt Nam thi chuẩn đầu ra.
Bối cảnh nên gần gũi Việt Nam (tên người Việt, thành phố Việt Nam).
`

const ANTI_TELL = `
CHỐNG ĐOÁN MẸO:
- Với câu mà phương án là cả một câu (từ 20 ký tự trở lên): phương án dài nhất
  không được dài quá 1,4 lần phương án ngắn nhất. Tự đếm ký tự.
- Đáp án đúng không được là phương án dài nhất ở quá 1/4 số câu.
- Mỗi phương án nhiễu phải là một lỗi THẬT người Việt hay mắc (sai thì, thiếu s
  ngôi ba, dùng more với tính từ ngắn, nhầm từ gần nghĩa, dịch word-by-word).
  Không được bịa chữ không tồn tại như "gooder", "badder".
- CHỈ MỘT đáp án đúng. Nếu hai phương án đều chấp nhận được thì câu hỏi hỏng.
- Trường "explain" viết bằng TIẾNG VIỆT, ít nhất 25 ký tự, nói rõ vì sao đáp án
  đúng và vì sao nhiễu chính sai. TUYỆT ĐỐI KHÔNG gọi tên phương án bằng chữ cái
  (không viết "B sai vì..."), vì app sẽ đảo thứ tự phương án; hãy trích nội dung
  phương án trong dấu ngoặc kép.
`

interface PartPlan extends PartSpec {
  title: string
  vi: string
  instructions: string
  lockOrder?: boolean
  brief: string
}

const PLANS: PartPlan[] = [
  {
    id: 'R1',
    items: 10,
    optionKeys: ['A', 'B', 'C', 'D'],
    title: 'Part 1 — Grammar',
    vi: 'Ngữ pháp: thì hiện tại, quá khứ đơn, so sánh',
    instructions: 'Choose the correct answer, A, B, C or D.',
    brief:
      '10 câu ngữ pháp, mỗi câu một chỗ trống ________. Phân bổ: 3 câu present simple vs ' +
      'present continuous, 3 câu past simple, 4 câu so sánh. Phương án là các dạng chia ' +
      'động từ hoặc dạng so sánh. Mỗi câu PHẢI chứa một dấu hiệu thời gian rõ ràng ' +
      '(every day, at the moment, yesterday, than, the most, as...as) để người học nhận ra thì.',
  },
  {
    id: 'R2',
    items: 10,
    optionKeys: ['A', 'B', 'C', 'D'],
    title: 'Part 2 — Vocabulary',
    vi: 'Từ vựng B1',
    instructions: 'Choose the word or phrase that best completes each sentence.',
    brief:
      '10 câu từ vựng. Đáp án đúng BẮT BUỘC là một từ trong 6 bộ từ A-F. Phân bổ: 2 câu bộ A, ' +
      '2 câu bộ B, 2 câu bộ C, 1 câu bộ D, 1 câu bộ E, 2 câu bộ F. Ngữ cảnh phải đủ rõ để ' +
      'chỉ một từ đúng.',
  },
  {
    id: 'R3',
    items: 10,
    optionKeys: ['A', 'B', 'C', 'D'],
    passages: 2,
    rightWrong: 5,
    title: 'Part 3 — Reading comprehension',
    vi: 'Đọc hiểu: Đúng/Sai và chọn đáp án đúng nhất',
    instructions: 'Read the two texts and answer the questions.',
    brief:
      'Hai đoạn văn TỰ VIẾT MỚI, mỗi đoạn 180-220 từ, id "P1" và "P2".\n' +
      '- 5 câu đầu thuộc đoạn P1, type "rightwrong", KHÔNG có options, correct là "A" (RIGHT) ' +
      'hoặc "B" (WRONG). Phải có cả câu đúng lẫn câu sai.\n' +
      '- 5 câu sau thuộc đoạn P2, có options A/B/C/D.\n' +
      'Mỗi câu phải có trường "passage" là "P1" hoặc "P2". Mọi câu hỏi phải trả lời được ' +
      'bằng bằng chứng trong bài, không suy đoán ngoài bài.',
  },
  {
    id: 'R4',
    items: 10,
    optionKeys: ['A', 'B', 'C', 'D'],
    passages: 2,
    lockOrder: true,
    title: 'Part 4 — Gap fill',
    vi: 'Điền từ vào đoạn văn',
    instructions: 'Read the texts and choose the best word for each gap.',
    brief:
      'Hai đoạn văn ngắn TỰ VIẾT, id "P3" và "P4", mỗi đoạn 120-150 từ.\n' +
      'P3 chứa 5 chỗ trống viết đúng dạng (1)________ đến (5)________ ; ' +
      'P4 chứa 5 chỗ trống (6)________ đến (10)________ .\n' +
      'Mỗi câu có "passage" ("P3"/"P4") và "gapNumber" (1..10) khớp với số in trong đoạn. ' +
      'Chỗ trống kiểm tra collocation, giới từ, từ nối và từ vựng trong 6 bộ từ.',
  },
  {
    id: 'R5',
    items: 10,
    optionKeys: ['A', 'B', 'C'],
    title: 'Part 5 — Short texts',
    vi: 'Đọc thông báo, tin nhắn và chọn nghĩa đúng',
    instructions: 'Read each short text and choose the answer that says the same thing.',
    brief:
      '10 câu, mỗi câu CHỈ 3 phương án A/B/C. Mỗi câu có trường "notice" là một thông báo, ' +
      'biển báo hoặc tin nhắn ngắn 2-4 dòng (dùng \\n xuống dòng), và "prompt" là câu hỏi ' +
      'kiểu "What does this notice tell you?". Ba phương án là ba câu diễn giải, ' +
      'độ dài xấp xỉ nhau.',
  },
]

function buildPrompt(plan: PartPlan, tag: string): string {
  return [
    'Bạn đang soạn một phần của đề thi thử tiếng Anh chuẩn đầu ra B1.',
    'Trả lời BẰNG JSON THUẦN, không kèm lời dẫn, không kèm markdown.',
    SYLLABUS,
    ANTI_TELL,
    '',
    `PHẦN CẦN SOẠN: ${plan.id} — ${plan.title}`,
    plan.brief,
    '',
    'ĐỊNH DẠNG JSON BẮT BUỘC:',
    JSON.stringify({
      id: plan.id,
      passages: plan.passages
        ? [{ id: 'P1', title: 'string', body: 'string' }]
        : undefined,
      items: [
        {
          id: `${tag}${plan.id}Q1`,
          prompt: 'string',
          notice: 'chỉ phần R5',
          passage: 'chỉ phần R3 và R4',
          gapNumber: 1,
          type: 'chỉ đặt "rightwrong" cho câu Đúng/Sai',
          options: plan.optionKeys.map((k) => ({ key: k, text: 'string' })),
          correct: plan.optionKeys[0],
          explain: 'tiếng Việt',
        },
      ],
    }),
    '',
    `Id câu hỏi phải theo đúng mẫu ${tag}${plan.id}Q1 … ${tag}${plan.id}Q${plan.items}.`,
    'Bỏ hẳn những trường không dùng thay vì để rỗng.',
  ].join('\n')
}

export interface AiPaperProgress {
  done: number
  total: number
}

/** A part that came back broken twice is dropped rather than shown. */
async function generateOnePart(
  plan: PartPlan,
  key: string,
  tag: string,
  signal?: AbortSignal,
): Promise<GeneratedPart & { title: string; vi: string; instructions: string; lockOrder?: boolean }> {
  let lastProblems: string[] = []

  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = (await askGemini({
      key,
      prompt:
        attempt === 0
          ? buildPrompt(plan, tag)
          : `${buildPrompt(plan, tag)}\n\nLẦN TRƯỚC BẠN SAI:\n- ${lastProblems.join('\n- ')}\nSửa hết rồi trả lại.`,
      // Some spread keeps successive papers from converging on the same
      // sentences; too much and the model drifts out of the syllabus.
      temperature: 0.9,
      signal,
    })) as GeneratedPart

    const problems = validatePart(reply, plan)
    if (problems.length === 0) {
      const balanced = balanceAnswerKeys(reply)
      return {
        ...balanced,
        title: plan.title,
        vi: plan.vi,
        instructions: plan.instructions,
        lockOrder: plan.lockOrder,
      }
    }
    lastProblems = problems
  }

  throw new GeminiError(
    `Phần ${plan.id} sinh ra không đạt: ${lastProblems.slice(0, 3).join('; ')}`,
    'reply',
  )
}

export interface GeneratedPaper {
  sectionId: string
  title: string
  label: string
  totalQuestions: number
  durationSeconds: number
  parts: unknown[]
}

/**
 * A whole Reading paper. `tag` keeps question ids unique between sittings, so
 * two generated papers never collide in saved answers.
 */
export async function generateReadingPaper(opts: {
  key: string
  tag: string
  signal?: AbortSignal
  onProgress?: (p: AiPaperProgress) => void
}): Promise<GeneratedPaper> {
  let done = 0
  const total = PLANS.length
  opts.onProgress?.({ done, total })

  const parts = await Promise.all(
    PLANS.map((plan) =>
      generateOnePart(plan, opts.key, opts.tag, opts.signal).then((p) => {
        done += 1
        opts.onProgress?.({ done, total })
        return p
      }),
    ),
  )

  // Last line of defence: the same length check the built-in papers must pass.
  const leaky = parts
    .map((p) => reportPart({ id: p.id, items: p.items }))
    .filter((r) => r && r.longestWins > r.allowedLongestWins)
    .map((r) => r!.partId)

  return {
    sectionId: 'reading',
    title: 'Reading, Grammar & Vocabulary',
    label: leaky.length ? 'Đề AI (có phần hơi lộ)' : 'Đề AI',
    totalQuestions: parts.reduce((n, p) => n + p.items.length, 0),
    durationSeconds: 3600,
    parts,
  }
}
