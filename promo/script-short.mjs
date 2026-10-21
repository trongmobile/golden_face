// Short (~30 s) cut that leads with the privacy angle. Run: npm run promo -- --script promo/script-short.mjs --out promo/out/goldenface-tiktok-short.mp4
export const SITE_LABEL = 'trongmobile.github.io/golden_face'

export const CUES = [
  {
    id: 'hook',
    say: 'Đo tỷ lệ vàng khuôn mặt mà ảnh không hề bị tải lên. Làm thế nào? Xem nè.',
    heading: { pill: 'GoldenFace', title: 'Ảnh <em>không rời khỏi máy</em> bạn', caption: '' },
  },
  {
    id: 'step1',
    say: 'Mở web, bấm Tải ảnh lên.',
    heading: { pill: 'Bước 1', title: 'Chọn <em>một ảnh</em>', caption: '' },
  },
  {
    id: 'tips',
    say: 'Chọn ảnh nhìn thẳng, đủ sáng.',
  },
  {
    id: 'step3',
    say: 'Bấm Phân tích. Mô hình chạy ngay trong trình duyệt, không có máy chủ nào nhận ảnh.',
    heading: { pill: 'Bước 2', title: 'Bấm <em>Phân tích</em>', caption: '' },
  },
  {
    id: 'result1',
    say: 'Vài giây sau, số đo hiện ngay trên ảnh.',
    heading: { pill: 'Kết quả', title: 'Số đo vẽ ngay <em>trên ảnh</em>', caption: '' },
  },
  {
    id: 'note',
    say: 'Nhớ nhé: đây chỉ là hình học vui, không phải thước đo nhan sắc.',
    heading: { pill: 'Lưu ý', title: 'Chỉ là <em>hình học</em>, không phải điểm nhan sắc', caption: '' },
  },
  {
    id: 'cta',
    say: 'Link ở bio. Thử ngay nhé!',
  },
]
