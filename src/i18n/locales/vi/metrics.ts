import type { metrics as en } from '../en/metrics'

export const metrics: typeof en = {
  segments: {
    'face-length': 'Chiều dài khuôn mặt',
    'face-width': 'Chiều rộng khuôn mặt (xương gò má)',
    'forehead-width': 'Chiều rộng trán',
    'jaw-width': 'Chiều rộng hàm',
    interpupillary: 'Khoảng cách giữa hai đồng tử',
    intercanthal: 'Khoảng cách giữa hai khóe mắt trong',
    'nose-width': 'Chiều rộng mũi',
    'mouth-width': 'Chiều rộng miệng',
    'upper-lip': 'Chiều cao môi trên',
    'lower-lip': 'Chiều cao môi dưới',
    'upper-third': 'Phần trên (chân tóc → lông mày)',
    'middle-third': 'Phần giữa (lông mày → chân mũi)',
    'lower-third': 'Phần dưới (chân mũi → cằm)',
  },
  items: {
    'face-length-width': {
      label: 'Chiều dài ÷ chiều rộng khuôn mặt',
      meaning:
        'Khuôn mặt cao hơn bao nhiêu so với độ rộng. Giá trị khoảng 1.0 là khuôn mặt gần tròn; giá trị càng lớn thì khuôn mặt càng dài.',
      formula: 'Chiều dài khuôn mặt ÷ chiều rộng khuôn mặt (điểm mốc 10 → 152, chia cho điểm mốc 234 ↔ 454)',
      goldenNote:
        'Một quan niệm thường được nhắc tới về "khuôn mặt vàng" cho rằng khuôn mặt dài gấp khoảng φ lần chiều rộng, nên cặp số đo này được so sánh với φ.',
      caveat:
        'Điểm mốc 10 nằm trên trán, thấp hơn đường chân tóc thật, nên chiều dài đo được ngắn hơn khoảng cách từ chân tóc đến cằm. Hãy đánh dấu đường chân tóc để đo từ chân tóc.',
    },
    'forehead-cheekbone': {
      label: 'Chiều rộng trán ÷ chiều rộng gò má',
      meaning: 'Phần trán trên rộng bao nhiêu so với phần rộng nhất của khuôn mặt.',
      formula: 'Chiều rộng trán (điểm mốc 54 ↔ 284) ÷ chiều rộng khuôn mặt (234 ↔ 454)',
      goldenNote:
        'Không có quan niệm tỷ lệ vàng nào được công nhận cho cặp này, nên nó chỉ được hiển thị như một tỷ lệ thông thường.',
      caveat: 'Tóc, mũ và hình dạng đường chân tóc ảnh hưởng đến vị trí phát hiện đường viền trán.',
    },
    'cheekbone-jaw': {
      label: 'Chiều rộng gò má ÷ chiều rộng hàm',
      meaning:
        'Khuôn mặt ở gò má rộng hơn ở góc hàm bao nhiêu. Nghịch đảo của nó (hàm ÷ gò má) mang đúng cùng một thông tin.',
      formula: 'Chiều rộng khuôn mặt (điểm mốc 234 ↔ 454) ÷ chiều rộng hàm (172 ↔ 397)',
      goldenNote:
        'Không có quan niệm tỷ lệ vàng nào được công nhận cho cặp này, nên nó chỉ được hiển thị như một tỷ lệ thông thường.',
      caveat: 'Râu, cơ hàm căng, nụ cười và đầu nghiêng làm thay đổi đường viền hàm được phát hiện.',
    },
    'interpupillary-face-width': {
      label: 'Khoảng cách hai mắt ÷ chiều rộng khuôn mặt',
      meaning: 'Khoảng cách giữa hai đồng tử so với chiều rộng khuôn mặt.',
      formula: 'Khoảng cách giữa hai đồng tử (tâm mống mắt 468 ↔ 473) ÷ chiều rộng khuôn mặt (234 ↔ 454)',
      goldenNote:
        'Quy chuẩn cổ điển cho vùng này là cách chia "năm mắt", không phải φ, nên nó chỉ được hiển thị như một tỷ lệ thông thường.',
    },
    'nose-intercanthal': {
      label: 'Chiều rộng mũi ÷ khoảng cách hai mắt',
      meaning:
        'Chiều rộng hai cánh mũi so với khoảng cách giữa hai khóe mắt trong (khoảng cách giữa hai khóe mắt trong).',
      formula: 'Chiều rộng mũi (điểm mốc 129 ↔ 358) ÷ khoảng cách giữa hai khóe mắt trong (133 ↔ 362)',
      goldenNote:
        'Quy chuẩn cổ điển cho cặp này là tỷ lệ 1 (chiều rộng mũi ≈ khoảng cách giữa hai khóe mắt trong), không phải φ, nên nó chỉ được hiển thị như một tỷ lệ thông thường.',
    },
    'mouth-nose': {
      label: 'Chiều rộng miệng ÷ chiều rộng mũi',
      meaning: 'Miệng rộng bao nhiêu so với mũi.',
      formula: 'Chiều rộng miệng (điểm mốc 61 ↔ 291) ÷ chiều rộng mũi (129 ↔ 358)',
      goldenNote:
        'Một quan niệm thường được nhắc tới về "khuôn mặt vàng" cho rằng miệng rộng gấp khoảng φ lần mũi.',
      caveat: 'Nụ cười làm miệng rộng ra và thay đổi tỷ lệ này đáng kể. Biểu cảm thư giãn, tự nhiên là tốt nhất.',
    },
    'lip-ratio': {
      label: 'Chiều cao môi dưới ÷ môi trên',
      meaning: 'Chiều cao môi dưới so với môi trên, đo khi miệng khép.',
      formula: 'Chiều cao môi dưới (điểm mốc 14 → 17) ÷ chiều cao môi trên (0 → 13)',
      goldenNote: 'Một quan niệm thường được nhắc tới cho rằng môi dưới cao gấp khoảng φ lần môi trên.',
      caveat: 'Chỉ đo khi miệng khép. Son môi, nụ cười và ánh sáng làm lệch đường viền môi được phát hiện.',
    },
    'third-upper-middle': {
      label: 'Phần trên ÷ phần giữa',
      meaning: 'So sánh vùng trán với phần giữa khuôn mặt.',
      formula: 'Chân tóc → đường lông mày ÷ đường lông mày → chân mũi',
      goldenNote: 'Quy chuẩn cổ điển chia khuôn mặt thành ba phần xấp xỉ bằng nhau (tỷ lệ ≈ 1), không phải φ.',
    },
    'third-middle-lower': {
      label: 'Phần giữa ÷ phần dưới',
      meaning: 'So sánh vùng từ lông mày đến mũi với vùng từ mũi đến cằm.',
      formula: 'Đường lông mày → chân mũi (điểm mốc) ÷ chân mũi (2) → cằm (152)',
      goldenNote: 'Quy chuẩn cổ điển chia khuôn mặt thành ba phần xấp xỉ bằng nhau (tỷ lệ ≈ 1), không phải φ.',
      caveat:
        'Đường lông mày là độ cao trung bình của các điểm mốc lông mày, nên hình dạng lông mày và trang điểm đều ảnh hưởng đến nó.',
    },
    'third-upper-lower': {
      label: 'Phần trên ÷ phần dưới',
      meaning: 'So sánh vùng trán với vùng từ mũi đến cằm.',
      formula: 'Chân tóc → đường lông mày ÷ chân mũi → cằm',
      goldenNote: 'Quy chuẩn cổ điển chia khuôn mặt thành ba phần xấp xỉ bằng nhau (tỷ lệ ≈ 1), không phải φ.',
    },
  },
  levels: {
    'mesh-top': 'Đỉnh lưới khuôn mặt',
    hairline: 'Chân tóc (đã đánh dấu)',
    brow: 'Đường lông mày',
    'nose-base': 'Chân mũi',
    chin: 'Cằm',
  },
  symmetryPairs: {
    forehead: 'Hai bên trán',
    'brow-outer': 'Đuôi lông mày',
    'brow-peak': 'Đỉnh lông mày',
    'eye-outer': 'Khóe mắt ngoài',
    'eye-inner': 'Khóe mắt trong',
    cheekbone: 'Gò má / rìa khuôn mặt',
    'nose-wing': 'Cánh mũi',
    'mouth-corner': 'Khóe miệng',
    jaw: 'Góc hàm',
  },
  midlineFeatures: {
    glabella: 'Giữa hai lông mày',
    'nose-tip': 'Đầu mũi',
    'upper-lip': 'Giữa môi trên',
    chin: 'Cằm',
  },
  source: {
    landmark: 'Điểm mốc {index}',
    landmarks: 'Điểm mốc {right} ↔ {left}',
    browLine: 'Đường lông mày',
    markedHairline: 'Chân tóc đã đánh dấu',
    range: '{from} → {to}',
  },
  reasons: {
    missingOne: 'Không xác định được điểm mốc {landmarks} một cách đáng tin cậy.',
    missingMany: 'Không xác định được các điểm mốc {landmarks} một cách đáng tin cậy.',
    irisUnavailable: 'Không có các điểm mốc mống mắt (468 / 473).',
    mouthOpen: 'Miệng đang mở nên chiều cao môi bị thay đổi. Cần miệng khép và thư giãn để đo môi.',
    hairlineNotEstimated:
      'Không thể xác định đường chân tóc một cách đáng tin cậy từ các điểm mốc khuôn mặt (tóc, mũ và ánh sáng che khuất), nên phần trên không được ước tính. Hãy đánh dấu đường chân tóc trên ảnh để đưa nó vào.',
    browOrNoseMissing: 'Không xác định được các điểm mốc lông mày hoặc chân mũi một cách đáng tin cậy.',
    requiredMissing: 'Thiếu một số đo cần thiết.',
    zeroOrInvalid: 'Một trong hai số đo bằng 0 hoặc không hợp lệ nên không thể tính tỷ lệ.',
    hairlineInvalid: 'Vị trí chân tóc đã đánh dấu không hợp lệ.',
    hairlineOutside: 'Chân tóc đã đánh dấu nằm ngoài ảnh.',
    hairlineBelowBrows: 'Chân tóc đã đánh dấu phải nằm phía trên lông mày.',
    pairOverlap: 'Điểm bên trái và bên phải chồng lên nhau hoặc bị đổi chỗ.',
  },
}
