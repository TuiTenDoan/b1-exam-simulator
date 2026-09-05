# Thư mục tài liệu riêng của bạn

Phần **"Đề nghe Cambridge Prepare"** trong app đọc file từ đây. Hai thư mục này
**cố tình không được commit** (xem `.gitignore` ở gốc dự án) vì đó là giáo trình
có bản quyền của Cambridge University Press — để trên máy bạn tự ôn thì không sao,
nhưng đẩy lên GitHub công khai là phát tán lại tài liệu của họ.

Nếu bạn clone dự án này về máy khác, phần đó sẽ trống cho tới khi bạn tự thả file vào:

```
public/prepare/audio/<tên>.mp3     ← file nghe
public/prepare/q/<tên>.png         ← ảnh chụp trang đề
```

Tên file phải khớp với `audio` và `image` khai báo trong `src/data/prepare.json`.
Ví dụ bài đầu tiên cần:

```
public/prepare/audio/track31.mp3
public/prepare/q/track31.png
```

Ba phần còn lại của app (Nghe / Đọc / Viết / Nói mô phỏng) không cần gì ở đây —
audio của chúng nằm trong `public/audio/` và được sinh bằng `npm run audio`.
