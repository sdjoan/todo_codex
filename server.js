const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/claude") {
      if (!API_KEY) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY 환경변수를 설정하세요." }));
        return;
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const options = {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
          },
        };
        const proxy = https.request(options, (apiRes) => {
          res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
          apiRes.pipe(res);
        });
        proxy.on("error", () => {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Anthropic API 연결 실패" }));
        });
        proxy.write(body);
        proxy.end();
      });
      return;
    }

    const urlPath = req.url.split("?")[0];
    const filePath = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    if (!API_KEY) console.warn("경고: ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  });
