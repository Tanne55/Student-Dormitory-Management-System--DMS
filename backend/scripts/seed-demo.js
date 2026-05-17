/**
 * Seed du lieu demo cho QLKTX.
 * Chay: node scripts/seed-demo.js
 *
 * Yeu cau: .env phai duoc cau hinh + backend da start lan dau (de TypeORM sync schema).
 *
 * Tao:
 * - 1 admin, 2 staff, 5 sinh vien
 * - 2 toa nha, 6 tang, 12 phong
 * - 5 loai phong (neu chua co)
 * - 3 hop dong active
 * - 3 hoa don thang nay (1 paid, 2 unpaid)
 * - 3 don dang ky pending (cho duyet)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

const DEMO_PASSWORD = 'Demo@2024';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Seeding demo data...\n');
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    await conn.beginTransaction();

    // ===== 1. ROOM TYPES =====
    console.log('-> Room types...');
    await conn.query(`
      INSERT IGNORE INTO room_types (name, capacity, monthly_price, created_at, updated_at) VALUES
      ('Phong 2 nguoi', 2, 1500000, NOW(), NOW()),
      ('Phong 4 nguoi', 4, 1200000, NOW(), NOW()),
      ('Phong 6 nguoi', 6, 900000, NOW(), NOW()),
      ('Phong 8 nguoi', 8, 700000, NOW(), NOW()),
      ('Phong VIP 1 nguoi', 1, 2500000, NOW(), NOW())
    `);
    const [roomTypes] = await conn.query('SELECT room_type_id, name, capacity FROM room_types ORDER BY room_type_id');
    const rtMap = {};
    for (const rt of roomTypes) rtMap[rt.capacity] = rt.room_type_id;

    // ===== 2. ACCOUNTS =====
    console.log('-> Accounts (admin + 2 staff + 5 students)...');
    const accounts = [
      { username: 'admin', role: 'admin' },
      { username: 'staff01', role: 'staff' },
      { username: 'staff02', role: 'staff' },
      { username: 'SV20240001', role: 'student' },
      { username: 'SV20240002', role: 'student' },
      { username: 'SV20240003', role: 'student' },
      { username: 'SV20240004', role: 'student' },
      { username: 'SV20240005', role: 'student' },
    ];
    for (const a of accounts) {
      await conn.query(
        `INSERT IGNORE INTO accounts (username, password_hash, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', NOW(), NOW())`,
        [a.username, hash, a.role],
      );
    }
    const [accountRows] = await conn.query('SELECT account_id, username, role FROM accounts WHERE username IN (?)', [
      accounts.map((a) => a.username),
    ]);
    const accMap = {};
    for (const r of accountRows) accMap[r.username] = r.account_id;

    // ===== 3. BUILDINGS + FLOORS =====
    console.log('-> Buildings + Floors...');
    const buildings = [
      { id: uuid(), code: 'A1', name: 'Khu A - Toa A1' },
      { id: uuid(), code: 'B2', name: 'Khu B - Toa B2' },
    ];
    for (const b of buildings) {
      await conn.query(
        `INSERT INTO buildings (id, code, name, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [b.id, b.code, b.name, `Cum nha ${b.code} - Truong DH`],
      );
    }
    // Re-fetch to get real IDs if upsert hit existing
    const [buildingRows] = await conn.query('SELECT id, code FROM buildings WHERE code IN (?)', [
      buildings.map((b) => b.code),
    ]);
    const bMap = {};
    for (const r of buildingRows) bMap[r.code] = r.id;

    const floors = [];
    for (const code of ['A1', 'B2']) {
      for (const num of [1, 2, 3]) {
        floors.push({ id: uuid(), buildingId: bMap[code], floorNumber: num, code });
      }
    }
    for (const f of floors) {
      await conn.query(
        `INSERT INTO floors (id, building_id, floor_number, label, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE label=VALUES(label)`,
        [f.id, f.buildingId, f.floorNumber, `Tang ${f.floorNumber} - ${f.code}`],
      );
    }
    // re-fetch floors to know real IDs
    const [floorRows] = await conn.query(
      'SELECT id, building_id, floor_number FROM floors WHERE building_id IN (?)',
      [Object.values(bMap)],
    );
    const fMap = {}; // "A1-1" -> floor.id
    for (const r of floorRows) {
      const code = Object.entries(bMap).find(([_, id]) => id === r.building_id)?.[0];
      fMap[`${code}-${r.floor_number}`] = r.id;
    }

    // ===== 4. ROOMS =====
    console.log('-> Rooms (12 phong)...');
    const rooms = [
      // A1 floor 1: 4 phong
      { floor: 'A1-1', number: '101', rtCap: 4, gender: 'Nam' },
      { floor: 'A1-1', number: '102', rtCap: 4, gender: 'Nam' },
      { floor: 'A1-1', number: '103', rtCap: 6, gender: 'Nam' },
      { floor: 'A1-1', number: '104', rtCap: 2, gender: 'Nam' },
      // A1 floor 2: 3 phong
      { floor: 'A1-2', number: '201', rtCap: 4, gender: 'Nu' },
      { floor: 'A1-2', number: '202', rtCap: 4, gender: 'Nu' },
      { floor: 'A1-2', number: '203', rtCap: 1, gender: 'Nu' },
      // A1 floor 3: 2 phong
      { floor: 'A1-3', number: '301', rtCap: 8, gender: 'Mixed' },
      { floor: 'A1-3', number: '302', rtCap: 6, gender: 'Mixed' },
      // B2 floor 1: 3 phong
      { floor: 'B2-1', number: 'B101', rtCap: 4, gender: 'Nu' },
      { floor: 'B2-1', number: 'B102', rtCap: 4, gender: 'Nam' },
      { floor: 'B2-1', number: 'B103', rtCap: 2, gender: 'Nam' },
    ];
    const roomMap = {};
    for (const r of rooms) {
      const id = uuid();
      await conn.query(
        `INSERT INTO rooms (id, floor_id, room_number, room_type_id, gender, capacity, current_occupancy, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'AVAILABLE', NOW(), NOW())
         ON DUPLICATE KEY UPDATE gender=VALUES(gender)`,
        [id, fMap[r.floor], r.number, rtMap[r.rtCap], r.gender, r.rtCap],
      );
      roomMap[r.number] = id;
    }
    // re-fetch real IDs for rooms (in case upsert hit existing)
    const [roomRows] = await conn.query(
      'SELECT id, room_number, capacity FROM rooms WHERE room_number IN (?)',
      [rooms.map((r) => r.number)],
    );
    for (const r of roomRows) roomMap[r.room_number] = r.id;

    // ===== 5. STUDENTS =====
    console.log('-> Students (5 SV, 3 dang o)...');
    const students = [
      {
        code: 'SV20240001',
        name: 'Nguyen Van An',
        gender: 'Nam',
        phone: '0901111001',
        emailPersonal: 'an.nguyen@gmail.com',
        roomNumber: '101',
        livingStatus: 'LIVING',
      },
      {
        code: 'SV20240002',
        name: 'Tran Thi Binh',
        gender: 'Nu',
        phone: '0901111002',
        emailPersonal: 'binh.tran@gmail.com',
        roomNumber: '201',
        livingStatus: 'LIVING',
      },
      {
        code: 'SV20240003',
        name: 'Le Van Cuong',
        gender: 'Nam',
        phone: '0901111003',
        emailPersonal: 'cuong.le@gmail.com',
        roomNumber: '101',
        livingStatus: 'LIVING',
      },
      {
        code: 'SV20240004',
        name: 'Pham Thi Dung',
        gender: 'Nu',
        phone: '0901111004',
        emailPersonal: 'dung.pham@gmail.com',
        roomNumber: null,
        livingStatus: 'PENDING',
      },
      {
        code: 'SV20240005',
        name: 'Hoang Van Em',
        gender: 'Nam',
        phone: '0901111005',
        emailPersonal: 'em.hoang@gmail.com',
        roomNumber: null,
        livingStatus: 'PENDING',
      },
    ];
    for (const s of students) {
      await conn.query(
        `INSERT INTO students (account_id, student_code, full_name, dob, gender, phone, email_personal, email_school, cohort, faculty, major, class_name, living_status, created_at, updated_at)
         VALUES (?, ?, ?, '2004-05-15', ?, ?, ?, ?, 'K65', 'Khoa Cong nghe thong tin', 'Ky thuat phan mem', 'IT1-01', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), living_status=VALUES(living_status)`,
        [
          accMap[s.code],
          s.code,
          s.name,
          s.gender,
          s.phone,
          s.emailPersonal,
          s.code.toLowerCase() + '@school.edu.vn',
          s.livingStatus,
        ],
      );
    }

    // ===== 6. CONTRACTS + ROOM OCCUPANCY =====
    console.log('-> Contracts (3 active)...');
    const livingStudents = students.filter((s) => s.livingStatus === 'LIVING');
    const roomOccupancy = {};
    const now = new Date();
    for (const s of livingStudents) {
      const contractCode = `HD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${s.code.slice(-3)}`;
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 5, 0).toISOString().slice(0, 10);
      await conn.query(
        `INSERT INTO contracts (id, contract_code, student_code, room_id, start_date, end_date, total_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 7200000, 'ACTIVE', NOW(), NOW())
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [uuid(), contractCode, s.code, roomMap[s.roomNumber], startDate, endDate],
      );
      roomOccupancy[s.roomNumber] = (roomOccupancy[s.roomNumber] || 0) + 1;
    }
    // update room.current_occupancy
    for (const [roomNumber, count] of Object.entries(roomOccupancy)) {
      await conn.query('UPDATE rooms SET current_occupancy = ? WHERE id = ?', [count, roomMap[roomNumber]]);
    }

    // ===== 7. INVOICES =====
    console.log('-> Invoices (3 hoa don thang nay)...');
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 25).toISOString().slice(0, 19).replace('T', ' ');
    const invoiceRooms = ['101', '201']; // 2 phong co SV
    for (let i = 0; i < invoiceRooms.length; i++) {
      const rNum = invoiceRooms[i];
      const isPaid = i === 0; // hoa don dau tien da thu
      const electric = 350000;
      const water = 120000;
      const total = electric + water;
      const invoiceId = uuid();
      await conn.query(
        `INSERT INTO invoices (id, room_id, month, electric_fee, water_fee, total_amount, status, due_date, paid_by, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          invoiceId,
          roomMap[rNum],
          currentMonth,
          electric,
          water,
          total,
          isPaid ? 'PAID' : 'UNPAID',
          dueDate,
          isPaid ? 'SV20240001' : null,
          isPaid ? new Date() : null,
        ],
      );
      if (isPaid) {
        await conn.query(
          `INSERT INTO payments (id, invoice_id, amount, method, status, payer_student_code, paid_at, created_at, updated_at)
           VALUES (?, ?, ?, 'CASH', 'SUCCESS', 'SV20240001', NOW(), NOW(), NOW())`,
          [uuid(), invoiceId, total],
        );
      }
    }

    // ===== 8. DORM REGISTRATIONS (PENDING) =====
    console.log('-> Dorm Registrations (3 don pending)...');
    const pendingApplications = [
      {
        code: 'SV20240010',
        name: 'Vu Thi Lan',
        gender: 'Nu',
        phone: '0902222010',
        email: 'lan.vu@gmail.com',
      },
      {
        code: 'SV20240011',
        name: 'Dang Quoc Manh',
        gender: 'Nam',
        phone: '0902222011',
        email: 'manh.dang@gmail.com',
      },
      {
        code: 'SV20240012',
        name: 'Bui Thu Ngoc',
        gender: 'Nu',
        phone: '0902222012',
        email: 'ngoc.bui@gmail.com',
      },
    ];
    for (const a of pendingApplications) {
      const appData = {
        basic: {
          studentCode: a.code,
          fullName: a.name,
          gender: a.gender,
          dob: '2004-08-20',
          phone: a.phone,
          emailPersonal: a.email,
          emailSchool: a.code.toLowerCase() + '@school.edu.vn',
          faculty: 'Khoa Cong nghe thong tin',
          major: 'Khoa hoc may tinh',
          cohort: 'K65',
          className: 'IT2-03',
        },
        profile: {
          idCardNumber: '0' + Math.floor(Math.random() * 1e11).toString().padStart(11, '0'),
          province: 'Ha Noi',
          district: 'Cau Giay',
          ward: 'Dich Vong',
          addressDetail: 'So 1 duong demo',
          priorityGroup: 'None',
        },
        contacts: [
          {
            fullName: 'Phu huynh ' + a.name,
            relationship: 'Cha',
            phone: '098' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
            address: 'Ha Noi',
            isPrimary: true,
          },
        ],
      };
      await conn.query(
        `INSERT INTO dorm_registrations (id, student_code, application_data, room_type, semester, priority_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'HK1-2024', 'None', 'PENDING', NOW(), NOW())
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [uuid(), a.code, JSON.stringify(appData), rtMap[4]],
      );
    }

    // ===== 9. SYSTEM SETTINGS (gia dien nuoc) =====
    console.log('-> System settings...');
    await conn.query(`
      INSERT INTO system_settings (\`key\`, value, description, created_at, updated_at) VALUES
      ('ELECTRIC_PRICE_PER_KWH', '3500', 'Don gia dien (VND/kWh)', NOW(), NOW()),
      ('WATER_PRICE_PER_M3', '25000', 'Don gia nuoc (VND/m3)', NOW(), NOW())
      ON DUPLICATE KEY UPDATE value=VALUES(value)
    `).catch((e) => {
      console.log('  (system_settings co the chua co bang - bo qua)');
    });

    await conn.commit();
    console.log('\n✅ Seed thanh cong!\n');
    console.log('=== TAI KHOAN DEMO ===');
    console.log(`Mat khau cho TAT CA:  ${DEMO_PASSWORD}`);
    console.log('');
    console.log('Admin:    admin');
    console.log('Staff:    staff01, staff02');
    console.log('SV (ở):   SV20240001, SV20240002, SV20240003');
    console.log('SV (chờ): SV20240004, SV20240005');
    console.log('');
    console.log('Don pending (de duyet trong /staff/dorm-approvals):');
    console.log('  SV20240010, SV20240011, SV20240012');
    console.log('');
    console.log('Phong co SV o: 101 (Nam, 2 nguoi), 201 (Nu, 1 nguoi)');
    console.log(`Hoa don thang ${currentMonth}: phong 101 (PAID), phong 201 (UNPAID)`);
  } catch (e) {
    await conn.rollback();
    console.error('\n❌ Loi seed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
