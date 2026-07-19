import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { USER_QUEUE, USER_JOBS } from './user-queue.constants';

@Processor(USER_QUEUE)
export class UserQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(UserQueueProcessor.name);
    private readonly transporter: nodemailer.Transporter;

    constructor(
        private readonly configService: ConfigService,
    ) {
        super();
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('MAIL_HOST', 'localhost'),
            port: Number(this.configService.get<number>('MAIL_PORT', 1025)),
            secure: false,
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
        const fromEmail = this.configService.get<string>('MAIL_FROM', 'no-reply@turbostarter.dev');

        switch (job.name) {
            case USER_JOBS.SEND_WELCOME_EMAIL: {
                const { email } = job.data;
                this.logger.log(`[Worker] Sending welcome email to ${email}...`);

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

                this.logger.log(`[Worker] Welcome email successfully sent to ${email}!`);
                return { sent: true, email };
            }
            case USER_JOBS.SEND_DEACTIVATION_EMAIL: {
                const { email } = job.data;
                this.logger.log(`[Worker] Sending account deactivation alert to ${email}...`);

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

                this.logger.log(`[Worker] Account deactivation email sent to ${email}.`);
                return { sent: true, email };
            }
            default: {
                this.logger.warn(`Unknown job name: ${job.name}`);
                throw new Error(`Job name ${job.name} not supported`);
            }
        }
    }
}
