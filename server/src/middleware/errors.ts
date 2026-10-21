import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.name === 'MulterError') return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Mỗi tệp tối đa 10 MB.' : 'Không thể nhận tệp đính kèm.' });
  if (error?.message === 'Tệp không được hỗ trợ. Chỉ nhận ảnh, PDF, DOCX và XLSX.') return res.status(400).json({ message: error.message });
  if (error?.message === 'Tệp minh chứng chỉ nhận JPEG, PNG, WEBP hoặc PDF.') return res.status(400).json({ message: error.message });
  if (error?.name === 'ZodError') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.', details: error.issues?.map((issue: { path: (string | number)[]; message: string }) => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  if (error?.name === 'VersionError') return res.status(409).json({ message: 'Bản ghi vừa được người khác cập nhật. Tải lại trang rồi thử lại.' });
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
  }
  if (error?.code === 11000) return res.status(409).json({ message: 'Thông tin đã tồn tại.' });
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599) return res.status(error.status).json({ message: error.message || 'Yêu cầu không thể xử lý.' });
  console.error(error);
  return res.status(500).json({ message: 'Đã xảy ra lỗi máy chủ.' });
};
