import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSMTPConnection() {
  console.log('Testing SMTP connection...');
  console.log('SMTP Settings:');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`Secure: ${process.env.SMTP_SECURE}`);
  console.log(`Password: ${process.env.SMTP_PASS ? 'Set (hidden)' : 'Not set'}`);

  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      logger: true,
      debug: true
    });

    // Verify connection
    console.log('Verifying connection...');
    const verifyResult = await transporter.verify();
    console.log('Connection verified:', verifyResult);

    // Send a test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"SWOC Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: 'SMTP Test Email',
      text: 'This is a test email to verify SMTP settings.',
      html: '<p>This is a test email to verify SMTP settings.</p>',
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info) || 'No preview URL available');
    
    return true;
  } catch (error) {
    console.error('Error testing SMTP connection:', error);
    return false;
  }
}

// Run the test
testSMTPConnection()
  .then(success => {
    console.log('Test completed with status:', success ? 'SUCCESS' : 'FAILURE');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 