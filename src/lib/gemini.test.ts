import { describe, it, expect } from 'vitest'
import { quotaMessage } from './gemini'

/**
 * Google sends both rate limits as HTTP 429. Telling someone to wait a minute
 * for a quota that resets at midnight is worse than saying nothing, so the two
 * are told apart by the body.
 */
describe('quotaMessage', () => {
  const daily = JSON.stringify({
    error: {
      details: [
        {
          violations: [
            {
              quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
              quotaValue: '20',
            },
          ],
        },
      ],
    },
  })

  const perMinute = JSON.stringify({
    error: {
      details: [{ violations: [{ quotaId: 'GenerateRequestsPerMinutePerProject-FreeTier' }] }],
    },
  })

  it('says the daily limit is daily, and does not suggest waiting', () => {
    const m = quotaMessage(daily)
    expect(m).toMatch(/MỖI NGÀY/)
    expect(m).not.toMatch(/Chờ khoảng một phút/)
  })

  it('quotes the real budget so the learner can plan', () => {
    expect(quotaMessage(daily)).toMatch(/20 lượt gọi mỗi ngày/)
    expect(quotaMessage(daily)).toMatch(/5 lượt/)
  })

  it('points at the papers that still work', () => {
    expect(quotaMessage(daily)).toMatch(/đề có sẵn/)
  })

  it('tells the per-minute limit to wait, because waiting works there', () => {
    expect(quotaMessage(perMinute)).toMatch(/mỗi phút/)
    expect(quotaMessage(perMinute)).not.toMatch(/MỖI NGÀY/)
  })

  it('still says something useful when the body is empty', () => {
    expect(quotaMessage('').length).toBeGreaterThan(20)
  })
})
