import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, body: string) {
  if (!accountSid || !authToken || !fromNumber || !client) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
    }
    console.log('Twilio not configured, skipping SMS send in development:', { to, body });
    return { success: true, sid: 'dev-sms-skip' };
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
