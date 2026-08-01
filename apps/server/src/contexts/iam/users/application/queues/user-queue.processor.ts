import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { USER_QUEUE, USER_JOBS } from './user-queue.constants';

interface UserQueueJobData {
  email: string;
  resetUrl?: string;
  verificationUrl?: string;
  // Do BullmqQueueAdapter gắn vào; cho phép nối log của worker với HTTP
  // request đã kích hoạt job này.
  correlationId?: string;
}

interface UserQueueJobResult {
  sent: boolean;
  email: string;
}

@Processor(USER_QUEUE)
export class UserQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(UserQueueProcessor.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    super();
    const mailEnabled = this.configService.get<boolean>('MAIL_ENABLED', false);
    this.transporter = mailEnabled
      ? nodemailer.createTransport({
          host: this.configService.get<string>('MAIL_HOST', 'localhost'),
          port: Number(this.configService.get<number>('MAIL_PORT', 1025)),
          secure: false,
          tls: {
            rejectUnauthorized: false,
          },
        })
      : null;
  }

  async process(
    job: Job<UserQueueJobData, UserQueueJobResult, string>,
  ): Promise<UserQueueJobResult> {
    this.logger.log({
      message: `Processing job ${job.id} of type ${job.name}`,
      jobId: job.id,
      jobName: job.name,
      correlationId: job.data.correlationId,
    });
    const fromEmail = this.configService.get<string>(
      'MAIL_FROM',
      'no-reply@turbostarter.dev',
    );

    switch (job.name) {
      case USER_JOBS.SEND_WELCOME_EMAIL: {
        const { email } = job.data;
        if (!this.transporter) {
          this.logger.log('[Worker] Welcome email skipped: MAIL_ENABLED=false');
          return { sent: false, email };
        }
        this.logger.log('[Worker] Sending welcome email...');

        const welcomeHtml = `
                    <div style="background-color: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px border #27272a;">
                        <h2 style="color: #3b82f6; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 16px;">Chào mừng tới Turborepo Starter Kit! 🎉</h2>
                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">Tài khoản của bạn với email <strong>${email}</strong> đã được khởi tạo thành công trên hệ thống quản trị.</p>
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #e4e4e7;">Bây giờ bạn đã có quyền truy cập vào bảng quản trị và quản lý các tài nguyên hệ thống.</p>
                        </div>
                        <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
                    </div>
                `;

        await this.transporter.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Chào mừng thành viên mới - Turborepo Advanced Starter',
          html: welcomeHtml,
        });

        this.logger.log(
          `[Worker] Welcome email successfully sent to ${email}!`,
        );
        return { sent: true, email };
      }
      case USER_JOBS.SEND_DEACTIVATION_EMAIL: {
        const { email } = job.data;
        if (!this.transporter) {
          this.logger.log(
            '[Worker] Deactivation email skipped: MAIL_ENABLED=false',
          );
          return { sent: false, email };
        }
        this.logger.log('[Worker] Sending account deactivation alert...');

        const alertHtml = `
                    <div style="background-color: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444;">
                        <h2 style="color: #ef4444; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 16px;">Cảnh báo bảo mật: Tài khoản bị vô hiệu hóa ⚠️</h2>
                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">Tài khoản <strong>${email}</strong> của bạn đã bị tạm khóa bởi quản trị viên hệ thống.</p>
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #fecaca; line-height: 1.5;">Toàn bộ các phiên hoạt động (active sessions) của bạn đã bị thu hồi. Bạn sẽ không thể đăng nhập hoặc thao tác cho tới khi tài khoản được mở khóa.</p>
                        </div>
                        <p style="font-size: 14px; color: #a1a1aa;">Nếu cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.</p>
                        <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
                    </div>
                `;

        await this.transporter.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Thông báo: Tài khoản của bạn đã bị khóa',
          html: alertHtml,
        });

        this.logger.log(
          `[Worker] Account deactivation email sent to ${email}.`,
        );
        return { sent: true, email };
      }
      case USER_JOBS.SEND_PASSWORD_RESET_EMAIL: {
        const { email, resetUrl } = job.data;
        if (!resetUrl)
          throw new Error('Password reset job is missing resetUrl');
        if (!this.transporter) {
          this.logger.log(
            '[Worker] Password reset email skipped: MAIL_ENABLED=false',
          );
          return { sent: false, email };
        }

        await this.transporter.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Đặt lại mật khẩu',
          text: `Mở liên kết này để đặt lại mật khẩu. Liên kết hết hạn sau 30 phút và chỉ dùng được một lần: ${resetUrl}`,
          html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu.</p><p><a href="${resetUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">Đặt lại mật khẩu</a></p><p>Liên kết hết hạn sau 30 phút và chỉ dùng được một lần. Nếu bạn không gửi yêu cầu này, hãy bỏ qua email.</p>`,
        });
        this.logger.log(`[Worker] Password reset email sent to ${email}.`);
        return { sent: true, email };
      }
      case USER_JOBS.SEND_EMAIL_VERIFICATION: {
        const { email, verificationUrl } = job.data;
        if (!verificationUrl) {
          throw new Error('Email verification job is missing verificationUrl');
        }
        if (!this.transporter) {
          this.logger.log(
            '[Worker] Email verification skipped: MAIL_ENABLED=false',
          );
          return { sent: false, email };
        }
        const safeUrl = verificationUrl
          .replaceAll('&', '&amp;')
          .replaceAll('"', '&quot;');
        await this.transporter.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Xác minh địa chỉ email',
          text: `Mở liên kết này để xác minh email. Liên kết hết hạn sau 24 giờ và chỉ dùng được một lần: ${verificationUrl}`,
          html: `<p>Hãy xác minh địa chỉ email để hoàn tất đăng ký.</p><p><a href="${safeUrl}">Xác minh email</a></p><p>Liên kết hết hạn sau 24 giờ và chỉ dùng được một lần.</p>`,
        });
        this.logger.log('[Worker] Email verification sent.');
        return { sent: true, email };
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Job name ${job.name} not supported`);
      }
    }
  }
}
