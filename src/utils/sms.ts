import Twilio from 'twilio';
import { twilioConfig } from '../config/sms';

const client = Twilio(twilioConfig.accountSid, twilioConfig.authToken);

/**
 * Send an SMS to a user.
 *
 * @param to       E.164 format e.g. "+201XXXXXXXXX"
 * @param body     Text content
 */
export async function sendSms(to: string, body: string): Promise<any> {
  return client.messages.create({
    body,
    from: twilioConfig.fromNumber,
    to,
  });
}
