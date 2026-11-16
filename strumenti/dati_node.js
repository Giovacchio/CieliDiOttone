// Carica i dati dal disco (per test e strumenti).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { caricaDati } from "../js/dati.js";

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const leggiDaDisco = async (p) => JSON.parse(await readFile(path.join(RADICE, "dati", p), "utf8"));
export const datiDaDisco = () => caricaDati(leggiDaDisco);
