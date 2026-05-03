export interface UseSendConfig {
  apiKey: string;
  baseUrl: string;
  fromEmail: string;
}

export class UseSendClient {
  private config: UseSendConfig;

  constructor(config: UseSendConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Ensure no trailing slash
    };
  }

  /**
   * Send an email via useSend API
   * @param opts.emailConfiguration - { to, subject, html }
   * @returns {Promise<{ success: boolean; error?: string }>}
   */
  async sendEmail(opts: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { from, to, subject, html } = opts;

      if (!to?.length) {
        return { success: false, error: 'Recipient email is required' };
      }
      if (!subject) {
        return { success: false, error: 'Email subject is required' };
      }
      if (!html) {
        return { success: false, error: 'Email content is required' };
      }

      const response = await fetch(`${this.config.baseUrl}/api/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: opts.from || this.config.fromEmail,
          to,
          subject,
          html,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true };
      }

      return {
        success: false,
        error: data.error || response.statusText,
      };
    } catch (error) {
      console.error('Failed to send email via useSend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}