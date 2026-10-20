import type { upload as en } from '../en/upload'

export const upload: typeof en = {
  dropzone: {
    dropHere: 'Thả ảnh của bạn vào đây',
    dragHere: 'Kéo và thả ảnh vào đây',
    orChoose: 'hoặc chọn một ảnh từ thiết bị của bạn',
    opening: 'Đang mở ảnh…',
    choose: 'Chọn ảnh',
    hint: 'JPG, PNG hoặc WebP · tối đa {limit} MB · chỉ nằm trên thiết bị của bạn',
    errorTitle: 'Không thể dùng ảnh này',
  },
  editor: {
    rotateLeft: 'Xoay trái',
    rotateRight: 'Xoay phải',
    resetCrop: 'Đặt lại vùng cắt',
    dragHint: 'Kéo khung để cắt quanh khuôn mặt',
    preview: 'Xem trước ảnh',
    cropArea: 'Vùng cắt. Phím mũi tên để di chuyển; Alt cùng phím mũi tên để đổi kích thước.',
  },
  errors: {
    empty: 'Tệp này trống. Vui lòng chọn ảnh khác.',
    tooLarge: 'Ảnh này nặng {size} MB. Giới hạn là {limit} MB — hãy thử bản nhỏ hơn hoặc đã nén.',
    unsupportedType: 'Loại tệp không được hỗ trợ. Vui lòng dùng ảnh JPG, PNG hoặc WebP.',
    unreadable: 'Không thể đọc tệp này. Vui lòng thử lại.',
    notRealImage: 'Tệp này không giống ảnh JPG, PNG hoặc WebP thật, nên không thể phân tích.',
    cannotOpen: 'Không thể mở ảnh này. Ảnh có thể bị hỏng hoặc quá lớn đối với thiết bị này.',
    tooManyFiles: 'Vui lòng thêm từng ảnh một.',
  },
}
