import http from "http";
import { AddressInfo, Server, Socket, createServer } from "net";
import {
  MAX_503_RETRIES,
  retryAfterMs,
  sendWithRetry,
  withConnectTimeout,
} from "./http.helper";

const unavailable = (retryAfter?: string) => ({
  response: {
    status: 503,
    headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
  },
});

describe("http.helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("withConnectTimeout", () => {
    const agentWith = (socket: Socket) => {
      const agent = new http.Agent();
      agent.createConnection = () => socket;
      return withConnectTimeout(agent, 10);
    };

    it("destroys a socket that does not connect in time", () => {
      vi.useFakeTimers();
      const socket = new Socket().on("error", () => {});
      const agent = agentWith(socket);

      agent.createConnection({});
      vi.advanceTimersByTime(10_000);

      expect(socket.destroyed).toBe(true);
    });

    it("names the timeout in the socket error", async () => {
      vi.useFakeTimers();
      const socket = new Socket();
      const error = new Promise<Error>((resolve) => socket.on("error", resolve));
      agentWith(socket).createConnection({});

      vi.advanceTimersByTime(10_000);

      expect((await error).message).toBe("Connection timed out after 10 s");
    });

    it("keeps a socket that connected in time", () => {
      vi.useFakeTimers();
      const socket = new Socket();
      agentWith(socket).createConnection({});

      socket.emit("connect");
      vi.advanceTimersByTime(10_000);

      expect(socket.destroyed).toBe(false);
    });

    describe("with a real server", () => {
      let server: Server;
      let port: number;

      beforeAll(async () => {
        server = createServer((s) => s.end());
        await new Promise<void>((resolve) => server.listen(0, resolve));
        port = (server.address() as AddressInfo).port;
      });

      afterAll(() => new Promise((resolve) => server.close(resolve)));

      it("connects through the wrapped agent", async () => {
        const agent = withConnectTimeout(new http.Agent(), 10);

        const socket = agent.createConnection({ host: "127.0.0.1", port }) as Socket;
        await new Promise((resolve) => socket.once("connect", resolve));
        socket.destroy();

        expect(socket.destroyed).toBe(true);
      });
    });
  });

  describe("retryAfterMs", () => {
    it.each([
      ["5", 5_000],
      ["0", 0],
      [" 2 ", 2_000],
    ])("reads delay-seconds %p", (value, expected) => {
      expect(retryAfterMs(value)).toBe(expected);
    });

    it("reads an HTTP date", () => {
      const now = Date.parse("Mon, 02 Nov 2026 10:00:00 GMT");

      expect(retryAfterMs("Mon, 02 Nov 2026 10:00:07 GMT", now)).toBe(7_000);
    });

    it("treats a past HTTP date as no wait", () => {
      const now = Date.parse("Mon, 02 Nov 2026 10:00:00 GMT");

      expect(retryAfterMs("Mon, 02 Nov 2026 09:00:00 GMT", now)).toBe(0);
    });

    it("caps the wait at 60 s", () => {
      expect(retryAfterMs("3600")).toBe(60_000);
    });

    it.each([undefined, "", "soon", "-1", "1.5", "Mon, 32 Foo 2026 GMT"])(
      "ignores %p",
      (value) => {
        expect(retryAfterMs(value)).toBeUndefined();
      }
    );
  });

  describe("sendWithRetry", () => {
    const sleep = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      sleep.mockClear();
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("returns the first successful response", async () => {
      const send = vi.fn().mockResolvedValueOnce("ok");

      await expect(sendWithRetry(send, sleep)).resolves.toBe("ok");
      expect(send).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it("waits Retry-After and sends again after a 503", async () => {
      const send = vi
        .fn()
        .mockRejectedValueOnce(unavailable("2"))
        .mockResolvedValueOnce("ok");

      await expect(sendWithRetry(send, sleep)).resolves.toBe("ok");
      expect(send).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(2_000);
      expect(console.warn).toHaveBeenCalledWith(
        "VRT: server busy (503), retrying in 2 s (1/3)"
      );
    });

    it(`gives up after ${MAX_503_RETRIES} retries`, async () => {
      const error = unavailable("1");
      const send = vi.fn().mockRejectedValue(error);

      await expect(sendWithRetry(send, sleep)).rejects.toBe(error);
      expect(send).toHaveBeenCalledTimes(MAX_503_RETRIES + 1);
    });

    it("does not retry a 503 without Retry-After", async () => {
      const error = unavailable();
      const send = vi.fn().mockRejectedValue(error);

      await expect(sendWithRetry(send, sleep)).rejects.toBe(error);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["another status", { response: { status: 500, headers: { "retry-after": "1" } } }],
      ["a network error", new Error("connect ECONNREFUSED")],
    ])("does not retry %s", async (_, error) => {
      const send = vi.fn().mockRejectedValue(error);

      await expect(sendWithRetry(send, sleep)).rejects.toBe(error);
      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});
