// Narration and on-screen text of the TikTok tutorial (Vietnamese).
//
// `say` is read aloud by the macOS "Linh" voice and is also shown as the live caption, so keep it
// short and written the way it is spoken (numbers spelled out, no symbols).
// `heading` (optional) swaps the title block at the start of the cue.

export const SITE_LABEL = 'trongmobile.github.io/golden_face'

export const CUES = [
  {
    id: 'hook',
    say: 'Muốn biết khuôn mặt bạn gần tỷ lệ vàng đến đâu? Chỉ cần ba mươi giây, không cần cài ứng dụng.',
    heading: { pill: 'GoldenFace', title: 'Đo <em>tỷ lệ vàng</em> khuôn mặt trong 30 giây', caption: '' },
  },
  {
    id: 'step1',
    say: 'Bước một. Bấm Tải ảnh lên, hoặc chụp ngay bằng camera.',
    heading: { pill: 'Bước 1 / 3', title: 'Chọn một <em>ảnh chính diện</em>', caption: '' },
  },
  {
    id: 'tips',
    say: 'Chọn ảnh nhìn thẳng, đủ sáng, nét mặt thư giãn, và vén tóc khỏi trán.',
  },
  {
    id: 'step2',
    say: 'Bước hai. Ảnh bị nghiêng thì bấm xoay, rồi kéo khung để khuôn mặt chiếm phần lớn bức ảnh.',
    heading: { pill: 'Bước 2 / 3', title: 'Xoay và <em>cắt ảnh</em>', caption: '' },
  },
  {
    id: 'step3',
    say: 'Bước ba. Bấm Phân tích. Mô hình chạy ngay trên máy của bạn, ảnh không hề bị tải lên.',
    heading: { pill: 'Bước 3 / 3', title: 'Bấm <em>Phân tích</em>', caption: '' },
  },
  {
    id: 'result1',
    say: 'Kết quả hiện ra ngay, với các số đo được vẽ trực tiếp lên ảnh.',
    heading: { pill: 'Kết quả', title: 'Số đo vẽ ngay <em>trên ảnh</em>', caption: '' },
  },
  {
    id: 'result2',
    say: 'Bật hoặc tắt từng lớp, như trục đối xứng hay đường viền mặt, để thấy số đo nằm ở đâu.',
  },
  {
    id: 'result3',
    say: 'Cuộn xuống xem từng tỷ lệ và độ gần với tỷ lệ vàng. Mỗi con số đều có công thức giải thích.',
  },
  {
    id: 'note',
    say: 'Nhớ nhé: đây chỉ là một bài toán hình học vui, không phải thước đo nhan sắc.',
    heading: { pill: 'Lưu ý', title: 'Chỉ là <em>hình học</em>, không phải điểm nhan sắc', caption: '' },
  },
  {
    id: 'cta',
    say: 'Link ở bio. Thử ngay, và để lại kết quả của bạn nhé!',
  },
]
