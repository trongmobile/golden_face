import type { about as en } from '../en/about'

export const about: typeof en = {
  metaTitle: 'Về tỷ lệ vàng — GoldenFace',
  metaDescription:
    'Tỷ lệ vàng (φ ≈ 1.618) là gì, GoldenFace so sánh các số đo khuôn mặt với nó như thế nào, và vì sao nó không phải chuẩn mực của cái đẹp.',
  heading: {
    eyebrow: 'Về tỷ lệ vàng',
    title: 'Một con số nổi tiếng, và cái nhìn trung thực về giới hạn của nó',
    description: 'φ là gì, GoldenFace dùng nó ra sao, và vì sao một khuôn mặt không cần phải khớp với nó.',
  },
  what: {
    title: 'Tỷ lệ vàng là gì?',
    paragraph1:
      'Hai đại lượng a và b (a > b) theo tỷ lệ vàng khi <formula>(a + b) ÷ a = a ÷ b</formula>. Tỷ lệ đó là φ = (1 + √5) ÷ 2 ≈ <value>{phi}</value>.',
    paragraph2:
      'Euclid đã nghiên cứu nó với tên gọi “tỷ lệ cực trị và trung bình”, đến thời Phục Hưng nó được phổ biến qua cuốn <i>De Divina Proportione</i> của Luca Pacioli, và nó liên quan đến dãy Fibonacci — tỷ lệ giữa hai số Fibonacci liền kề tiến dần đến φ. Trong thế kỷ XX, một số nha sĩ, bác sĩ phẫu thuật và nhà thiết kế đã đề xuất các khuôn mặt “lý tưởng” dựa trên φ. Những ý tưởng này khá phổ biến, nhưng bằng chứng cho thấy φ mô tả những khuôn mặt hấp dẫn là rất yếu.',
  },
  compare: {
    title: 'GoldenFace so sánh một tỷ lệ với φ như thế nào',
    step1: '<b>1. Tỷ lệ. </b>r = max(A, B) ÷ min(A, B), nên r không bao giờ nhỏ hơn 1.',
    step2: '<b>2. Độ lệch. </b>độ lệch = |r − φ| ÷ φ.',
    step3: '<b>3. Độ tương đồng. </b>độ tương đồng = 100 × e<sup>−k × độ lệch</sup>, với k = {k}.',
    note: 'k chỉ quyết định phần trăm giảm nhanh đến mức nào: với k = {k}, độ lệch 10 % cho điểm khoảng 74 và độ lệch 23 % cho khoảng 50. Đây chỉ là một thiết lập hiển thị — không phải ngưỡng y khoa hay chuẩn mực của cái đẹp.',
    example:
      '<b>Ví dụ. </b>A = 1.45, B = 1 cho r = {ratio}, độ lệch = {error} %, độ tương đồng = {similarity} %. Phần trăm này được gọi là “độ tương đồng hình học với tỷ lệ vàng tham chiếu” — không bao giờ là điểm số sắc đẹp.',
  },
  measures: {
    title: 'GoldenFace đo những gì',
    intro:
      'Khoảng cách được tính từ các điểm mốc của mô hình trong hệ tọa độ căn theo khuôn mặt, nên độ nghiêng đầu, kích thước và vị trí ảnh không làm chúng thay đổi. Chỉ những tỷ lệ có giả thuyết tỷ lệ vàng được công nhận mới được so sánh với φ — các tỷ lệ còn lại chỉ hiển thị như tỷ lệ thông thường, vì không ai kỳ vọng khuôn mặt bằng 1.618 ở mọi nơi.',
    tableLabel: 'Bảng số đo (cuộn ngang trên màn hình nhỏ)',
    tableCaption: 'Các số đo, công thức và việc mỗi số đo có được so sánh với tỷ lệ vàng hay không',
    columnMeasurement: 'Số đo',
    columnFormula: 'Công thức và điểm mốc',
    columnGolden: 'So sánh với φ?',
    yes: 'Có',
    no: 'Không',
    note: '“Chiều rộng xương gò má ÷ chiều rộng hàm” và “chiều rộng hàm ÷ chiều rộng xương gò má” là hai số nghịch đảo của nhau và mang cùng một thông tin, nên chỉ hiển thị một. Số hiệu điểm mốc tham chiếu đến lưới khuôn mặt 478 điểm của MediaPipe. Độ đối xứng hình học so sánh từng cặp điểm mốc trái/phải với đường giữa khuôn mặt và không bao giờ coi đối xứng hoàn hảo là tốt hơn.',
  },
  limits: {
    title: 'Giới hạn của phương pháp',
    flatPhoto: {
      title: 'Đây chỉ là một ảnh 2D',
      text: 'Một bức ảnh phẳng không thể ghi lại độ sâu. Khoảng cách camera, độ méo ống kính, góc đầu, biểu cảm, ánh sáng và độ phân giải ảnh đều làm thay đổi chiều rộng và chiều cao đo được — chẳng hạn, ảnh selfie chụp gần làm mũi trông to hơn so với tai.',
    },
    estimates: {
      title: 'Điểm mốc chỉ là ước lượng',
      text: 'Mô hình dự đoán vị trí các đặc điểm. Tóc, kính, râu, trang điểm và bóng đổ có thể làm lệch các điểm vài pixel, và những vùng bị che sẽ do mô hình tự đoán.',
    },
    hairline: {
      title: 'Đường chân tóc không được phát hiện',
      text: 'Các mô hình điểm mốc khuôn mặt không xác định được đường chân tóc đáng tin cậy. GoldenFace không bao giờ ước lượng nó: phần ba trên sẽ bị bỏ qua trừ khi bạn tự đánh dấu đường chân tóc.',
    },
    notARule: {
      title: 'φ không phải quy tắc cho khuôn mặt',
      text: 'Các nghiên cứu về nhận thức (ví dụ Pallett, Link & Lee, 2010) cho thấy tỷ lệ khuôn mặt được ưa chuộng nằm gần mức trung bình của quần thể hơn là tại φ. Vẻ đẹp và sự hấp dẫn phụ thuộc vào nhiều thứ hơn hình học rất nhiều.',
    },
    noRanking: {
      title: 'Không xếp hạng, không phán xét',
      text: 'GoldenFace không bao giờ tạo ra “điểm số sắc đẹp”. Phần trăm duy nhất được hiển thị là độ tương đồng hình học của một tỷ lệ với φ, và chỉ hiển thị cho một vài tỷ lệ.',
    },
    closing: 'Tỷ lệ vàng là một cách nhìn vào hình học — không phải cách đo một con người.',
    cta: 'Thử phân tích',
  },
}
