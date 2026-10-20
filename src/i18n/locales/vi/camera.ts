import type { camera as en } from '../en/camera'

export const camera: typeof en = {
  modal: {
    title: 'Chụp ảnh',
    description: 'Nhìn thẳng vào camera, giữ vẻ mặt thư giãn và dùng ánh sáng đều.',
  },
  intro:
    'GoldenFace cần quyền sử dụng camera của bạn. Ảnh chỉ nằm trên thiết bị này và camera sẽ tắt ngay khi bạn chụp.',
  startCamera: 'Bật camera',
  waiting: 'Đang chờ quyền truy cập camera — hãy chọn “Cho phép” khi trình duyệt hỏi.',
  tryAgain: 'Thử lại',
  uploadInstead: 'Tải ảnh lên thay thế',
  livePreview: 'Xem trước camera trực tiếp',
  capturedPhoto: 'Ảnh bạn vừa chụp',
  notReady: 'Camera chưa sẵn sàng. Hãy đợi hình xem trước xuất hiện rồi thử lại.',
  centerHint: 'Đặt khuôn mặt vào giữa hình oval và nhìn thẳng vào ống kính.',
  switchCamera: 'Đổi camera',
  takePhoto: 'Chụp ảnh',
  cancel: 'Hủy',
  retake: 'Chụp lại',
  usePhoto: 'Dùng ảnh này',
  errors: {
    insecure: {
      title: 'Camera cần kết nối bảo mật',
      message:
        'Trình duyệt chỉ cho phép dùng camera trên các trang HTTPS (hoặc localhost). Hãy mở trang này qua https:// hoặc tải ảnh lên.',
    },
    unsupported: {
      title: 'Camera không được hỗ trợ ở đây',
      message:
        'Trình duyệt này không thể truy cập camera. Hãy thử phiên bản mới của Chrome, Edge, Firefox hoặc Safari, hoặc tải ảnh lên.',
    },
    denied: {
      title: 'Quyền truy cập camera đã bị chặn',
      message:
        'GoldenFace không thể dùng camera vì quyền truy cập đã bị từ chối. Hãy cho phép camera đối với trang này trong phần cài đặt của trình duyệt (thường là biểu tượng ổ khóa trên thanh địa chỉ), rồi thử lại — hoặc tải ảnh lên.',
    },
    notFound: {
      title: 'Không tìm thấy camera',
      message: 'Không phát hiện camera nào trên thiết bị này. Hãy kết nối camera, hoặc tải ảnh lên.',
    },
    inUse: {
      title: 'Camera đang bận',
      message:
        'Không thể khởi động camera, có thể do ứng dụng hoặc tab khác đang dùng. Hãy đóng các ứng dụng đang dùng camera rồi thử lại.',
    },
    unknown: {
      title: 'Không thể khởi động camera',
      message: 'Đã xảy ra lỗi khi khởi động camera. Vui lòng thử lại, hoặc tải ảnh lên.',
    },
  },
}
