import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Make sure environment variables are loaded
dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private isUsingEthereal: boolean = false;
  
  constructor() {
    this.initialize();
  }
  
  // Method to initialize or reinitialize the email service
  public initialize() {
    // Force reload environment variables
    dotenv.config();
    
    // Log all environment variables related to SMTP for debugging
    logger.info('📧 Email service initialization - Environment variables check', {
      SMTP_HOST: process.env.SMTP_HOST || 'Not set',
      SMTP_PORT: process.env.SMTP_PORT || 'Not set',
      SMTP_USER: process.env.SMTP_USER || 'Not set',
      SMTP_PASS: process.env.SMTP_PASS ? 'Set (value hidden)' : 'Not set',
      SMTP_SECURE: process.env.SMTP_SECURE || 'Not set',
    });
    
    // Check if SMTP settings are in environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
      logger.info('📧 All SMTP settings found, creating real email transporter');
      
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT, 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          debug: process.env.DEBUG === 'true', // Enable debug output
          logger: process.env.DEBUG === 'true', // Log to console
        });
        
        this.isUsingEthereal = false;
        logger.info('📧 Email service initialized with environment variables', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
        });
      } catch (error) {
        logger.error('❌ Failed to create email transporter with SMTP settings', { error: (error as Error).message });
        logger.warn('⚠️ Falling back to Ethereal for testing');
        this.isUsingEthereal = true;
        this.initEtherealTransport();
      }
    } else {
      // No SMTP settings, use ethereal for testing
      this.isUsingEthereal = true;
      logger.warn('⚠️ No SMTP settings found. Using Ethereal for testing only.');
      this.initEtherealTransport();
    }
  }
  
  // Method to check if using Ethereal (for debugging)
  public isUsingEtherealEmail(): boolean {
    return this.isUsingEthereal;
  }
  
  // Method to get SMTP settings (for debugging)
  public getSmtpSettings(): any {
    return {
      host: process.env.SMTP_HOST || 'Not configured',
      port: process.env.SMTP_PORT || 'Not configured',
      user: process.env.SMTP_USER || 'Not configured',
      secure: process.env.SMTP_SECURE || 'Not configured',
      isUsingEthereal: this.isUsingEthereal
    };
  }
  
  private async initEtherealTransport() {
    try {
      // Create a test account at Ethereal
      const testAccount = await nodemailer.createTestAccount();
      
      // Create reusable transporter
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      logger.info('📧 Email service initialized with Ethereal test account', {
        user: testAccount.user,
        preview: `https://ethereal.email/login with ${testAccount.user} / ${testAccount.pass}`,
      });
    } catch (error) {
      logger.error('❌ Failed to create test email account', { error: (error as Error).message });
      throw new Error('Could not initialize email service');
    }
  }
  
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
    try {
      const { to, subject, html, text } = options;
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"SWOC System" <no-reply@swoc.example.com>',
        to,
        subject,
        text: text || '',
        html,
      });
      
      logger.info('📨 Email sent successfully', {
        messageId: info.messageId,
        to,
        subject,
        isUsingEthereal: this.isUsingEthereal
      });
      
      // If using Ethereal, provide a preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info('📧 Email preview URL (test only)', { previewUrl });
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || undefined,
      };
    } catch (error) {
      logger.error('❌ Failed to send email', {
        error: (error as Error).message,
        to: options.to,
        subject: options.subject,
      });
      
      return {
        success: false,
      };
    }
  }
  
  /**
   * Send a welcome email to a new user with their login credentials
   */
  async sendWelcomeEmail(to: string, name: string, password: string): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
    const loginLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'https://swoc-social-listening.example.com/login';
    
    const subject = 'Your Account for SWOC Social Listening is created';
    
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #17254D;">เรียน ${name}</h2>
        
        <p>บัญชีผู้ใช้งานระบบ SWOC Social Listening ของท่านได้ถูกสร้างเรียบร้อยแล้ว</p>
        <p>กรุณาใช้ข้อมูลด้านล่างเพื่อเข้าสู่ระบบ:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>ชื่อผู้ใช้งาน (Username):</strong> ${to}</p>
          <p><strong>รหัสผ่าน (Password):</strong> ${password}</p>
        </div>
        
        <p>คลิกที่ลิงก์ด้านล่างเพื่อเข้าสู่ระบบ:</p>
        <p><a href="${loginLink}" style="display: inline-block; background-color: #42A5F5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">เข้าสู่ระบบ</a></p>
        
        <p style="margin-top: 30px;"><strong>โปรดเปลี่ยนรหัสผ่านของท่านหลังจากเข้าสู่ระบบครั้งแรก</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #777; font-size: 12px;">อีเมลนี้สร้างขึ้นโดยอัตโนมัติ โปรดอย่าตอบกลับ</p>
      </div>
    `;
    
    const text = `
เรียน ${name}

บัญชีผู้ใช้งานระบบ SWOC Social Listening ของท่านได้ถูกสร้างเรียบร้อยแล้ว
กรุณาใช้ข้อมูลด้านล่างเพื่อเข้าสู่ระบบ:

ชื่อผู้ใช้งาน (Username): ${to}
รหัสผ่าน (Password): ${password}

คลิกที่ลิงก์ด้านล่างเพื่อเข้าสู่ระบบ:
${loginLink}

โปรดเปลี่ยนรหัสผ่านของท่านหลังจากเข้าสู่ระบบครั้งแรก

อีเมลนี้สร้างขึ้นโดยอัตโนมัติ โปรดอย่าตอบกลับ
    `;
    
    return this.sendEmail({ to, subject, html, text });
  }
} 