import type { analysisPage as en } from '../en/analysisPage'

export const analysisPage: typeof en = {
  meta: {
    title: 'Phân tích ảnh — GoldenFace',
    description:
      'Tải lên hoặc chụp một ảnh chính diện và so sánh tỷ lệ khuôn mặt với tỷ lệ vàng, hoàn toàn trên thiết bị của bạn. Không có gì được tải lên.',
  },
  select: {
    eyebrow: 'Phân tích',
    title: 'Phân tích ảnh',
    intro: 'Chọn một ảnh chân dung chính diện. Ảnh được phân tích ngay trong trình duyệt của bạn và không lưu trữ.',
    noticeTitle: 'Xong',
    cameraTitle: 'Chụp ảnh',
    cameraText: 'Dùng camera trước hoặc sau. Camera chỉ chạy khi hộp thoại đang mở.',
    openCamera: 'Mở camera',
    tipsTitle: 'Để có kết quả đo ổn định nhất',
  },
  edit: {
    step: 'Bước 2 / 3',
    title: 'Kiểm tra ảnh của bạn',
    intro: 'Xoay hoặc cắt để một khuôn mặt chiếm phần lớn bức ảnh. Không có gì rời khỏi thiết bị của bạn.',
    cameraPhoto: 'Ảnh từ camera',
    yourPhoto: 'Ảnh của bạn',
    analyze: 'Phân tích ảnh này',
    chooseDifferent: 'Chọn ảnh khác',
    takeNew: 'Chụp ảnh mới',
    quickCheck: 'Kiểm tra nhanh',
  },
  tips: {
    face: 'Nhìn thẳng vào camera, cằm ngang, thấy rõ toàn bộ khuôn mặt.',
    light: 'Dùng ánh sáng dịu, đều — cửa sổ là lựa chọn tốt. Tránh bóng đổ gắt, đèn flash và ngược sáng.',
    expression: 'Giữ vẻ mặt thư giãn, trung tính và ngậm miệng.',
    hair: 'Vén tóc khỏi trán và mặt, và bỏ kính, khẩu trang, mũ nếu có thể.',
  },
  live: {
    analyzing: 'Đang phân tích ảnh của bạn trên thiết bị này.',
    complete: 'Phân tích hoàn tất. Kết quả của bạn đã sẵn sàng.',
    errorFallback: 'Không thể hoàn tất phân tích.',
    edit: 'Đã tải ảnh. Hãy kiểm tra, rồi chọn Phân tích ảnh này.',
  },
  loadingResults: 'Đang chuẩn bị kết quả của bạn',
  decodeFailed: 'Không thể mở ảnh này. Vui lòng thử ảnh khác.',
  cleared: 'Ảnh và kết quả phân tích của bạn đã được xóa khỏi trang này.',
}
