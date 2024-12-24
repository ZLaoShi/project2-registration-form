import redisClient from '../lib/redis';
import prisma from '../prisma';
import { sendMail } from '../lib/mail';

const processMailQueue = async () => {
  while (true) {
    try {
      const task = await redisClient.rPop('mailQueue');
      if (!task) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const { mailId, recipient, subject, content, htmlContent } = JSON.parse(task);

      try {
        await sendMail(recipient, subject, content, htmlContent);
        console.log(`Email sent to ${recipient}`);

        await prisma.mail_queue.update({
          where: { id: mailId },
          data: { status: 'sent' },
        });
      } catch (error) {
        console.error('Error sending email:', error);

        await prisma.mail_queue.update({
          where: { id: mailId },
          data: { status: 'failed' },
        });

        await redisClient.lPush('mailQueue', task);
      }
    } catch (error) {
      console.error('Error processing mail queue:', error);
    }
  }
};

export const startMailConsumer = () => {
  processMailQueue();
};


// import redisClient from '../lib/redis';
// import prisma from '../prisma';
// import { sendMail } from '../lib/mail';

// const MAX_RETRIES = 5; // 最大重试次数
// const MAIL_QUEUE = 'mailQueue'; // 队列名称

// const processMailQueue = async () => {
//   console.log('Mail consumer started...');
//   while (true) {
//     try {
//       // 使用 BLPOP 阻塞等待任务
//       const taskResult = await redisClient.blPop(MAIL_QUEUE, 0); // 阻塞直到有任务到达
//       const task = taskResult[1]; // 队列返回结果 [队列名, 任务]

//       const { mailId, recipient, subject, content, htmlContent, retries = 0 } = JSON.parse(task);

//       try {
//         // 发送邮件
//         await sendMail(recipient, subject, content, htmlContent);
//         console.log(`Email successfully sent to ${recipient}`);

//         // 更新任务状态为 sent
//         await prisma.mail_queue.update({
//           where: { id: mailId },
//           data: { status: 'sent' },
//         });
//       } catch (error) {
//         console.error(`Failed to send email to ${recipient}:`, error);

//         if (retries >= MAX_RETRIES) {
//           // 超过重试次数，标记为永久失败
//           console.error(`Mail task ${mailId} reached max retries. Marking as failed permanently.`);
//           await prisma.mail_queue.update({
//             where: { id: mailId },
//             data: { status: 'failed_permanently' },
//           });
//         } else {
//           // 增加重试计数并重新入队
//           const updatedTask = { ...JSON.parse(task), retries: retries + 1 };
//           await redisClient.lPush(MAIL_QUEUE, JSON.stringify(updatedTask));
//           console.log(`Retrying mail task ${mailId}. Retry count: ${retries + 1}`);
//         }
//       }
//     } catch (error) {
//       console.error('Error processing mail queue:', error);
//     }
//   }
// };

// export const startMailConsumer = () => {
//   processMailQueue();
// };
