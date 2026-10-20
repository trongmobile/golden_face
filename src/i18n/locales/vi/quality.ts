import type { quality as en } from '../en/quality'

export const quality: typeof en = {
  checks: {
    resolution: {
      label: 'Độ phân giải ảnh',
      warn: 'Ảnh khá nhỏ (cạnh ngắn chỉ {px} px). Các chi tiết nhỏ có thể không chính xác.',
      pass: 'Ảnh có đủ điểm ảnh để nhận diện điểm mốc.',
    },
    faceSize: {
      label: 'Kích thước khuôn mặt',
      fail: 'Khuôn mặt chỉ rộng khoảng {px} px — quá nhỏ để đo đáng tin cậy. Hãy lại gần hơn hoặc cắt ảnh quanh khuôn mặt.',
      warn: 'Khuôn mặt rộng khoảng {px} px. Khuôn mặt lớn hơn (từ 200 px trở lên) cho số đo ổn định hơn.',
      pass: 'Khuôn mặt rộng khoảng {px} px.',
    },
    frame: {
      label: 'Khuôn mặt nằm trọn trong khung',
      fail: 'Một phần khuôn mặt bị cắt mất ở mép ảnh nên một số điểm mốc sẽ chỉ là phỏng đoán. Hãy chừa khoảng trống quanh đầu.',
      pass: 'Toàn bộ đường viền khuôn mặt nằm trong ảnh.',
    },
    yaw: {
      label: 'Nhìn thẳng vào camera (trái / phải)',
      labelNoPose: 'Nhìn thẳng vào camera',
      pass: 'Đầu quay khoảng {deg}° — gần như nhìn thẳng.',
      turned:
        'Đầu đang quay sang bên khoảng {deg}°. Việc quay đầu làm sai lệch chiều rộng và khiến khuôn mặt trông bất đối xứng. Hãy nhìn thẳng vào ống kính.',
      unknown: 'Không ước tính được tư thế đầu nên không thể loại trừ khả năng đầu bị quay.',
    },
    pitch: {
      label: 'Đầu thẳng (ngẩng / cúi)',
      pass: 'Đầu ngẩng hoặc cúi khoảng {deg}°.',
      tipped:
        'Đầu đang ngẩng hoặc cúi khoảng {deg}°, làm thay đổi tỷ lệ theo chiều dọc. Hãy giữ cằm ngang.',
    },
    roll: {
      label: 'Đầu nghiêng (sang bên)',
      warn: 'Đầu đang nghiêng sang bên khoảng {deg}°. Số đo đã được hiệu chỉnh theo độ nghiêng này, nhưng đầu thẳng sẽ chính xác hơn.',
      pass: 'Độ nghiêng sang bên khoảng {deg}° (được hiệu chỉnh tự động).',
    },
    brightness: {
      label: 'Mức sáng',
      pass: 'Khuôn mặt được phơi sáng đều — không quá tối cũng không quá sáng.',
      dark: 'Khuôn mặt bị tối. Điểm mốc kém chính xác trong ánh sáng yếu; hãy quay mặt về phía cửa sổ hoặc đèn.',
      bright: 'Khuôn mặt bị dư sáng. Ánh sáng chói làm mất đường nét; hãy tránh đèn flash trực tiếp hoặc ngược sáng mạnh.',
    },
    lightingBalance: {
      label: 'Ánh sáng đều',
      warn: 'Một bên khuôn mặt sáng hơn hẳn bên kia. Ánh sáng mạnh từ một bên tạo bóng làm mờ đường viền.',
      pass: 'Hai bên khuôn mặt được chiếu sáng gần như nhau.',
    },
    contrast: {
      label: 'Độ tương phản',
      warn: 'Khuôn mặt trông phẳng hoặc bạc màu, khiến việc xác định đường nét khó hơn.',
      pass: 'Có đủ độ tương phản để nhìn rõ các nét trên khuôn mặt.',
    },
    sharpness: {
      label: 'Độ nét',
      warn: 'Ảnh trông bị mờ hoặc bị làm mịn quá mức. Hãy giữ camera ổn định và lấy nét vào khuôn mặt.',
      pass: 'Khuôn mặt rõ nét.',
    },
    expression: {
      label: 'Biểu cảm tự nhiên',
      warn: 'Biểu cảm trông như: {issues}. Biểu cảm làm miệng, má và hàm thay đổi, nên đặc biệt các tỷ lệ liên quan đến miệng sẽ khác so với khi thư giãn.',
      pass: 'Biểu cảm trông thư giãn.',
    },
  },
  expressionIssues: {
    smiling: 'đang cười',
    mouthOpen: 'miệng mở',
    eyesClosing: 'mắt nhắm',
  },
  panel: {
    capture: 'Chất lượng ảnh chụp',
    reliability: {
      good: {
        label: 'Tốt',
        text: 'Không phát hiện vấn đề nào khi chụp. Những khác biệt còn lại đến từ giới hạn tự nhiên của việc đo trên ảnh 2D.',
      },
      fair: {
        label: 'Trung bình',
        text: 'Một vài điều kiện có thể làm số đo lệch nhẹ. Hãy đọc các ghi chú bên dưới và chụp lại nếu bạn muốn kết quả ổn định hơn.',
      },
      limited: {
        label: 'Hạn chế',
        text: 'Nhiều điều kiện chụp có thể ảnh hưởng đáng kể đến số đo. Hãy xem kết quả chỉ mang tính tham khảo và cân nhắc chụp lại.',
      },
    },
    status: {
      pass: 'Đạt',
      warn: 'Lưu ý',
      fail: 'Có vấn đề',
    },
    footnote:
      'Các kiểm tra này chỉ là phương pháp đơn giản, không phải điểm tin cậy từ mô hình. Tay, tóc, kính hoặc khẩu trang che một phần khuôn mặt không thể được phát hiện đáng tin cậy — mô hình sẽ ước đoán các điểm mốc bị che. Điểm mốc do {name} cung cấp (chế độ {delegate}).',
  },
}
