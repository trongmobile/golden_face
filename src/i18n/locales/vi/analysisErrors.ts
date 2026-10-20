import type { analysisErrors as en } from '../en/analysisErrors'

export const analysisErrors: typeof en = {
  detail: {
    'no-face': 'Không tìm thấy khuôn mặt nào trong ảnh này.',
    'multiple-faces': 'Tìm thấy {count} khuôn mặt trong ảnh này.',
    'pose-too-large': 'Đầu quay hoặc nghiêng quá nhiều nên không thể đo đáng tin cậy.',
    'face-too-small': 'Khuôn mặt trong ảnh quá nhỏ để đo đáng tin cậy.',
    'face-cut-off': 'Một phần khuôn mặt bị cắt mất ở mép ảnh.',
    'poor-lighting': 'Ánh sáng khiến khuôn mặt quá khó để đo đáng tin cậy.',
    'invalid-landmarks': 'Các điểm mốc phát hiện được không đầy đủ nên không có số đo nào được thực hiện.',
    'model-load-failed': 'Không thể tải mô hình phân tích khuôn mặt. Hãy kiểm tra kết nối và thử lại.',
    'resource-error':
      'Thiết bị này đã hết tài nguyên khi phân tích ảnh. Hãy đóng các thẻ khác hoặc thử một ảnh nhỏ hơn.',
    'detection-failed': 'Bộ nhận diện khuôn mặt gặp lỗi khi đọc ảnh này. Vui lòng thử lại.',
    aborted: 'Phân tích đã bị hủy.',
  },
  model: {
    download: 'Không thể tải mô hình phân tích khuôn mặt. Hãy kiểm tra kết nối internet và thử lại.',
    engineLoad: 'Không thể tải công cụ phân tích khuôn mặt.',
    engineStart: 'Công cụ phân tích khuôn mặt không thể khởi động trên thiết bị này.',
  },
  preparePhoto: 'Không thể chuẩn bị ảnh trên thiết bị này.',
  analyzePhoto: 'Không thể phân tích ảnh. Vui lòng thử lại.',
  panel: {
    noMeasurements: 'Không có số đo nào được thực hiện, nên không có gì để chấm điểm.',
    seeChecks: 'Xem các kiểm tra chất lượng',
    onDevice: 'trên thiết bị',
    tryAgain: 'Thử lại',
    editCrop: 'Chỉnh sửa và cắt ảnh này',
    chooseAnother: 'Chọn ảnh khác',
  },
  copy: {
    'no-face': {
      title: 'Không tìm thấy khuôn mặt',
      advice: [
        'Hãy dùng ảnh chụp thẳng, thấy rõ toàn bộ khuôn mặt.',
        'Bỏ kính râm, khẩu trang và mọi thứ che mắt, mũi hoặc miệng, đồng thời vén tóc ra khỏi mặt.',
        'Đảm bảo khuôn mặt được chiếu sáng — không nằm trong bóng tối hay bị ngược sáng — và không quá nhỏ trong ảnh.',
        'Nếu khuôn mặt nhỏ, hãy dùng Chỉnh sửa & cắt để phóng to vào khuôn mặt.',
      ],
    },
    'multiple-faces': {
      title: 'Tìm thấy nhiều hơn một khuôn mặt',
      advice: [
        'GoldenFace đo từng khuôn mặt một để không bao giờ nhầm lẫn giữa mọi người.',
        'Hãy dùng ảnh chỉ có một người, hoặc cắt sát quanh một khuôn mặt.',
      ],
    },
    'pose-too-large': {
      title: 'Khuôn mặt quay đi quá nhiều',
      advice: [
        'Hãy nhìn thẳng vào camera và giữ cằm ngang.',
        'Đầu quay hoặc nghiêng làm thay đổi chiều rộng và khiến khuôn mặt trông bất đối xứng, nên không có con số nào được hiển thị.',
      ],
    },
    'face-too-small': {
      title: 'Khuôn mặt quá nhỏ',
      advice: [
        'Hãy lại gần hơn, hoặc cắt ảnh quanh khuôn mặt (Chỉnh sửa & cắt).',
        'Nên để khuôn mặt rộng ít nhất khoảng 200 px.',
      ],
    },
    'face-cut-off': {
      title: 'Khuôn mặt bị cắt mất',
      advice: ['Hãy chừa khoảng trống quanh đầu để trán, tai và cằm nằm trong ảnh.'],
    },
    'poor-lighting': {
      title: 'Ánh sáng quá kém',
      advice: ['Hãy quay mặt về phía cửa sổ hoặc đèn để khuôn mặt được chiếu sáng đều, và tránh ngược sáng mạnh hoặc đèn flash chói.'],
    },
    'invalid-landmarks': {
      title: 'Không thể đo khuôn mặt',
      advice: ['Các điểm mốc phát hiện được không đầy đủ. Hãy thử một ảnh rõ hơn, chụp thẳng.'],
    },
    'model-load-failed': {
      title: 'Không thể tải mô hình khuôn mặt',
      advice: [
        'Mô hình (khoảng 4 MB) được tải về lần đầu bạn phân tích ảnh. Hãy kiểm tra kết nối internet và thử lại.',
      ],
    },
    'resource-error': {
      title: 'Thiết bị này đã hết tài nguyên',
      advice: [
        'Hãy đóng các thẻ hoặc ứng dụng khác rồi thử lại.',
        'Ảnh nhỏ hơn dùng ít bộ nhớ hơn — hãy cắt ảnh hoặc chọn bản có độ phân giải thấp hơn.',
      ],
    },
    'detection-failed': {
      title: 'Đã xảy ra lỗi khi đọc ảnh',
      advice: ['Vui lòng thử lại, hoặc chọn một ảnh khác.'],
    },
    aborted: {
      title: 'Đã hủy phân tích',
      advice: [],
    },
  },
}
