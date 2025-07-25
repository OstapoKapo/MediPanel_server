import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend: Resend;
    
    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    
    async sendWelcomeEmail(to: string, subject: string, password: string) {
        const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #f9f9f9;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://res.cloudinary.com/dloi5v8zj/image/upload/v1753232213/dashboard-growth_lywkp6.png" alt="MEDIPANEL" style="max-width: 150px;">
            </div>
            <h1 style="color: #2c3e50; text-align: center;">Welcome to MEDIPANEL</h1>
            <p style="text-align:center;">Your temporary password:</p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="background:#007bff;color:#fff;padding:10px 20px;border-radius:6px;font-size:18px;font-weight:bold;">
                    ${password}
                </span>
            </div>
            <p style="text-align:center;color:#555;">Use this password for your first login and then change it for security.</p>
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
                &copy; ${new Date().getFullYear()} MEDIPANEL. All rights reserved.
            </div>
        </div>`; // after deploy add link to login

        const { data, error } = await this.resend.emails.send({
            from: 'Acme <onboarding@resend.dev>',
            to: ['ostapokapo@gmail.com'],
            subject: subject,
            html: html,
        });

        if (error) {
            return console.error({ error });
        }
    console.log({ data });
    }
}