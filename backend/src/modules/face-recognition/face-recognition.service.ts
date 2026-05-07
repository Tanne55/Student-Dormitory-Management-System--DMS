import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FaceEmbedding } from './entities/face-embedding.entity';
import { AccessLog, AccessDirection } from './entities/access-log.entity';
import { EnrollFaceDto } from './dto/enroll-face.dto';
import { RecognizeFaceDto } from './dto/recognize-face.dto';
import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { Student } from '../students/entities/student.entity';

// Ngưỡng nhận diện: distance < THRESHOLD → khớp
const RECOGNITION_THRESHOLD = 0.5;

@Injectable()
export class FaceRecognitionService {
  constructor(
    @InjectRepository(FaceEmbedding)
    private embeddingRepo: Repository<FaceEmbedding>,
    @InjectRepository(AccessLog)
    private accessLogRepo: Repository<AccessLog>,
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
  ) {}

  // ==================== ENROLLMENT ====================

  async enrollFace(dto: EnrollFaceDto, enrolledByAccountId: number) {
    const student = await this.studentRepo.findOne({ where: { studentCode: dto.studentCode } });
    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên với mã ${dto.studentCode}`);
    }

    let embedding = await this.embeddingRepo.findOne({ where: { studentCode: dto.studentCode } });

    if (embedding) {
      embedding.descriptor = JSON.stringify(dto.descriptor);
      embedding.enrolledBy = enrolledByAccountId;
    } else {
      embedding = this.embeddingRepo.create({
        studentCode: dto.studentCode,
        descriptor: JSON.stringify(dto.descriptor),
        enrolledBy: enrolledByAccountId,
      });
    }

    await this.embeddingRepo.save(embedding);
    return { message: `Đã đăng ký khuôn mặt cho sinh viên ${dto.studentCode} thành công.` };
  }

  async deleteEnrollment(studentCode: string) {
    const embedding = await this.embeddingRepo.findOne({ where: { studentCode } });
    if (!embedding) {
      throw new NotFoundException(`Không tìm thấy khuôn mặt đã đăng ký cho sinh viên ${studentCode}`);
    }
    await this.embeddingRepo.remove(embedding);
    return { message: `Đã xóa khuôn mặt của sinh viên ${studentCode}.` };
  }

  async getEnrolledStudents() {
    const embeddings = await this.embeddingRepo.find({ order: { createdAt: 'DESC' } });
    const studentCodes = embeddings.map((e) => e.studentCode);

    if (studentCodes.length === 0) return [];

    const students = await this.studentRepo
      .createQueryBuilder('s')
      .where('s.student_code IN (:...codes)', { codes: studentCodes })
      .getMany();

    const studentMap = new Map(students.map((s) => [s.studentCode, s]));

    return embeddings.map((e) => {
      const s = studentMap.get(e.studentCode);
      return {
        studentCode: e.studentCode,
        fullName: s?.fullName ?? null,
        enrolledAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
    });
  }

  // ==================== RECOGNITION ====================

  async recognize(dto: RecognizeFaceDto) {
    const allEmbeddings = await this.embeddingRepo.find();

    if (allEmbeddings.length === 0) {
      return { matched: false, message: 'Chưa có khuôn mặt nào được đăng ký.' };
    }

    let bestMatch: FaceEmbedding | null = null;
    let minDistance = Infinity;

    for (const emb of allEmbeddings) {
      const stored: number[] = JSON.parse(emb.descriptor);
      const dist = this.euclideanDistance(dto.descriptor, stored);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = emb;
      }
    }

    if (!bestMatch || minDistance >= RECOGNITION_THRESHOLD) {
      return { matched: false, distance: minDistance, message: 'Không nhận diện được khuôn mặt.' };
    }

    const student = await this.studentRepo.findOne({ where: { studentCode: bestMatch.studentCode } });
    const confidence = Math.max(0, 1 - minDistance / RECOGNITION_THRESHOLD);

    // Xác định hướng tự động dựa trên log cuối cùng
    const lastLog = await this.accessLogRepo.findOne({
      where: { studentCode: bestMatch.studentCode },
      order: { loggedAt: 'DESC' },
    });
    const suggestedDirection: AccessDirection =
      lastLog?.direction === AccessDirection.IN ? AccessDirection.OUT : AccessDirection.IN;

    return {
      matched: true,
      studentCode: bestMatch.studentCode,
      fullName: student?.fullName ?? null,
      distance: minDistance,
      confidence: parseFloat(confidence.toFixed(4)),
      suggestedDirection,
    };
  }

  // ==================== ACCESS LOGS ====================

  async createLog(dto: CreateAccessLogDto) {
    const log = this.accessLogRepo.create({
      studentCode: dto.studentCode,
      direction: dto.direction,
      confidence: dto.confidence ?? null,
      buildingCode: dto.buildingCode ?? null,
    });
    return await this.accessLogRepo.save(log);
  }

  async getLogs(filters: {
    studentCode?: string;
    buildingCode?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const qb = this.accessLogRepo.createQueryBuilder('log').orderBy('log.logged_at', 'DESC');

    if (filters.studentCode) {
      qb.andWhere('log.student_code = :sc', { sc: filters.studentCode });
    }
    if (filters.buildingCode) {
      qb.andWhere('log.building_code = :bc', { bc: filters.buildingCode });
    }
    if (filters.dateFrom) {
      qb.andWhere('log.logged_at >= :from', { from: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('log.logged_at <= :to', { to });
    }

    const [logs, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Lấy tên sinh viên cho kết quả hiện tại
    const codes = [...new Set(logs.map((l) => l.studentCode))];
    const students =
      codes.length > 0
        ? await this.studentRepo
            .createQueryBuilder('s')
            .where('s.student_code IN (:...codes)', { codes })
            .getMany()
        : [];
    const nameMap = new Map(students.map((s) => [s.studentCode, s.fullName]));

    const data = logs.map((l) => ({
      ...l,
      fullName: nameMap.get(l.studentCode) ?? null,
    }));

    return { data, total, page, limit };
  }

  // ==================== HELPER ====================

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  }
}
