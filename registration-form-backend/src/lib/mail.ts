import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// 加载 .env 配置文件
dotenv.config({ path: '../.env' });

// 使用从配置中获取的邮件设置进行配置
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465, // 或 587
  secure: true, // 使用 SSL
  auth: {
    user: process.env.MAIL_USER, // 邮箱地址
    pass: process.env.MAIL_PASS, // 邮箱密码或授权码
  },
});

console.log(process.env.MAIL_USER)
export const sendMail = async (to: string, subject: string, text: string, htmlContent?: string) => {
  const mailOptions = {
    from: process.env.MAIL_USER, // 发件人
    to: to,
    subject: subject,
    text: text,
    html: htmlContent || `<b>${text}</b>`,  // 如果没有传入 HTML 内容，则使用默认的 HTML 格式
  };

  try {
    // 发送邮件
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
