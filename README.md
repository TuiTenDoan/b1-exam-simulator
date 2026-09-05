# Luyện thi B1 — Anh văn chuẩn đầu ra

Web thi thử đủ bốn kỹ năng cho kỳ thi Anh văn chuẩn đầu ra trình độ B1, dựng theo đúng
cấu trúc trong tài liệu ôn thi (`TÀI LIỆU ÔN THI B1 - CÓ ĐÁP ÁN.pdf`).

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5180

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy server phát triển |
| `npm run build` | Build ra thư mục `dist/` để deploy |
| `npm run preview` | Xem thử bản build |
| `npm test` | Chạy test cho phần logic chấm điểm |
| `npm run audio` | Tạo lại toàn bộ file nghe (thêm `-- --force` để ghi đè) |

## Bốn phần thi

| Phần | Nội dung | Điểm |
|---|---|---|
| Speaking | Bốc thăm 2 vòng: 4 chủ đề giao tiếp + 4 chủ đề thuyết trình, có bài mẫu đọc chậm và ghi âm lại giọng mình | 10đ |
| Listening | 25 câu: 10 nghe hình, 5 Đúng/Sai, 5 chọn đáp án đúng nhất, 5 điền từ | 10đ |
| Reading | 50 câu: 10 ngữ pháp, 10 từ vựng, 10 đọc hiểu, 10 điền từ, 10 đọc thông báo | 10đ |
| Writing | 8 câu hoàn thành (rút từ ngân hàng 20 câu) + 1 bài luận 120–180 từ | 10đ |

Mức đạt: **5.0/10** mỗi phần. Phần Nghe và Đọc chấm tự động ngay khi nộp, kèm giải thích
tiếng Việt cho từng câu.

## Đảo đề

Bật/tắt ở trang chủ (mặc định **bật**, nhớ trong `localStorage`). Khi bật, mỗi lần vào thi
là một đề khác: thứ tự câu đổi và các phương án A/B/C/D đổi chỗ, nên bạn không thể học thuộc
"câu 7 chọn C". Nút **Làm lại — đảo đề mới** ở màn hình kết quả sinh một đề mới ngay.

Bốn quy tắc được giữ nguyên khi đảo, có test bảo vệ:

1. Đáp án đúng luôn đi theo **nội dung** của nó, chỉ đổi vị trí chữ cái.
2. Câu Đúng/Sai không bị đảo — A luôn là RIGHT, B luôn là WRONG.
3. Câu điền từ vào đoạn văn (có đánh số `(1)…(10)`) giữ nguyên thứ tự in trong bài.
4. Câu đọc hiểu không bao giờ rời khỏi bài đọc của nó; các câu cùng một bài luôn đi liền nhau.

Phần Viết cũng tự rút 8 câu khác nhau từ ngân hàng 20 câu, và phần Nói bốc thăm ngẫu nhiên.

## Âm thanh

41 file mp3 trong `public/audio/`, sinh bằng [edge-tts](https://github.com/rany2/edge-tts)
(miễn phí, không cần API key) rồi ghép bằng ffmpeg. Mỗi người nói trong hội thoại dùng một
giọng riêng:

| Tag | Giọng |
|---|---|
| `f1` | en-US-JennyNeural |
| `m1` | en-US-GuyNeural |
| `f2` | en-GB-SoniaNeural |
| `m2` | en-GB-RyanNeural |

Kịch bản nằm ngay trong `src/data/listening.json` và `src/data/speaking.json`. Sửa lời thoại
rồi chạy `npm run audio` là có file mới — không cần đụng vào code.

Trong phần Nghe, mỗi bản ghi chỉ phát được **2 lượt**, giống quy định phòng thi.

## Thêm hoặc sửa câu hỏi

Toàn bộ nội dung nằm trong 4 file JSON, không nhúng trong code:

```
src/data/listening.json   25 câu nghe + kịch bản audio
src/data/reading.json     50 câu đọc + bài đọc
src/data/speaking.json    chủ đề nói + câu trả lời mẫu
src/data/writing.json     20 câu hoàn thành + 4 đề luận
```

Thêm một câu trắc nghiệm mới chỉ cần thêm một object vào mảng `items`:

```json
{
  "id": "R1Q11",
  "prompt": "She ________ to school by bus every day.",
  "options": [
    { "key": "A", "text": "go" },
    { "key": "B", "text": "goes" },
    { "key": "C", "text": "going" },
    { "key": "D", "text": "went" }
  ],
  "correct": "B",
  "explain": "Chủ ngữ số ít ở hiện tại đơn thì động từ thêm -es."
}
```

Số câu và số thứ tự tự cập nhật, không cần sửa gì thêm.

## Cấu trúc

```
src/
  domain/      logic thuần, có test: chấm điểm, phiên thi, đồng hồ
  lib/         gộp JSON thành một đề phẳng
  components/  máy chạy đề, phiếu trả lời, trình phát, bảng kết quả
  screens/     trang chủ, thi nói, thi viết
  art/         hình vẽ SVG cho câu nghe hình
  data/        toàn bộ nội dung đề
scripts/
  generate-audio.mjs
```

Phần logic ảnh hưởng tới điểm số được viết theo TDD (33 test):

- `scoring.ts` — chấm bài, khớp đáp án điền từ không phân biệt hoa thường, làm tròn 2 chữ số
- `examSession.ts` — ghi đáp án, chuyển câu, chặn tràn đầu/cuối đề
- `timer.ts` — đếm ngược theo mốc thời gian thật (đổi tab không được cộng thêm giờ)
- `shuffle.ts` — đảo câu và đáp án, giữ nguyên nhóm bài đọc và câu Đúng/Sai
- `paper.test.ts` — chạy 25 bộ số ngẫu nhiên trên đề thật để chắc chắn việc đảo không làm
  lệch đáp án, mất câu, hay tách câu khỏi bài đọc

## Ghi chú về nguồn nội dung

- Phần **Speaking** và **Writing** lấy trực tiếp từ tài liệu ôn thi của trường: bộ câu hỏi
  giao tiếp, bài nói mẫu, 20 câu hoàn thành và 4 đề luận kèm dàn ý.
- Phần **Listening** và **Reading** trong tài liệu gốc chỉ ghi vị trí bài tập trong giáo trình
  Cambridge *Prepare* (ảnh chụp trang sách, không có file nghe). Vì vậy đề nghe và đề đọc ở
  đây là **nội dung tự soạn mới**, bám đúng định dạng và số câu mà đề cương quy định, và
  bám đúng các điểm ngữ pháp được liệt kê: thì hiện tại đơn/tiếp diễn, quá khứ đơn,
  so sánh hơn/nhất và `not as ... as`.

Điểm cao nhất mỗi phần lưu trong `localStorage` của trình duyệt, chỉ nằm trên máy bạn.
