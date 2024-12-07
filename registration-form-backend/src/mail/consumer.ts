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
