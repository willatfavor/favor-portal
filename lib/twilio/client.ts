import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function sendSMS(to: string, body: string) {
  if (!accountSid || !authToken || !fromNumber) {
    console.log('Twilio not configured, would send SMS:', { to, body });
    return { success: true, sid: 'mock-sid' };
  }

  try {
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    throw error;
  }
}

export async function sendGiftConfirmationSMS(phone: string, amount: number) {
  const body = `Thank you for your gift of $${amount.toFixed(2)} to Favor International! Your receipt is ready in your portal. - Favor Team`;
  return sendSMS(phone, body);
}

export async function sendEventReminderSMS(phone: string, eventName: string, date: string) {
  const body = `Reminder: ${eventName} is tomorrow at ${date}. We look forward to seeing you! - Favor International`;
  return sendSMS(phone, body);
}
