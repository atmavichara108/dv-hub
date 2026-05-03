import { UseSendClient } from "../src/lib/useSendClient";

describe("UseSendClient", () => {
  const mockConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.usesend.com",
    fromEmail: "noreply@example.com",
  };

  describe("constructor", () => {
    it("should remove trailing slash from baseUrl", () => {
      const client = new UseSendClient({
        ...mockConfig,
        baseUrl: "https://api.usesend.com/",
      });
      expect((client as any).config.baseUrl).toBe("https://api.usesend.com");
    });

    it("should keep baseUrl unchanged if no trailing slash", () => {
      const client = new UseSendClient(mockConfig);
      expect((client as any).config.baseUrl).toBe("https://api.usesend.com");
    });
  });

  describe("sendEmail", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return success when email sent successfully", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toEqual({ success: true });
    });

    it("should return error when recipient email is missing", async () => {
      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: [] as string[],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toEqual({
        success: false,
        error: "Recipient email is required",
      });
    });

    it("should return error when subject is missing", async () => {
      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: ["test@example.com"],
        subject: "",
        html: "<p>Test content</p>",
      });

      expect(result).toEqual({
        success: false,
        error: "Email subject is required",
      });
    });

    it("should return error when html content is missing", async () => {
      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "",
      });

      expect(result).toEqual({
        success: false,
        error: "Email content is required",
      });
    });

    it("should return error when API returns error", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toEqual({
        success: false,
        error: "Rate limit exceeded",
      });
    });

    it("should return error when fetch throws", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const client = new UseSendClient(mockConfig);
      const result = await client.sendEmail({
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("should use config.fromEmail when opts.from is not provided", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new UseSendClient(mockConfig);
      await client.sendEmail({
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.usesend.com/api/emails",
        expect.objectContaining({
          body: JSON.stringify({
            from: "noreply@example.com",
            to: ["test@example.com"],
            subject: "Test Subject",
            html: "<p>Test content</p>",
          }),
        }),
      );
    });

    it("should use opts.from when provided", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new UseSendClient(mockConfig);
      await client.sendEmail({
        from: "custom@example.com",
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.usesend.com/api/emails",
        expect.objectContaining({
          body: JSON.stringify({
            from: "custom@example.com",
            to: ["test@example.com"],
            subject: "Test Subject",
            html: "<p>Test content</p>",
          }),
        }),
      );
    });
  });
});
