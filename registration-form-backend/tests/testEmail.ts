import { sendMail } from '../src/lib/mail'; // 导入 sendMail 函数

// 测试发送邮件
async function testEmail() {
  try {
    // 发送测试邮件
    await sendMail('2116344865@qq.com', '测试邮件', '这是一封测试邮件。');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 调用测试函数
testEmail();
