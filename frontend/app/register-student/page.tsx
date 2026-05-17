'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

const FACULTIES_AND_MAJORS: Record<string, string[]> = {
  'Khoa Công nghệ thông tin': ['Hệ thống thông tin', 'Kỹ thuật phần mềm', 'Khoa học máy tính', 'Mạng máy tính và Truyền thông'],
  'Khoa Điện tử viễn thông': ['Kỹ thuật điện tử', 'Kỹ thuật viễn thông', 'Tự động hóa', 'IoT và Kỹ thuật số'],
  'Khoa Kinh tế và Quản lý': ['Quản trị kinh doanh', 'Kế toán', 'Tài chính ngân hàng', 'Kinh tế quốc tế'],
  'Khoa Kỹ thuật Cơ khí': ['Kỹ thuật cơ điện tử', 'Kỹ thuật ô tô', 'Cơ khí chế tạo', 'Kỹ thuật nhiệt'],
  'Khoa Ngoại ngữ': ['Ngôn ngữ Anh', 'Ngôn ngữ Nhật', 'Ngôn ngữ Hàn'],
};

const STEPS = [
  { icon: 'person', label: 'Cá nhân' },
  { icon: 'school', label: 'Học tập' },
  { icon: 'family_restroom', label: 'Liên hệ' },
  { icon: 'bed', label: 'Phòng' },
  { icon: 'verified', label: 'Xác nhận' },
];

function SectionCard({
  step,
  icon,
  title,
  children,
}: {
  step: number;
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg" className="!p-6 sm:!p-10">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-surface-container-high/40">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
          <span className="text-primary">Bước {step}:</span> {title}
        </h2>
      </div>
      {children}
    </Card>
  );
}

