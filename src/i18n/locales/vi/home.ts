import type { home as en } from '../en/home'

export const home: typeof en = {
  metaTitle: 'GoldenFace — Phân tích tỷ lệ khuôn mặt',
  metaDescription:
    'Khám phá tỷ lệ khuôn mặt qua toán học của tỷ lệ vàng. Phân tích điểm mốc riêng tư ngay trong trình duyệt — một sự tò mò về hình học, không phải thước đo của cái đẹp.',
  illustration: {
    label:
      'Hình minh họa đường viền khuôn mặt nằm trong hình chữ nhật vàng, cùng đường xoắn ốc vàng và các đường đo',
    eyes: 'mắt',
    nose: 'mũi',
    mouth: 'miệng',
    lengthWidth: 'D : R',
  },
  hero: {
    badge: 'Phân tích tỷ lệ khuôn mặt',
    title: 'Khám phá hình học trên khuôn mặt bạn',
    subtitle: 'Tìm hiểu tỷ lệ khuôn mặt qua toán học của tỷ lệ vàng.',
    upload: 'Tải ảnh lên',
    camera: 'Chụp ảnh',
    privacyNote: 'Ảnh của bạn được phân tích ngay trong trình duyệt và không bao giờ bị tải lên hay lưu trữ.',
  },
  how: {
    eyebrow: 'Cách hoạt động',
    title: 'Từ ảnh đến tỷ lệ chỉ trong ba bước',
    description:
      'Mọi bước đều diễn ra trên thiết bị của bạn, và mỗi con số đều truy ngược được về các điểm mốc đã tạo ra nó.',
  },
  steps: {
    add: {
      title: 'Thêm ảnh',
      text: 'Tải lên một ảnh chân dung nhìn thẳng hoặc chụp bằng camera. Bạn có thể xoay và cắt ảnh trước khi phân tích.',
    },
    detect: {
      title: 'Điểm mốc được phát hiện ngay trên thiết bị',
      text: 'Một mô hình nhận diện điểm mốc chạy ngay trong trình duyệt và xác định 478 điểm trên khuôn mặt. Không có gì được gửi đến máy chủ.',
    },
    explore: {
      title: 'Khám phá hình học',
      text: 'Xem các tỷ lệ, ba phần theo chiều dọc và độ đối xứng trái–phải được vẽ trực tiếp lên ảnh, kèm công thức đằng sau từng con số.',
    },
  },
  phi: {
    eyebrow: 'Tỷ lệ vàng',
    title: 'Một con số đáng biết: <accent>φ ≈ 1.618</accent>',
    paragraph1:
      'Hai đại lượng theo tỷ lệ vàng khi số lớn chia cho số nhỏ bằng tổng của cả hai chia cho số lớn. Tỷ lệ này xuất hiện trong hình học, trong dãy Fibonacci và — theo các cách kể phổ biến — trong nghệ thuật và thiết kế.',
    paragraph2:
      'GoldenFace đo một vài tỷ lệ trên khuôn mặt và cho thấy mỗi tỷ lệ lệch khỏi φ bao nhiêu. Phép so sánh này chỉ là một bài tập hình học — không hơn.',
    link: 'Các con số được tính như thế nào',
  },
  limits: {
    title: 'Công cụ này không thể cho bạn biết điều gì',
    items: [
      'Đây chỉ là một ảnh 2D. Khoảng cách camera, ống kính, góc chụp, ánh sáng và biểu cảm đều làm thay đổi các con số.',
      'Chỉ một vài tỷ lệ có giả thuyết tỷ lệ vàng được công nhận. Các tỷ lệ còn lại chỉ được hiển thị như tỷ lệ thông thường.',
      'Các nghiên cứu về mức độ hấp dẫn cảm nhận được không cho thấy khuôn mặt càng gần φ thì càng được đánh giá là hấp dẫn.',
      'Không thể xác định đường chân tóc một cách đáng tin cậy, nên nó không bao giờ bị đoán — bạn có thể tự đánh dấu.',
    ],
    note: 'Tỷ lệ vàng chỉ là một điểm tham chiếu hình học, không phải chuẩn mực của cái đẹp. Kết quả không bao giờ xếp hạng hay chấm điểm một khuôn mặt.',
  },
  privacy: {
    eyebrow: 'Quyền riêng tư từ thiết kế',
    title: 'Ảnh của bạn vẫn là của bạn.',
    text: 'GoldenFace không có máy chủ nhận ảnh: ảnh của bạn không có nơi nào để được tải lên.',
    cta: 'Đọc chính sách quyền riêng tư',
    onDevice: {
      title: 'Phân tích ngay trên thiết bị',
      text: 'Mô hình và ảnh của bạn gặp nhau ngay trong trình duyệt.',
    },
    nothingStored: {
      title: 'Không lưu trữ gì cả',
      text: 'Không tài khoản, không cookie, không bộ nhớ cục bộ. Chỉ có bộ đếm lượt truy cập ẩn danh.',
    },
    cameraOnRequest: {
      title: 'Camera chỉ khi bạn yêu cầu',
      text: 'Camera chỉ hoạt động trong lúc bạn chụp ảnh.',
    },
    noIdentification: {
      title: 'Không nhận dạng danh tính',
      text: 'Không nhận diện khuôn mặt và không đoán bạn là ai.',
    },
  },
  cta: {
    title: 'Sẵn sàng khám phá?',
    text: 'Hãy dùng ảnh nhìn thẳng, ánh sáng đều và biểu cảm thả lỏng để có số đo ổn định nhất.',
  },
}
