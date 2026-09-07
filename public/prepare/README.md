# Thư mục tài liệu riêng của bạn

Hai phần **"Đề nghe Cambridge Prepare"** và **"Đề đọc Cambridge Prepare"** trong
app đọc file từ đây. Ba thư mục này
**cố tình không được commit** (xem `.gitignore` ở gốc dự án) vì đó là giáo trình
có bản quyền của Cambridge University Press — để trên máy bạn tự ôn thì không sao,
nhưng đẩy lên GitHub công khai là phát tán lại tài liệu của họ.

Nếu bạn clone dự án này về máy khác, phần đó sẽ trống cho tới khi bạn tự thả file vào:

```
public/prepare/audio/<tên>.mp3     ← file nghe
public/prepare/q/<tên>.png         ← ảnh chụp trang đề phần nghe
public/prepare/rq/<tên>.png        ← ảnh chụp trang đề phần đọc
```

Tên file phải khớp với `audio` và `images` khai báo trong `src/data/prepare.json`
(phần nghe) và `src/data/prepareReading.json` (phần đọc). Ví dụ:

```
public/prepare/audio/track31.mp3
public/prepare/q/track31.png
public/prepare/rq/p31_0.png
```

Ảnh phần đọc được cắt ra từ chính file PDF ôn thi của bạn, mỗi bài một hoặc hai
ảnh (bài đọc dài thì một ảnh bài đọc, một ảnh câu hỏi).

Bốn phần thi chính của app (Nghe / Đọc / Viết / Nói mô phỏng) không cần gì ở đây —
audio của chúng nằm trong `public/audio/` và được sinh bằng `npm run audio`.
