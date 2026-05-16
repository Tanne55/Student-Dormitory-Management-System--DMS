"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Be_Vietnam_Pro } from "next/font/google";
import { API_BASE, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBWIQGlC7zexy9OIp0R1y-psZ2REpZE6PKiI7ilsTlDeUIt-NcCIz9ArN99rorfMxRBQuhp-VEiJXtxacOT-ahfSta161vDistEnvoG_vjRr6dTPpnsv7OyCgknwpy7Qp1ArU8zXxPTrSC8_xOJ6tAjMEvZHYvsd1kLRaOfJ7nTORwvg8fOm5hWGnIcSJq8YdpdT1OiVtfedX8KUqsorzPTkz9ln6cxKomyiAZq3F28MvUMo312DFEp5rXK5u8wKBLK0NUs_Mu7kIwr";

export default function Home() {
  const [data, setData] = useState("");

  useEffect(() => {
    apiFetch(`${API_BASE}/`)
      .then((res) => res.text())
      .then((text) => setData(text))
      .catch(() => setData(""));
  }, []);

  const apiOk = data.length > 0;

  return (
    <div className={`${beVietnam.className} min-h-screen bg-surface text-on-surface`}>
      <nav className="fixed top-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/10 bg-surface/80 px-8 backdrop-blur-md transition-all md:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container">
            <span
              className="material-symbols-outlined text-xl text-on-primary"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
            >
              domain
            </span>
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">QLKTX</span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-semibold text-on-surface-variant md:flex">
          <a className="transition-colors hover:text-primary" href="#features">
            Giới thiệu
          </a>
          <a className="transition-colors hover:text-primary" href="#features">
            Hướng dẫn
          </a>
          <a className="transition-colors hover:text-primary" href="#stats">
            Tin tức
          </a>
          <a className="transition-colors hover:text-primary" href="#footer">
            Liên hệ
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-surface-container"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register-student"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary-container"
          >
            Đăng ký nội trú
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pb-32 md:pt-48">
        <div className="absolute top-0 right-0 -z-10 translate-x-1/4 -translate-y-1/4 transform opacity-20">
          <div className="h-[600px] w-[600px] rounded-full bg-primary blur-[120px]" />
        </div>
        <div className="absolute bottom-0 left-0 -z-10 -translate-x-1/4 translate-y-1/4 transform opacity-10">
          <div className="h-[400px] w-[400px] rounded-full bg-tertiary-container blur-[100px]" />
        </div>

        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${apiOk ? "animate-pulse bg-green-500" : "bg-amber-400"}`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {apiOk ? "Hệ thống hoạt động bình thường" : "Đang kiểm tra máy chủ…"}
            </span>
          </div>

          <h1 className="mb-8 text-4xl font-extrabold leading-[1.1] tracking-tight text-primary md:text-6xl lg:text-7xl">
            QLKTX — Hệ thống
            <br />
            <span className="text-primary-container">Quản lý Ký túc xá</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg font-medium leading-relaxed text-on-surface-variant md:text-xl">
            Quản lý phòng, hợp đồng, hóa đơn và sự cố kỹ thuật trong một nền tảng đồng nhất. Giải pháp số hóa toàn diện cho môi trường nội trú hiện
            đại.
          </p>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button variant="gradient" size="lg">Đăng nhập hệ thống</Button>
            </Link>
            <Link href="/register-student">
              <Button variant="secondary" size="lg">Đăng ký nội trú</Button>
            </Link>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="glass-card overflow-hidden rounded-2xl border-4 border-white/50 shadow-2xl">
              <img
                src={HERO_IMG}
                alt="Giao diện dashboard quản lý ký túc xá"
                className="w-full object-cover"
                width={1200}
                height={675}
                loading="eager"
              />
            </div>
            <div className="absolute -left-12 top-1/4 hidden max-w-[240px] rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-xl lg:block">
              <div className="mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container">hotel</span>
                <span className="text-sm font-bold text-on-surface">Tình trạng phòng</span>
              </div>
              <div className="mb-1 text-3xl font-bold text-primary">98%</div>
              <p className="text-xs font-medium text-on-surface-variant">Phòng đã lấp đầy hoàn toàn</p>
            </div>
            <div className="absolute -right-12 bottom-1/4 hidden max-w-[240px] rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-xl lg:block">
              <div className="mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-error">engineering</span>
                <span className="text-sm font-bold text-on-surface">Sự cố kỹ thuật</span>
              </div>
              <div className="mb-1 text-3xl font-bold text-primary">05</div>
              <p className="text-xs font-medium text-on-surface-variant">Đang được xử lý ngay lập tức</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-surface-container-low py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary md:text-4xl">Tính năng cốt lõi</h2>
            <p className="font-medium text-on-surface-variant">Đơn giản hóa quy trình vận hành và quản lý sinh viên</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group transform rounded-3xl bg-surface-container-lowest p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <span className="material-symbols-outlined text-3xl">meeting_room</span>
              </div>
              <h3 className="mb-4 text-xl font-bold text-primary">Quản lý phòng &amp; hợp đồng</h3>
              <p className="font-medium leading-relaxed text-on-surface-variant">
                Tra cứu tình trạng phòng trống theo thời gian thực. Tự động hóa quy trình gia hạn và chấm dứt hợp đồng nội trú của sinh viên.
              </p>
            </div>
            <div className="group transform rounded-3xl bg-surface-container-lowest p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <span className="material-symbols-outlined text-3xl">campaign</span>
              </div>
              <h3 className="mb-4 text-xl font-bold text-primary">Báo cáo sự cố nhanh chóng</h3>
              <p className="font-medium leading-relaxed text-on-surface-variant">
                Sinh viên có thể gửi yêu cầu sửa chữa điện nước, cơ sở vật chất ngay trên điện thoại. Theo dõi tiến độ xử lý minh bạch 24/7.
              </p>
            </div>
            <div className="group transform rounded-3xl bg-surface-container-lowest p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed-variant transition-colors group-hover:bg-tertiary group-hover:text-on-tertiary">
                <span className="material-symbols-outlined text-3xl">receipt_long</span>
              </div>
              <h3 className="mb-4 text-xl font-bold text-primary">Hóa đơn điện nước minh bạch</h3>
              <p className="font-medium leading-relaxed text-on-surface-variant">
                Tự động tính toán chỉ số điện nước hàng tháng. Thông báo và thanh toán trực tuyến nhanh gọn, tránh nhầm lẫn sai sót dữ liệu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="stats" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-container p-10 text-on-primary md:col-span-2">
            <span
              className="material-symbols-outlined mb-4 text-4xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
            >
              groups
            </span>
            <h4 className="mb-2 text-4xl font-extrabold">5,000+</h4>
            <p className="text-lg font-medium opacity-80">Sinh viên đang sinh hoạt tại các khu nội trú thuộc hệ thống quản lý.</p>
          </div>
          <div className="rounded-3xl bg-surface-container p-8">
            <span className="material-symbols-outlined mb-4 text-3xl text-primary">apartment</span>
            <h4 className="mb-1 text-2xl font-bold text-primary">12 Khu</h4>
            <p className="text-sm font-medium text-on-surface-variant">Ký túc xá tích hợp</p>
          </div>
          <div className="rounded-3xl bg-surface-container p-8">
            <span className="material-symbols-outlined mb-4 text-3xl text-primary">verified</span>
            <h4 className="mb-1 text-2xl font-bold text-primary">99.9%</h4>
            <p className="text-sm font-medium text-on-surface-variant">Thời gian khả dụng</p>
          </div>
        </div>
      </section>

      <footer id="footer" className="bg-surface-container-highest pb-10 pt-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span
                    className="material-symbols-outlined text-sm text-on-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    domain
                  </span>
                </div>
                <span className="text-xl font-bold tracking-tight text-primary">QLKTX</span>
              </div>
              <p className="mb-6 max-w-sm font-medium text-on-surface-variant">
                Kiến tạo môi trường sống thông minh và tiện nghi cho sinh viên thông qua giải pháp quản lý kỹ thuật số toàn diện.
              </p>
              <div className="flex gap-4">
                <span className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined text-xl">social_leaderboard</span>
                </span>
                <span className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined text-xl">language</span>
                </span>
                <span className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined text-xl">mail</span>
                </span>
              </div>
            </div>
            <div>
              <h5 className="mb-6 font-bold text-primary">Liên kết</h5>
              <ul className="space-y-4 text-sm font-medium text-on-surface-variant">
                <li>
                  <a className="transition-colors hover:text-primary" href="#features">
                    Về chúng tôi
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="#features">
                    Quy định KTX
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="/register-student">
                    Biểu mẫu đăng ký
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="/login">
                    Hỗ trợ sinh viên
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 font-bold text-primary">Pháp lý</h5>
              <ul className="space-y-4 text-sm font-medium text-on-surface-variant">
                <li>
                  <a className="transition-colors hover:text-primary" href="#footer">
                    Điều khoản sử dụng
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="#footer">
                    Chính sách bảo mật
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="#footer">
                    Quy trình xử lý sự cố
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-6 border-t border-outline-variant/20 pt-8 md:flex-row">
            <div className="text-sm font-medium text-on-surface-variant">
              © {new Date().getFullYear()} QLKTX — Hệ thống Quản lý Ký túc xá. Version 2.4.0
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-on-surface-variant">Chưa có tài khoản?</span>
              <Link href="/register-student" className="font-bold text-primary hover:underline">
                Đăng ký nội trú ngay
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
