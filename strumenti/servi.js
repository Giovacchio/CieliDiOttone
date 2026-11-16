// Piccolo server per provare il gioco sul proprio computer: node strumenti/servi.js  →  http://localhost:8080
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { RADICE } from "./dati_node.js";

const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const porta = +process.argv[2] || 8080;
http.createServer(async (richiesta, risposta) => {
  const percorso = decodeURIComponent(new URL(richiesta.url, "http://x").pathname);
  const file = path.join(RADICE, path.normalize(percorso === "/" ? "/index.html" : percorso));
  if (!file.startsWith(RADICE)) { risposta.writeHead(403).end(); return; }
  let contenuto;
  try { contenuto = await readFile(file); } catch { risposta.writeHead(404).end("non trovato"); return; }
  risposta.writeHead(200, { "content-type": TIPI[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(contenuto);
}).listen(porta, () => console.log(`Cieli di Ottone su http://localhost:${porta}`));
