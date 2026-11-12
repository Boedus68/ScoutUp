export type CensusRow = {
  rowNumber: number;
  nome: string;
  cognome: string;
  birthDate: string | null;
  subgroup: string | null;
  memberEmail: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
};

export type CensusIssue = {
  rowNumber: number;
  level: "error" | "warning";
  message: string;
};

export type CensusParseResult = {
  rows: CensusRow[];
  issues: CensusIssue[];
};

const HEADER_MAP: Record<string, keyof Omit<CensusRow, "rowNumber">> = {
  nome: "nome",
  name: "nome",
  cognome: "cognome",
  surname: "cognome",
  "data di nascita": "birthDate",
  "data nascita": "birthDate",
  nascita: "birthDate",
  birthdate: "birthDate",
  "birth date": "birthDate",
  sestiglia: "subgroup",
  squadriglia: "subgroup",
  pattuglia: "subgroup",
  sottogruppo: "subgroup",
  "email ragazzo": "memberEmail",
  "email ragazza": "memberEmail",
  "email member": "memberEmail",
  "mail ragazzo": "memberEmail",
  "email genitore 1": "parentEmail",
  "email genitore": "parentEmail",
  "mail genitore 1": "parentEmail",
  "mail genitore": "parentEmail",
  "telefono genitore 1": "parentPhone",
  "telefono genitore": "parentPhone",
  "tel genitore 1": "parentPhone",
  "tel genitore": "parentPhone",
};

function normalizeHeader(h: string) {
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    if ((ch === ";" || ch === "\t") && !inQuotes && out.length === 0 && !line.includes(",")) {
      // allow ; or tab as delimiter when no commas seen yet — handled below
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function splitRows(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const counts = {
    ",": (headerLine.match(/,/g) ?? []).length,
    ";": (headerLine.match(/;/g) ?? []).length,
    "\t": (headerLine.match(/\t/g) ?? []).length,
  };
  const best = (Object.entries(counts) as ["," | ";" | "\t", number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best[1] > 0 ? best[0] : ",";
}

function splitLine(line: string, delim: "," | ";" | "\t"): string[] {
  if (delim === ",") return parseCsvLine(line);
  return line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function parseBirthDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

export function parseCensusCsv(text: string): CensusParseResult {
  const lines = splitRows(text);
  const issues: CensusIssue[] = [];
  if (lines.length < 2) {
    return {
      rows: [],
      issues: [{ rowNumber: 0, level: "error", message: "CSV vuoto o senza righe dati." }],
    };
  }

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim).map(normalizeHeader);
  const index: Partial<Record<keyof Omit<CensusRow, "rowNumber">, number>> = {};
  headers.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key) index[key] = i;
  });

  if (index.nome == null || index.cognome == null) {
    issues.push({
      rowNumber: 1,
      level: "error",
      message: "Header obbligatori mancanti: Nome, Cognome (accettati anche Name/Surname).",
    });
  }

  const rows: CensusRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitLine(lines[li], delim);
    const rowNumber = li + 1;
    const get = (k: keyof Omit<CensusRow, "rowNumber">) => {
      const i = index[k];
      if (i == null) return "";
      return (cols[i] ?? "").trim();
    };

    const nome = get("nome");
    const cognome = get("cognome");
    const birthRaw = get("birthDate");
    const birthDate = birthRaw ? parseBirthDate(birthRaw) : null;
    const subgroup = get("subgroup") || null;
    const memberEmail = (get("memberEmail") || "").toLowerCase() || null;
    const parentEmail = (get("parentEmail") || "").toLowerCase() || null;
    const parentPhone = get("parentPhone") || null;

    if (!nome && !cognome) {
      issues.push({
        rowNumber,
        level: "warning",
        message: "Riga vuota, ignorata.",
      });
      continue;
    }
    if (!nome || !cognome) {
      issues.push({
        rowNumber,
        level: "error",
        message: "Nome e Cognome obbligatori.",
      });
    }
    if (birthRaw && !birthDate) {
      issues.push({
        rowNumber,
        level: "error",
        message: `Data di nascita non valida: "${birthRaw}" (usa AAAA-MM-GG o GG/MM/AAAA).`,
      });
    }
    if (!memberEmail && !parentEmail) {
      issues.push({
        rowNumber,
        level: "warning",
        message:
          "Nessuna email: senza utente Auth esistente l'import non può creare il profilo.",
      });
    }
    if (memberEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) {
      issues.push({
        rowNumber,
        level: "error",
        message: `Email ragazzo non valida: ${memberEmail}`,
      });
    }
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      issues.push({
        rowNumber,
        level: "error",
        message: `Email genitore non valida: ${parentEmail}`,
      });
    }

    rows.push({
      rowNumber,
      nome,
      cognome,
      birthDate,
      subgroup,
      memberEmail,
      parentEmail,
      parentPhone,
    });
  }

  return { rows, issues };
}

export function censusHasBlockingErrors(issues: CensusIssue[]) {
  return issues.some((i) => i.level === "error");
}
