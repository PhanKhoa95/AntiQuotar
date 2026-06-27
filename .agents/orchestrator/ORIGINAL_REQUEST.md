# Original User Request

## Initial Request — 2026-06-26T14:15:05+07:00

Dự án nhằm hoàn thiện toàn bộ các tính năng cốt lõi của AntiQuotar (tự động xoay vòng, tích hợp LS gateway, kiểm tra trạng thái) và xây dựng bộ kiểm thử tự động toàn diện bằng Playwright phục vụ cho việc sử dụng thực tế hàng ngày (Production).

Working directory: c:\Users\KHOA MEDIA\Documents\AntiQuotar
Integrity mode: development

## Requirements

### R1. Hoàn thiện các tính năng cốt lõi (Core Features)
- Đảm bảo chức năng tự động xoay vòng (auto-rotation) hoạt động chính xác khi một phiên làm việc (session) vượt quá ngưỡng quota thiết lập.
- Tích hợp và đồng bộ hóa thành công trạng thái session/quota từ LS Gateway cục bộ (`http://127.0.0.1:5188/v1/provision/status`) khi kích hoạt "Run Check".
- Quản lý trạng thái Cooldown chính xác, tự động đưa các session đang cooldown xuống cuối hàng đợi xoay vòng.

### R2. Bộ kiểm thử tự động toàn diện bằng Playwright (Automated Playwright Tests)
- Xây dựng các kịch bản kiểm thử tự động E2E bằng Playwright để kiểm tra giao diện và tính năng của ứng dụng (chạy tại `http://127.0.0.1:5173/`).
- Các kịch bản tối thiểu cần có:
  - Thêm session từ Cookie Inbox với nhiều định dạng (Header string, Netscape, JSON).
  - Cơ chế tự động xoay vòng và xoay vòng thủ công hoạt động đúng.
  - Hàng đợi Rotation Queue được sắp xếp đúng thứ tự (Healthy/Ready trước, Cooldown sau).
  - Kiểm tra và đảm bảo không có cảnh báo HTML/Accessibility (không trùng ID, nhãn liên kết đúng).

## Acceptance Criteria

### Tính năng hoạt động
- [ ] Tính năng "Run Check" đồng bộ đúng dữ liệu từ LS Gateway cục bộ (nếu gateway đang chạy) hoặc ghi nhận log cảnh báo chính xác (nếu không kết nối được).
- [ ] Khi một session vượt quá ngưỡng giới hạn quota và tự động xoay vòng, session mới được chọn phải có trạng thái Healthy hoặc Watch và có mức sử dụng quota thấp nhất.
- [ ] Dữ liệu session, active session và cấu hình được lưu trữ và khôi phục chính xác từ localStorage khi tải lại trang.

### Kiểm thử & Chất lượng
- [ ] Toàn bộ mã nguồn kiểm thử Playwright được lưu trữ trong thư mục `tests/` hoặc thư mục cấu hình tiêu chuẩn.
- [ ] Chạy lệnh chạy thử nghiệm `npx playwright test` thành công và tất cả các test case đều ĐẠT (Passed).
- [ ] Build dự án thành công (`npm run build`) mà không gặp bất kỳ lỗi TypeScript hay lỗi biên dịch nào.
