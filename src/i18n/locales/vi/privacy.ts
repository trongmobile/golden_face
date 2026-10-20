import type { privacy as en } from '../en/privacy'

export const privacy: typeof en = {
  metaTitle: 'Chính sách quyền riêng tư — GoldenFace',
  metaDescription:
    'GoldenFace xử lý ảnh ngay trên thiết bị của bạn. Hình ảnh và điểm mốc khuôn mặt không bao giờ bị tải lên, lưu trữ hay dùng để huấn luyện.',
  heading: {
    eyebrow: 'Chính sách quyền riêng tư & điều khoản',
    title: 'Ảnh của bạn ở lại trên thiết bị của bạn',
    description:
      'Trang này mô tả những gì GoldenFace thực sự làm với dữ liệu của bạn. Cập nhật lần cuối ngày 20 tháng 10 năm 2026.',
  },
  short: {
    title: 'Tóm tắt',
    items: [
      'Ảnh được phân tích ngay trong trình duyệt của bạn. GoldenFace không có máy chủ nào nhận ảnh, nên không có nơi nào để hình ảnh hay các điểm mốc khuôn mặt của nó được tải lên.',
      'Không có gì được lưu lại: không tài khoản, không cookie, không localStorage hay IndexedDB, không phân tích hành vi và không quảng cáo.',
      'Ảnh của bạn không bao giờ được dùng để huấn luyện mô hình, và GoldenFace không bao giờ xác định bạn là ai.',
    ],
  },
  photo: {
    title: 'Điều gì xảy ra với ảnh của bạn',
    processing:
      '<b>Xử lý.</b> Một mô hình nhận diện điểm mốc khuôn mặt (Google MediaPipe Face Landmarker) chạy trong trình duyệt của bạn bằng WebAssembly và, khi có, cả phần cứng đồ họa. Nó đọc ảnh của bạn từ bộ nhớ, tìm 478 điểm mốc và GoldenFace tính các tỷ lệ ngay trên máy.',
    storage:
      '<b>Lưu trữ.</b> Ảnh và kết quả chỉ tồn tại trong bộ nhớ của thẻ trình duyệt này. Chúng không được ghi vào localStorage, sessionStorage, IndexedDB hay cookie. Chúng biến mất khi bạn nhấn “Xóa ảnh & kết quả”, chọn ảnh khác, rời khỏi trang Phân tích hoặc đóng thẻ.',
    temporaryFiles:
      '<b>Tệp tạm.</b> Các URL tạm của trình duyệt được tạo để giải mã hoặc tải xuống sẽ được giải phóng ngay sau khi dùng xong.',
    reports:
      '<b>Báo cáo.</b> Báo cáo PNG và bản in/PDF được tạo ngay trên thiết bị của bạn và chứa ảnh của bạn. Bất kỳ ai bạn chia sẻ đều có thể xem được, vì vậy hãy chia sẻ cẩn thận.',
  },
  camera: {
    title: 'Camera',
    text: 'Camera chỉ khởi động sau khi bạn chọn “Chụp ảnh” và cho phép truy cập trong trình duyệt. Video chỉ hiển thị trên màn hình của bạn, không được ghi lại hay truyền đi. Camera được tắt ngay khi bạn chụp ảnh, đóng hộp thoại hoặc rời khỏi trang. Trình duyệt yêu cầu kết nối an toàn (HTTPS, hoặc localhost) để truy cập camera.',
  },
  network: {
    title: 'Những gì có kết nối mạng',
    items: [
      'Tải chính trang web (HTML, script, kiểu dáng, phông chữ) từ máy chủ đang phục vụ nó. Phông chữ được tự lưu trữ; không dùng Google Fonts hay dịch vụ phông chữ của bên thứ ba nào.',
      'Tải công cụ phân tích khuôn mặt và mô hình (khoảng 4 MB) vào lần đầu bạn bắt đầu phân tích, để trang chủ luôn nhanh. Chúng được phục vụ từ chính trang này, nghĩa là lần phân tích đầu tiên cần kết nối internet. Nếu bản sao đó không có sẵn, ứng dụng sẽ dùng Google Cloud Storage (mô hình) và jsDelivr (công cụ): các dịch vụ này có thể thấy địa chỉ IP và các tiêu đề yêu cầu thông thường của bạn, nhưng không bao giờ thấy ảnh của bạn.',
      'Như mọi trang web, nhà cung cấp dịch vụ lưu trữ có thể giữ nhật ký máy chủ thông thường (như địa chỉ IP và URL được yêu cầu) theo chính sách riêng của họ. GoldenFace không nhận hay xử lý các nhật ký này.',
    ],
  },
  notDo: {
    title: 'Những gì GoldenFace không làm',
    items: [
      'Không nhận dạng hay xác định danh tính người, không so sánh khuôn mặt và không tìm kiếm kết quả trùng khớp.',
      'Không suy đoán các thuộc tính nhạy cảm như sắc tộc, sức khỏe, tuổi, giới tính hay cảm xúc. Điểm biểu cảm từ mô hình chỉ được dùng ngay trên thiết bị của bạn, để cảnh báo rằng nụ cười hoặc miệng mở có thể ảnh hưởng đến số đo.',
      'Không đánh giá, xếp hạng hay chấm điểm mức độ hấp dẫn.',
    ],
  },
  terms: {
    title: 'Điều khoản sử dụng',
    purpose:
      '<b>Mục đích.</b> GoldenFace là công cụ giải trí khám phá hình học. Nó không phải lời khuyên y tế, thẩm mỹ, tâm lý hay chẩn đoán, và không được dùng kết quả để đánh giá, xếp hạng, tuyển chọn hay phân biệt đối xử với bất kỳ ai.',
    consent:
      '<b>Sự đồng ý.</b> Chỉ phân tích ảnh của chính bạn hoặc của những người đã đồng ý. Không phân tích ảnh của trẻ em khi chưa được cha mẹ hoặc người giám hộ cho phép.',
    accuracy:
      '<b>Độ chính xác.</b> Số đo đến từ một ảnh 2D duy nhất và một mô hình tự động, nên có thể sai. Dịch vụ được cung cấp “nguyên trạng”, không kèm bất kỳ bảo hành nào.',
    responsibility:
      '<b>Trách nhiệm.</b> Bạn chịu trách nhiệm về việc mình làm với các báo cáo đã xuất. Tỷ lệ vàng là một tham chiếu hình học, không phải chuẩn mực của cái đẹp.',
  },
  questions: {
    title: 'Câu hỏi',
    text: 'GoldenFace là mã nguồn mở. Nếu điều gì ở đây không khớp với những gì bạn quan sát được, vui lòng mở một issue trong kho mã của dự án để được chỉnh sửa.',
  },
}
