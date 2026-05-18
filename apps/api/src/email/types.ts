export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendMailInput extends EmailMessage {
  from?: string;
}

export interface EmailAdapter {
  sendMail(message: SendMailInput): Promise<void>;
}
