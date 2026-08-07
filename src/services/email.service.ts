import nodemailer, { type Transporter } from 'nodemailer';

import { config } from '../config';

let transporterPromise: Promise<Transporter> | undefined;

async function createTransporter(): Promise<Transporter> {
  if (config.smtp.host) {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }

  // No SMTP configured: fall back to an Ethereal test account. Mails are not
  // delivered anywhere real; a preview URL is logged for each message.
  const testAccount = await nodemailer.createTestAccount();
  console.log(`Email: using Ethereal test account ${testAccount.user}`);
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

function getTransporter(): Promise<Transporter> {
  transporterPromise ??= createTransporter();
  return transporterPromise;
}

async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: config.smtp.from, to, subject, text });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email sent to ${to} — preview: ${previewUrl}`);
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendMail(
    to,
    'Welcome to Virtual Events',
    `Hi ${name},\n\nYour account has been created successfully. You can now browse events and register for the ones you like.\n\nSee you there!`,
  );
}

export async function sendEventRegistrationEmail(
  to: string,
  name: string,
  event: { title: string; date: string; time: string },
): Promise<void> {
  await sendMail(
    to,
    `Registration confirmed: ${event.title}`,
    `Hi ${name},\n\nYou are registered for "${event.title}" on ${event.date} at ${event.time}.\n\nSee you there!`,
  );
}
