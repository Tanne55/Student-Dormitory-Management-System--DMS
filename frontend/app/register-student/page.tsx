'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';

// --- MÔ PHỎNG DỮ LIỆU API KHOA/NGÀNH ---
const FACULTIES_AND_MAJORS: Record<string, string[]> = {
  "Khoa Công nghệ thông tin": ["Hệ thống thông tin", "Kỹ thuật phần mềm", "Khoa học máy tính", "Mạng máy tính và Truyền thông"],
  "Khoa Điện tử viễn thông": ["Kỹ thuật điện tử", "Kỹ thuật viễn thông", "Tự động hóa", "IoT và Kỹ thuật số"],
  "Khoa Kinh tế và Quản lý": ["Quản trị kinh doanh", "Kế toán", "Tài chính ngân hàng", "Kinh tế quốc tế"],
  "Khoa Kỹ thuật Cơ khí": ["Kỹ thuật cơ điện tử", "Kỹ thuật ô tô", "Cơ khí chế tạo", "Kỹ thuật nhiệt"],
  "Khoa Ngoại ngữ": ["Ngôn ngữ Anh", "Ngôn ngữ Nhật", "Ngôn ngữ Hàn"]
};

export default function StudentRegistration() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Section 1: Basic & Academic Information
  const [basic, setBasic] = useState({
    studentCode: '', fullName: '', dob: '', gender: 'Nam', 
    phone: '', emailPersonal: '', emailSchool: '', 
    cohort: '', faculty: '', major: '', className: ''
  });

  // Section 2: Detailed Profile & Address
  const [profile, setProfile] = useState({
    idCardNumber: '', idCardIssuedDate: '', nation: 'Việt Nam',
    birthPlace: '', ethnicity: '', religion: 'Không',
    province: '', district: '', ward: '', addressDetail: '',
    priorityGroup: 'None'
  });

  // Section 3: Emergency Contacts
  const [contacts, setContacts] = useState([
    { fullName: '', relationship: '', phone: '', address: '', isPrimary: true }
  ]);

  // Section 4 & 5: Dorm Registration & Priority
  const [roomTypeOptions, setRoomTypeOptions] = useState<any[]>([]);
  const [dormRegistration, setDormRegistration] = useState({
    roomTypeId: '', semester: 'HK1-2024'
  });
  const [priorityFile, setPriorityFile] = useState<File | null>(null);

  // --- VIETNAM PROVINCES API LOGIC ---
  const [provincesList, setProvincesList] = useState<any[]>([]);
  const [districtsList, setDistrictsList] = useState<any[]>([]);
  const [wardsList, setWardsList] = useState<any[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvincesList(data))
      .catch(err => console.error(err));

    fetch(`${API_BASE}/rooms/room-types`)
      .then(res => res.json())
      .then(data => {
         setRoomTypeOptions(data);
         if (data.length > 0) setDormRegistration(prev => ({ ...prev, roomTypeId: String(data[0].roomTypeId) }));
      })
      .catch(err => console.error(err));
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
        .then(res => res.json())
        .then(data => {
          setDistrictsList(data.districts || []);
          setWardsList([]);
        })
        .catch(err => console.error(err));
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
        .then(res => res.json())
        .then(data => setWardsList(data.wards || []))
        .catch(err => console.error(err));
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

  // --- FACULTY / MAJOR HANDLER ---
  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const faculty = e.target.value;
    setBasic({ ...basic, faculty, major: '' });
  };

  const availableMajors = FACULTIES_AND_MAJORS[basic.faculty] || [];

  // --- CONTACTS & UTILS ---
  const addContact = () => {
    setContacts([...contacts, { fullName: '', relationship: '', phone: '', address: '', isPrimary: false }]);
  };

  const removeContact = (index: number) => {
    const updated = [...contacts];
    updated.splice(index, 1);
    setContacts(updated);
  };

  const handeContactChange = (index: number, field: string, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Dung lượng tệp tải lên phải nhỏ hơn 5MB');
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
         throw new Error('Vui lòng tải lên file minh chứng nếu bạn thuộc diện ưu tiên.');
      }

      const formData = new FormData();
      formData.append('student_code', basic.studentCode);
      formData.append('room_type', dormRegistration.roomTypeId); // send ID as room_type temp
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
      if (!res.ok) {
        throw new Error(responseData.message || 'Gửi đơn đăng ký thất bại. Vui lòng kiểm tra lại!');
      }
      
      setSuccess('Đơn đăng ký của bạn đã được gửi thành công và đang chờ xét duyệt!');
      window.scrollTo(0, 0);
      
      setTimeout(() => {
        router.push('/');
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      window.scrollTo(0, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const InputClass = "w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all";
  const SelectClass = "w-full bg-surface-container-lowest border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";
  const LabelClass = "text-[0.75rem] font-semibold text-on-surface-variant uppercase tracking-wider block mb-1";

  // Compute Active Step purely for visuals (you can make it interactive if needed)
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans">
      {/* TopNavBar */}
      <nav className="bg-[#faf8ff] dark:bg-slate-950 sticky top-0 z-50 shadow-sm border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-bold tracking-tight text-[#1E3A8A] dark:text-blue-400">
            QLKTX
          </div>
          <div className="hidden md:flex items-center gap-8 font-be-vietnam text-sm font-medium">
            <Link href="/" className="text-slate-600 dark:text-slate-400 hover:text-[#1E3A8A] hover:bg-[#e3e1e9]/50 px-3 py-1.5 rounded-lg transition-colors">Trang chủ</Link>
            <span className="text-slate-600 dark:text-slate-400 cursor-pointer hover:text-[#1E3A8A] transition-colors">Hướng dẫn</span>
            <span className="text-slate-600 dark:text-slate-400 cursor-pointer hover:text-[#1E3A8A] transition-colors">Liên hệ</span>
            <Link href="/login" className="bg-primary text-on-primary px-6 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
              Đăng nhập
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pb-12">
        {/* Hero Title */}
        <section className="w-full bg-surface-container-low pt-12 pb-6 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">Đăng ký nội trú</h1>
            <p className="text-on-surface-variant text-md">Hệ thống xét duyệt và xếp phòng tự động cho sinh viên</p>
          </div>
        </section>

        {/* Sticky Progress Indicator */}
        <div className="sticky top-[68px] z-40 bg-surface/80 backdrop-blur-md py-6 px-4 border-b border-outline-variant/10">
          <div className="max-w-3xl mx-auto relative flex justify-between items-center px-4 sm:px-10">
            <div aria-hidden="true" className="absolute inset-0 flex items-center px-12 sm:px-16">
              <div className="w-full h-0.5 bg-surface-variant rounded-full"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg ring-4 ring-surface">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Cá nhân</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg ring-4 ring-surface">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Học tập</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-surface-variant flex items-center justify-center text-on-surface-variant ring-4 ring-surface">
                <span className="material-symbols-outlined text-xl">bed</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hidden sm:block">Chọn phòng</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-surface-variant flex items-center justify-center text-on-surface-variant ring-4 ring-surface">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hidden sm:block">Xác nhận</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
          
          {error && (
            <div className="mb-8 bg-error-container/30 border border-error/20 rounded-2xl p-4 flex gap-3 items-center">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-on-error-container text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-5 flex gap-3 items-center shadow-lg shadow-green-100">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-green-700">check_circle</span>
              </div>
              <div>
                <p className="text-green-800 font-bold mb-1">Thành công!</p>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* SECTION 1: Thông tin cá nhân */}
            <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-[32px] shadow-sm ring-1 ring-outline-variant/10">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/10 pb-4">
                <span className="material-symbols-outlined text-primary text-2xl">contact_page</span>
                <h2 className="text-xl font-bold text-primary tracking-tight">Bước 1: Thông tin cá nhân & Địa chỉ</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={LabelClass}>Họ và tên *</label>
                  <input required className={InputClass} placeholder="NGUYỄN VĂN A" value={basic.fullName} onChange={e => setBasic({...basic, fullName: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Mã Số Sinh Viên *</label>
                  <input required pattern="^SV\d{6}$" title="Format: SV123456" className={InputClass} placeholder="SV123456" value={basic.studentCode} onChange={e => setBasic({...basic, studentCode: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Ngày sinh *</label>
                  <input required type="date" className={InputClass} value={basic.dob} onChange={e => setBasic({...basic, dob: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Giới tính *</label>
                  <div className="flex gap-4 py-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="gender" className="text-primary focus:ring-primary scale-125" checked={basic.gender === 'Nam'} onChange={() => setBasic({...basic, gender: 'Nam'})}/>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">Nam</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="gender" className="text-primary focus:ring-primary scale-125" checked={basic.gender === 'Nữ'} onChange={() => setBasic({...basic, gender: 'Nữ'})} />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">Nữ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="gender" className="text-primary focus:ring-primary scale-125" checked={basic.gender === 'Khác'} onChange={() => setBasic({...basic, gender: 'Khác'})} />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">Khác</span>
                    </label>
                  </div>
                </div>
                
                {/* ID Card Fields */}
                <div>
                  <label className={LabelClass}>Số CCCD/CMND *</label>
                  <input required type="text" className={InputClass} value={profile.idCardNumber} onChange={e => setProfile({...profile, idCardNumber: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Ngày Cấp Tẻ CCCD *</label>
                  <input required type="date" className={InputClass} value={profile.idCardIssuedDate} onChange={e => setProfile({...profile, idCardIssuedDate: e.target.value})} />
                </div>
                
                <div>
                  <label className={LabelClass}>Số điện thoại *</label>
                  <input required type="tel" className={InputClass} value={basic.phone} onChange={e => setBasic({...basic, phone: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Nơi Sinh *</label>
                  <input required type="text" className={InputClass} value={profile.birthPlace} onChange={e => setProfile({...profile, birthPlace: e.target.value})} />
                </div>

                {/* Optional Demographics */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className={LabelClass}>Dân tộc</label>
                      <input type="text" className={InputClass} value={profile.ethnicity} onChange={e => setProfile({...profile, ethnicity: e.target.value})} placeholder="Kinh" />
                   </div>
                   <div>
                      <label className={LabelClass}>Tôn giáo</label>
                      <input type="text" className={InputClass} value={profile.religion} onChange={e => setProfile({...profile, religion: e.target.value})} placeholder="Không" />
                   </div>
                </div>
                <div>
                   <label className={LabelClass}>Quốc tịch</label>
                   <input required type="text" className={InputClass} value={profile.nation} onChange={e => setProfile({...profile, nation: e.target.value})} />
                </div>
                
                <div className="md:col-span-2">
                  <label className={LabelClass}>Email sinh viên & Cá nhân *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input required type="email" className={InputClass} placeholder="sv_2024@university.edu.vn" value={basic.emailSchool} onChange={e => setBasic({...basic, emailSchool: e.target.value})} />
                    <input required type="email" className={InputClass} placeholder="Email cá nhân (Gmail...)" value={basic.emailPersonal} onChange={e => setBasic({...basic, emailPersonal: e.target.value})} />
                  </div>
                </div>

                {/* Sub: Vietnam Location Selection */}
                <div className="md:col-span-2 border-t border-outline-variant/10 pt-6 mt-2">
                   <h3 className="text-sm font-bold text-on-surface mb-4">Địa chỉ thường trú</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className={LabelClass}>Tỉnh / Thành</label>
                        <select required className={SelectClass + " bg-surface"} value={selectedProvinceCode} onChange={handleProvinceChange}>
                          <option value="">-- Chọn --</option>
                          {provincesList.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LabelClass}>Quận / Huyện</label>
                        <select required disabled={!selectedProvinceCode} className={SelectClass + " bg-surface disabled:opacity-50"} value={selectedDistrictCode} onChange={handleDistrictChange}>
                          <option value="">-- Chọn --</option>
                          {districtsList.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LabelClass}>Phường / Xã</label>
                        <select required disabled={!selectedDistrictCode} className={SelectClass + " bg-surface disabled:opacity-50"} value={selectedWardCode} onChange={handleWardChange}>
                          <option value="">-- Chọn --</option>
                          {wardsList.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                        </select>
                      </div>
                   </div>
                   <div>
                      <label className={LabelClass}>Chi tiết số nhà / đường</label>
                      <textarea required className={InputClass + " resize-none"} rows={2} placeholder="Số nhà, khu phố..." value={profile.addressDetail} onChange={e => setProfile({...profile, addressDetail: e.target.value})} />
                   </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: Thông tin học tập */}
            <div className="bg-surface-container-low p-6 sm:p-10 rounded-[32px] border border-outline-variant/10">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/20 pb-4">
                <span className="material-symbols-outlined text-primary text-2xl">school</span>
                <h2 className="text-xl font-bold text-primary tracking-tight">Bước 2: Thông tin học tập</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={LabelClass}>Trường / Khoa *</label>
                  <select required className={SelectClass} value={basic.faculty} onChange={handleFacultyChange}>
                    <option value="">-- Chọn Khoa Viện --</option>
                    {Object.keys(FACULTIES_AND_MAJORS).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Ngành học *</label>
                  <select required className={SelectClass} disabled={!basic.faculty} value={basic.major} onChange={e => setBasic({...basic, major: e.target.value})}>
                    <option value="">-- Chọn Ngành --</option>
                    {availableMajors.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Khóa học (Cohort) *</label>
                  <input required type="text" className={InputClass} placeholder="K63, Cohort 19..." value={basic.cohort} onChange={e => setBasic({...basic, cohort: e.target.value})} />
                </div>
                <div>
                  <label className={LabelClass}>Lớp quản lý *</label>
                  <input required type="text" className={InputClass} placeholder="vd: IT1-02" value={basic.className} onChange={e => setBasic({...basic, className: e.target.value})} />
                </div>
              </div>
            </div>

            {/* SECTION 3: Liên hệ Khẩn Cấp (Crafted addition) */}
            <div className="bg-surface-container-highest p-6 sm:p-10 rounded-[32px] ring-1 ring-surface-variant/50">
              <div className="flex items-center justify-between border-b border-on-surface-variant/20 mb-8 pb-4">
                 <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">family_restroom</span>
                    <h2 className="text-xl font-bold text-on-surface-variant tracking-tight">Bước 3: Người liên hệ khẩn cấp</h2>
                 </div>
                 <button type="button" onClick={addContact} className="flex items-center text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary-fixed/50 px-4 py-2 rounded-xl transition-colors shrink-0">
                   <span className="material-symbols-outlined text-sm mr-1">add</span> Add
                 </button>
              </div>
              
              <div className="space-y-6">
                 {contacts.map((contact, index) => (
                   <div key={index} className="bg-surface border border-outline-variant/30 rounded-2xl p-5 relative overflow-hidden group">
                      {contacts.length > 1 && (
                        <button type="button" onClick={() => removeContact(index)} className="absolute top-3 right-3 text-error hover:bg-error-container p-2 rounded-xl transition-colors" title="Xóa">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                      <h3 className="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-widest pl-2 border-l-4 border-primary"># {index + 1} {contact.isPrimary && '(Chính)'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={LabelClass}>Họ và tên *</label>
                          <input required className={InputClass} value={contact.fullName} onChange={e => handeContactChange(index, 'fullName', e.target.value)} />
                        </div>
                        <div>
                          <label className={LabelClass}>Mối quan hệ *</label>
                          <input required className={InputClass} placeholder="Bố, Mẹ, Anh..." value={contact.relationship} onChange={e => handeContactChange(index, 'relationship', e.target.value)} />
                        </div>
                        <div>
                          <label className={LabelClass}>Số điện thoại *</label>
                          <input required type="tel" className={InputClass} value={contact.phone} onChange={e => handeContactChange(index, 'phone', e.target.value)} />
                        </div>
                        <div>
                          <label className={LabelClass}>Địa chỉ liên lạc *</label>
                          <input required type="text" className={InputClass} placeholder="Địa chỉ hiện tại..." value={contact.address} onChange={e => handeContactChange(index, 'address', e.target.value)} />
                        </div>
                      </div>
                   </div>
                 ))}
                 <p className="text-xs text-on-surface-variant opacity-80 pl-2">Thông tin liên lạc sẽ được dùng trong các trường hợp ốm đau, sự cố tại KTX.</p>
              </div>
            </div>

            {/* SECTION 4: Chọn phòng & Ưu tiên */}
            <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-[32px] shadow-sm ring-1 ring-outline-variant/10">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/10 pb-4">
                <span className="material-symbols-outlined text-primary text-2xl">bed</span>
                <h2 className="text-xl font-bold text-primary tracking-tight">Bước 4: Nhu cầu Dịch vụ</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={LabelClass}>Loại phòng mong muốn *</label>
                  <select required className={SelectClass} value={dormRegistration.roomTypeId} onChange={e => setDormRegistration({...dormRegistration, roomTypeId: e.target.value})}>
                    {roomTypeOptions.length === 0 && <option value="">Đang tải...</option>}
                    {roomTypeOptions.map(t => (
                      <option key={t.roomTypeId} value={t.roomTypeId}>
                        {t.name} (Sức chứa: {t.capacity}) - {Number(t.monthlyPrice).toLocaleString()} đ/tháng
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Học kỳ đăng ký *</label>
                  <select required className={SelectClass} value={dormRegistration.semester} onChange={e => setDormRegistration({...dormRegistration, semester: e.target.value})}>
                    <option value="HK1-2024">Học kỳ 1 - 2024-2025</option>
                    <option value="HK2-2024">Học kỳ 2 - 2024-2025</option>
                  </select>
                </div>
                <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-outline-variant/30">
                  <label className={LabelClass}>Đối tượng Ưu tiên (Nếu có)</label>
                  <select className={SelectClass} value={profile.priorityGroup} onChange={e => setProfile({...profile, priorityGroup: e.target.value})}>
                    <option value="None">Không có (Chế độ thường)</option>
                    <option value="Priority 1">Ưu tiên 1 (Con liệt sĩ, TB/BB)</option>
                    <option value="Priority 2">Ưu tiên 2 (Người dân tộc thiểu số vùng 3)</option>
                    <option value="Priority 3">Ưu tiên 3 (Hộ nghèo, mồ côi cả cha lẫn mẹ)</option>
                    <option value="Priority 4">Ưu tiên 4 (Sinh viên khuyết tật)</option>
                  </select>
                </div>

                {profile.priorityGroup !== 'None' && (
                  <div className="md:col-span-2">
                    <label className={LabelClass}>Tải lên Minh chứng (BB, JPG/PDF &lt; 5MB) *</label>
                    <div className="border border-dashed border-outline-variant bg-surface-container-low rounded-2xl px-6 py-8 flex flex-col items-center justify-center relative hover:bg-surface-container transition-colors">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">cloud_upload</span>
                        <input required type="file" accept=".png,.jpg,.jpeg,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                        <p className="text-sm font-bold text-primary">{priorityFile ? priorityFile.name : 'Nhấn để chọn file minh chứng'}</p>
                        <p className="text-[10px] text-on-surface-variant mt-2 text-center max-w-sm">Tài liệu giúp Ban quản lý xét duyệt ưu tiên xếp phòng. Đảm bảo rõ nét, đóng dấu giáp lai hợp lệ.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5: Xác nhận */}
            <div className="bg-surface-container p-6 sm:p-10 rounded-[32px]">
              <div className="flex items-center gap-3 mb-8 border-b border-on-surface-variant/10 pb-4">
                <span className="material-symbols-outlined text-primary text-2xl">verified</span>
                <h2 className="text-xl font-bold text-primary tracking-tight">Bước 5: Xác nhận & Gửi đơn</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-surface/50 rounded-2xl space-y-4 text-sm shadow-sm">
                  <div className="flex justify-between border-b border-outline-variant/10 pb-3">
                    <span className="text-on-surface-variant">Họ tên & MSSV:</span>
                    <span className="font-bold text-on-surface truncate">{basic.fullName || '---'} {basic.studentCode ? `- ${basic.studentCode}` : ''}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/10 pb-3">
                    <span className="text-on-surface-variant">Trường/Khoa:</span>
                    <span className="font-bold text-on-surface max-w-xs text-right truncate">{basic.faculty || '---'} {basic.major ? `(${basic.major})` : ''}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-on-surface-variant">Loại Phòng Đăng ký:</span>
                    <span className="font-bold text-on-surface text-right">{roomTypeOptions.find(t => t.roomTypeId == dormRegistration.roomTypeId)?.name || '...'} (Học kỳ {dormRegistration.semester.replace('-2024', '')})</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <input required id="terms" type="checkbox" className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"/>
                  <label htmlFor="terms" className="text-sm leading-relaxed text-on-surface-variant cursor-pointer select-none">
                    Tôi cam kết các thông tin khai báo trên là chính xác (bao gồm thông tin cá nhân và đối tượng ưu tiên) và đồng ý tuân thủ nội quy chung của ký túc xá QLKTX. Tôi hiểu rằng việc khai báo sai sự thật sẽ dẫn đến việc hủy bỏ đơn đăng ký và chịu kỷ luật theo quy định.
                  </label>
                </div>
                
                <button disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary-container disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-1 text-white py-5 rounded-[20px] font-bold text-lg flex items-center justify-center gap-3 transition-all">
                   {isLoading ? 'Đang mã hóa dữ liệu...' : 'Nộp Đơn Đăng Ký Chính Thức'}
                   {!isLoading && <span className="material-symbols-outlined text-white">send</span>}
                </button>
                
                <p className="text-center text-xs text-on-surface-variant opacity-80">
                  Kết quả xét duyệt sẽ được thông báo qua Hệ thống và gửi song song về email sinh viên sau 3-5 ngày làm việc.
                </p>
              </div>
            </div>

          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#c5c5d3]/20 bg-[#faf8ff] dark:bg-slate-950 mt-auto">
        <div className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <div className="font-be-vietnam text-xs text-slate-500 text-center md:text-left">
            © 2024 Hệ thống Quản lý Ký túc xá QLKTX.<br className="md:hidden"/> All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="font-be-vietnam text-xs text-slate-500 hover:text-[#1E3A8A] underline decoration-[#1E3A8A]/30 transition-all duration-200">Quy định KTX</a>
            <a href="#" className="font-be-vietnam text-xs text-slate-500 hover:text-[#1E3A8A] underline decoration-[#1E3A8A]/30 transition-all duration-200">Bảo mật dữ liệu</a>
            <a href="#" className="font-be-vietnam text-xs text-slate-500 hover:text-[#1E3A8A] underline decoration-[#1E3A8A]/30 transition-all duration-200">Hỗ trợ kỹ thuật</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