const SelectClass =
  'w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] px-4 text-sm font-medium text-on-surface outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function StudentRegistration() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [basic, setBasic] = useState({
    studentCode: '',
    fullName: '',
    dob: '',
    gender: 'Nam',
    phone: '',
    emailPersonal: '',
    emailSchool: '',
    cohort: '',
    faculty: '',
    major: '',
    className: '',
  });

  const [profile, setProfile] = useState({
    idCardNumber: '',
    idCardIssuedDate: '',
    nation: 'Việt Nam',
    birthPlace: '',
    ethnicity: '',
    religion: 'Không',
    province: '',
    district: '',
    ward: '',
    addressDetail: '',
    priorityGroup: 'None',
  });

  const [contacts, setContacts] = useState([
    { fullName: '', relationship: '', phone: '', address: '', isPrimary: true },
  ]);

  const [roomTypeOptions, setRoomTypeOptions] = useState<any[]>([]);
  const [dormRegistration, setDormRegistration] = useState({
    roomTypeId: '',
    semester: 'HK1-2024',
  });
  const [priorityFile, setPriorityFile] = useState<File | null>(null);

  const [provincesList, setProvincesList] = useState<any[]>([]);
  const [districtsList, setDistrictsList] = useState<any[]>([]);
  const [wardsList, setWardsList] = useState<any[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then((res) => res.json())
      .then((data) => setProvincesList(data))
      .catch(() => {});

    fetch(`${API_BASE}/rooms/room-types`)
      .then((res) => res.json())
      .then((data) => {
        setRoomTypeOptions(data);
        if (data.length > 0)
          setDormRegistration((p) => ({ ...p, roomTypeId: String(data[0].roomTypeId) }));
      })
      .catch(() => {});
  }, []);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const prov = provincesList.find((p: any) => p.code == code);
    setSelectedProvinceCode(code);
    setProfile({ ...profile, province: prov ? prov.name : '', district: '', ward: '' });
    setSelectedDistrictCode('');
    setSelectedWardCode('');
    if (code) {
      fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          setDistrictsList(data.districts || []);
          setWardsList([]);
        })
        .catch(() => {});
    } else {
      setDistrictsList([]);
      setWardsList([]);
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const dist = districtsList.find((d: any) => d.code == code);
    setSelectedDistrictCode(code);
    setProfile({ ...profile, district: dist ? dist.name : '', ward: '' });
    setSelectedWardCode('');
    if (code) {
      fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
        .then((res) => res.json())
        .then((data) => setWardsList(data.wards || []))
        .catch(() => {});
    } else {
      setWardsList([]);
    }
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const wrd = wardsList.find((w: any) => w.code == code);
    setSelectedWardCode(code);
    setProfile({ ...profile, ward: wrd ? wrd.name : '' });
  };

  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBasic({ ...basic, faculty: e.target.value, major: '' });
  };
  const availableMajors = FACULTIES_AND_MAJORS[basic.faculty] || [];

  const addContact = () =>
    setContacts([...contacts, { fullName: '', relationship: '', phone: '', address: '', isPrimary: false }]);
  const removeContact = (i: number) => {
    const u = [...contacts];
    u.splice(i, 1);
    setContacts(u);
  };
  const handleContactChange = (i: number, field: string, value: string) => {
    const u = [...contacts];
    u[i] = { ...u[i], [field]: value };
    setContacts(u);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Dung lượng tệp phải < 5MB');
        setPriorityFile(null);
        e.target.value = '';
        return;
      }
      setPriorityFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (profile.priorityGroup !== 'None' && !priorityFile) {
        throw new Error('Vui lòng tải lên file minh chứng nếu thuộc diện ưu tiên.');
      }

      const formData = new FormData();
      formData.append('student_code', basic.studentCode);
      formData.append('room_type', dormRegistration.roomTypeId);
      formData.append('semester', dormRegistration.semester);
      formData.append('priority_type', profile.priorityGroup);
      const appData = { basic, profile, contacts };
      formData.append('application_data', JSON.stringify(appData));
      if (priorityFile) formData.append('priority_proof', priorityFile);

      const res = await apiFetch(`${API_BASE}/dorm-registrations/public/apply`, {
        method: 'POST',
        body: formData,
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || 'Gửi đơn thất bại.');

      setSuccess('Đơn đăng ký đã gửi thành công và đang chờ xét duyệt!');
      window.scrollTo(0, 0);
      setTimeout(() => router.push('/'), 5000);
    } catch (err: any) {
      setError(err.message);
      window.scrollTo(0, 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-surface/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                domain
              </span>
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">QLKTX</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
            >
              Trang chủ
            </Link>
            <Link href="/login">
              <Button variant="gradient" size="sm">
                Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pb-12">
        {/* Hero */}
        <section className="w-full bg-surface-container-low pt-12 pb-8 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight mb-2">
              Đăng ký nội trú
            </h1>
            <p className="text-on-surface-variant">Hệ thống xét duyệt và xếp phòng tự động cho sinh viên</p>
          </div>
        </section>

        {/* Stepper */}
        <div className="sticky top-[68px] z-40 bg-surface/80 backdrop-blur-md py-6 px-4">
          <div className="max-w-3xl mx-auto relative flex justify-between items-center px-4">
            <div className="absolute inset-x-10 sm:inset-x-16 top-[20px] h-0.5 bg-surface-container-high" />
            {STEPS.map((s, i) => (
              <div key={s.label} className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-md ring-4 ring-surface">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {s.icon}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary hidden sm:block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12 space-y-8">
          {error && (
            <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
              <span
                className="material-symbols-outlined text-error"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 px-6 py-5 rounded-2xl flex gap-3 items-center shadow-md shadow-green-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-green-700"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-green-800 font-bold mb-1">Thành công!</p>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <SectionCard step={1} icon="contact_page" title="Thông tin cá nhân & địa chỉ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Họ và tên" required>
                  <Input
                    required
                    placeholder="NGUYỄN VĂN A"
                    value={basic.fullName}
                    onChange={(e) => setBasic({ ...basic, fullName: e.target.value })}
                  />
                </Field>
                <Field label="Mã số sinh viên" required>
                  <Input
                    required
                    pattern="^SV\d{6}$"
                    title="Format: SV123456"
                    placeholder="SV123456"
                    value={basic.studentCode}
                    onChange={(e) => setBasic({ ...basic, studentCode: e.target.value })}
                  />
                </Field>
                <Field label="Ngày sinh" required>
                  <Input
                    required
                    type="date"
                    value={basic.dob}
                    onChange={(e) => setBasic({ ...basic, dob: e.target.value })}
                  />
                </Field>
                <Field label="Giới tính" required>
                  <div className="flex gap-4 h-12 items-center">
                    {['Nam', 'Nữ', 'Khác'].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          className="w-4 h-4 accent-primary"
                          checked={basic.gender === g}
                          onChange={() => setBasic({ ...basic, gender: g })}
                        />
                        <span className="text-sm font-medium">{g}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Số CCCD/CMND" required>
                  <Input
                    required
                    value={profile.idCardNumber}
                    onChange={(e) => setProfile({ ...profile, idCardNumber: e.target.value })}
                  />
                </Field>
                <Field label="Ngày cấp CCCD" required>
                  <Input
                    required
                    type="date"
                    value={profile.idCardIssuedDate}
                    onChange={(e) => setProfile({ ...profile, idCardIssuedDate: e.target.value })}
                  />
                </Field>

                <Field label="Số điện thoại" required>
                  <Input
                    required
                    type="tel"
                    value={basic.phone}
                    onChange={(e) => setBasic({ ...basic, phone: e.target.value })}
                  />
                </Field>
                <Field label="Nơi sinh" required>
                  <Input
                    required
                    value={profile.birthPlace}
                    onChange={(e) => setProfile({ ...profile, birthPlace: e.target.value })}
                  />
                </Field>

                <Field label="Dân tộc">
                  <Input
                    value={profile.ethnicity}
                    onChange={(e) => setProfile({ ...profile, ethnicity: e.target.value })}
                    placeholder="Kinh"
                  />
                </Field>
                <Field label="Tôn giáo">
                  <Input
                    value={profile.religion}
                    onChange={(e) => setProfile({ ...profile, religion: e.target.value })}
                    placeholder="Không"
                  />
                </Field>
                <Field label="Quốc tịch" required>
                  <Input
                    required
                    value={profile.nation}
                    onChange={(e) => setProfile({ ...profile, nation: e.target.value })}
                  />
                </Field>
                <div />

                <div className="md:col-span-2">
                  <Field label="Email" required>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        required
                        type="email"
                        placeholder="sv_2024@university.edu.vn"
                        value={basic.emailSchool}
                        onChange={(e) => setBasic({ ...basic, emailSchool: e.target.value })}
                      />
                      <Input
                        required
                        type="email"
                        placeholder="Email cá nhân (Gmail...)"
                        value={basic.emailPersonal}
                        onChange={(e) => setBasic({ ...basic, emailPersonal: e.target.value })}
                      />
                    </div>
                  </Field>
                </div>

                <div className="md:col-span-2 pt-2">
                  <h3 className="text-sm font-bold text-on-surface mb-4">Địa chỉ thường trú</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <Field label="Tỉnh / Thành" required>
                      <select required className={SelectClass} value={selectedProvinceCode} onChange={handleProvinceChange}>
                        <option value="">— Chọn —</option>
                        {provincesList.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quận / Huyện" required>
                      <select
                        required
                        disabled={!selectedProvinceCode}
                        className={SelectClass}
                        value={selectedDistrictCode}
                        onChange={handleDistrictChange}
                      >
                        <option value="">— Chọn —</option>
                        {districtsList.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Phường / Xã" required>
                      <select
                        required
                        disabled={!selectedDistrictCode}
                        className={SelectClass}
                        value={selectedWardCode}
                        onChange={handleWardChange}
                      >
                        <option value="">— Chọn —</option>
                        {wardsList.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Chi tiết số nhà / đường" required>
                    <textarea
                      required
                      rows={2}
                      placeholder="Số nhà, khu phố..."
                      value={profile.addressDetail}
                      onChange={(e) => setProfile({ ...profile, addressDetail: e.target.value })}
                      className="w-full rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] px-4 py-3 text-sm text-on-surface outline-none resize-none transition-all"
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard step={2} icon="school" title="Thông tin học tập">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Trường / Khoa" required>
                  <select required className={SelectClass} value={basic.faculty} onChange={handleFacultyChange}>
                    <option value="">— Chọn khoa —</option>
                    {Object.keys(FACULTIES_AND_MAJORS).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ngành học" required>
                  <select
                    required
                    disabled={!basic.faculty}
                    className={SelectClass}
                    value={basic.major}
                    onChange={(e) => setBasic({ ...basic, major: e.target.value })}
                  >
                    <option value="">— Chọn ngành —</option>
                    {availableMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Khóa học (Cohort)" required>
                  <Input
                    required
                    placeholder="K63, Cohort 19..."
                    value={basic.cohort}
                    onChange={(e) => setBasic({ ...basic, cohort: e.target.value })}
                  />
                </Field>
                <Field label="Lớp quản lý" required>
                  <Input
                    required
                    placeholder="VD: IT1-02"
                    value={basic.className}
                    onChange={(e) => setBasic({ ...basic, className: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard step={3} icon="family_restroom" title="Người liên hệ khẩn cấp">
              <div className="flex justify-end mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addContact}
                  icon={<span className="material-symbols-outlined text-[16px]">add</span>}
                >
                  Thêm liên hệ
                </Button>
              </div>
              <div className="space-y-5">
                {contacts.map((contact, index) => (
                  <div key={index} className="bg-surface-container-low rounded-2xl p-5 relative">
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-error-container text-error hover:bg-error hover:text-on-error flex items-center justify-center transition-colors"
                        title="Xóa"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                    <h3 className="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-widest pl-2 border-l-4 border-primary">
                      # {index + 1} {contact.isPrimary && '(Chính)'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Họ và tên" required>
                        <Input
                          required
                          value={contact.fullName}
                          onChange={(e) => handleContactChange(index, 'fullName', e.target.value)}
                        />
                      </Field>
                      <Field label="Mối quan hệ" required>
                        <Input
                          required
                          placeholder="Bố, mẹ, anh..."
                          value={contact.relationship}
                          onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                        />
                      </Field>
                      <Field label="Số điện thoại" required>
                        <Input
                          required
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                        />
                      </Field>
                      <Field label="Địa chỉ liên lạc" required>
                        <Input
                          required
                          placeholder="Địa chỉ hiện tại..."
                          value={contact.address}
                          onChange={(e) => handleContactChange(index, 'address', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-on-surface-variant/80 pl-2">
                  Thông tin liên lạc dùng khi ốm đau, sự cố tại KTX.
                </p>
              </div>
            </SectionCard>

            <SectionCard step={4} icon="bed" title="Nhu cầu dịch vụ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Loại phòng mong muốn" required>
                  <select
                    required
                    className={SelectClass}
                    value={dormRegistration.roomTypeId}
                    onChange={(e) => setDormRegistration({ ...dormRegistration, roomTypeId: e.target.value })}
                  >
                    {roomTypeOptions.length === 0 && <option value="">Đang tải...</option>}
                    {roomTypeOptions.map((t) => (
                      <option key={t.roomTypeId} value={t.roomTypeId}>
                        {t.name} ({t.capacity} người) - {Number(t.monthlyPrice).toLocaleString()}₫/tháng
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Học kỳ đăng ký" required>
                  <select
                    required
                    className={SelectClass}
                    value={dormRegistration.semester}
                    onChange={(e) => setDormRegistration({ ...dormRegistration, semester: e.target.value })}
                  >
                    <option value="HK1-2024">Học kỳ 1 - 2024-2025</option>
                    <option value="HK2-2024">Học kỳ 2 - 2024-2025</option>
                  </select>
                </Field>
                <div className="md:col-span-2 pt-2">
                  <Field label="Đối tượng ưu tiên (nếu có)">
                    <select
                      className={SelectClass}
                      value={profile.priorityGroup}
                      onChange={(e) => setProfile({ ...profile, priorityGroup: e.target.value })}
                    >
                      <option value="None">Không có (Chế độ thường)</option>
                      <option value="Priority 1">Ưu tiên 1 (Con liệt sĩ, TB/BB)</option>
                      <option value="Priority 2">Ưu tiên 2 (Dân tộc thiểu số vùng 3)</option>
                      <option value="Priority 3">Ưu tiên 3 (Hộ nghèo, mồ côi)</option>
                      <option value="Priority 4">Ưu tiên 4 (Sinh viên khuyết tật)</option>
                    </select>
                  </Field>
                </div>

                {profile.priorityGroup !== 'None' && (
                  <div className="md:col-span-2">
                    <Field label="Tải lên minh chứng (JPG/PDF < 5MB)" required>
                      <label className="border-2 border-dashed border-outline-variant/40 bg-surface-container-low rounded-2xl px-6 py-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-surface-container transition-all relative">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
                          cloud_upload
                        </span>
                        <input
                          required
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm font-bold text-primary">
                          {priorityFile ? priorityFile.name : 'Nhấn để chọn file minh chứng'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant mt-2 text-center max-w-sm">
                          Đảm bảo tài liệu rõ nét, có dấu giáp lai hợp lệ.
                        </p>
                      </label>
                    </Field>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard step={5} icon="verified" title="Xác nhận & gửi đơn">
              <div className="space-y-6">
                <div className="p-5 bg-surface-container-low rounded-2xl space-y-3 text-sm">
                  <div className="flex justify-between pb-3 border-b border-surface-container-high/40">
                    <span className="text-on-surface-variant">Họ tên & MSSV:</span>
                    <span className="font-bold text-on-surface truncate">
                      {basic.fullName || '---'} {basic.studentCode ? `- ${basic.studentCode}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-surface-container-high/40">
                    <span className="text-on-surface-variant">Trường/Khoa:</span>
                    <span className="font-bold text-on-surface max-w-xs text-right truncate">
                      {basic.faculty || '---'} {basic.major ? `(${basic.major})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Loại phòng:</span>
                    <span className="font-bold text-on-surface text-right">
                      {roomTypeOptions.find((t) => t.roomTypeId == dormRegistration.roomTypeId)?.name || '...'} (
                      Học kỳ {dormRegistration.semester.replace('-2024', '')})
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    required
                    type="checkbox"
                    className="mt-1 w-5 h-5 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-sm leading-relaxed text-on-surface-variant select-none">
                    Tôi cam kết các thông tin khai báo trên là chính xác và đồng ý tuân thủ nội quy ký túc xá. Khai báo sai sự thật sẽ dẫn đến việc hủy đơn và chịu kỷ luật.
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  iconRight={
                    !isLoading ? <span className="material-symbols-outlined">send</span> : undefined
                  }
                >
                  {isLoading ? 'Đang mã hóa dữ liệu...' : 'Nộp đơn đăng ký chính thức'}
                </Button>

                <p className="text-center text-xs text-on-surface-variant/80">
                  Kết quả sẽ được gửi qua hệ thống và email sinh viên sau 3-5 ngày làm việc.
                </p>
              </div>
            </SectionCard>
          </form>
        </div>
      </main>

      <footer className="w-full bg-surface-container-low mt-auto">
        <div className="w-full py-6 px-6 flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
          <div className="text-xs text-on-surface-variant text-center md:text-left">
            © 2024 Hệ thống Quản lý Ký túc xá QLKTX. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Quy định KTX
            </a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Bảo mật dữ liệu
            </a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Hỗ trợ kỹ thuật
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
