import redisClient from '../lib/redis';
import { sendMail } from '../lib/mail';
import { generateVerificationCode } from '../utils/generateCode';
import snowflake from '../utils/snowflake';
import prisma from '../prisma';

//生成并发送附带验证码的邮件
export const sendVerificationCode = async (email: string) => {
  try {
    // 生成唯一的任务 ID
    const mailId = snowflake.NextId();

    // 生成 6 位随机验证码
    const verificationCode = generateVerificationCode();

    // 将验证码存入 Redis，5 分钟有效期
    await redisClient.setEx(`verificationCode:${email}`, 300, verificationCode);

    // 创建邮件内容
    const subject = 'Your Verification Code';
    const content = `Your verification code is: ${verificationCode}. Please use this code within 5 minutes to complete your registration. For your security, do not share this code with anyone.`;
    const htmlContent = `
      <p>Your verification code is: <strong>${verificationCode}</strong></p>
      <p><b>Note:</b> This code is valid for 5 minutes. Please complete your registration within this time frame.</p>
      <p>For your security, do not share this code with anyone.</p>
    `;

    // 将邮件任务推送到 Redis 队列，并持久化到 SQLite
    await prisma.mail_queue.create({
      data: {
        id: mailId,
        recipient: email,
        subject,
        content,
        status: 'pending',
      },
    });

    // 将邮件任务推送到 Redis 列表中以进行异步发送
    await redisClient.lPush('mailQueue', JSON.stringify({ mailId, recipient: email, subject, content }));

    // 直接发送邮件
    try {
      await sendMail(email, subject, content, htmlContent);
      console.log(`Verification code ${verificationCode} sent to ${email}`);
      // 邮件发送成功，更新数据库中该任务的状态为 sent
      await prisma.mail_queue.update({
        where: { id: mailId },
        data: { status: 'sent' },
      });
    } catch (sendError) {
      console.error('Error sending email:', sendError);
      // 如果发送失败，更新数据库中该任务的状态为 failed
      await prisma.mail_queue.update({
        where: { id: mailId },
        data: { status: 'failed' },
      });
    }

    return { type: 'success' as const, value: { message: 'Verification code sent' } };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return { type: 'error' as const, error: 'Failed to send verification code' };
  }
};

// 生成并发送附带临时用户修改报名状态验证码的邮件
export const sendTemporaryUserRegistrationVerificationCode = async (email: string, queryKey: string) => {
  try {
    // 生成唯一的任务 ID
    const mailId = snowflake.NextId();

    // 生成 6 位随机验证码
    const verificationCode = generateVerificationCode();

    // 将验证码存入 Redis，设置为 1 小时有效期
    const redisKey = `verificationCode:${email}:${queryKey}`;
    await redisClient.setEx(redisKey, 3600, verificationCode); // 1 小时有效期

    // 创建邮件内容
    const subject = 'Verification Code for Updating Registration Status';
    const content = `Your verification code is: ${verificationCode}. This code is valid for 1 hour. Please use this code to update your registration status.`;
    const htmlContent = `
      <p>Your verification code is: <strong>${verificationCode}</strong></p>
      <p>This code is valid for 1 hour. Please use this code to update your registration status.</p>
      <p>For your security, do not share this code with anyone.</p>
    `;

    // 将邮件任务持久化到数据库
    await prisma.mail_queue.create({
      data: {
        id: mailId,
        recipient: email,
        subject,
        content,
        status: 'pending',
      },
    });

    // 推送任务到 Redis 邮件队列
    await redisClient.lPush('mailQueue', JSON.stringify({ mailId, recipient: email, subject, content }));

    // 尝试直接发送邮件
    try {
      await sendMail(email, subject, content, htmlContent);
      console.log(`Verification code ${verificationCode} sent to ${email}`);
      await prisma.mail_queue.update({
        where: { id: mailId },
        data: { status: 'sent' },
      });
    } catch (sendError) {
      console.error('Error sending email:', sendError);
      await prisma.mail_queue.update({
        where: { id: mailId },
        data: { status: 'failed' },
      });
    }

    return { type: 'success' as const, value: { message: 'Verification code sent successfully' } };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return { type: 'error' as const, error: 'Failed to send verification code' };
  }
};


