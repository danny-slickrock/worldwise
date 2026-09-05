// PURE chunking for the RAG ingestion job (M2.9 step 2). No storage, no
// network, no Deno/RN — the Edge Function imports this and the Node test suite
// drives it, so there is exactly one implementation of "how content becomes
// retrievable text" rather than one per runtime.
//
// Two properties do the real work here.
//
// **Every chunk names its country.** A bare fact — "One of the world's largest
// exporters of soybeans, coffee and iron ore" — is worse than useless once
// retrieved: with nothing to anchor it, a model can attribute it to whatever
// country the question mentioned. Since the whole milestone rests on answers
// being grounded, each chunk is written to stand alone as a true statement.
//
// **Chunk indexes are positional and stable.** `(country_code, chunk_index)` is
// the upsert key, so re-ingesting a country overwrites its chunks in place. The
// corollary matters: if a country's content shrinks and yields fewer chunks,
// the leftover higher indexes must be deleted, or retired text stays
// retrievable forever. `staleChunkIndexes()` below exists for exactly that, and
// the ingestion job is required to call it.

// gte-small truncates at 512 tokens, silently — a chunk over the limit loses
// its tail with no error, so the embedding would represent only part of the
// text a citation claims it covers. English prose runs roughly 4 characters per
// token, putting 512 tokens near 2000 characters; 1200 keeps a wide margin for
// place names and numbers, which tokenize far worse than prose.
export const MAX_CHUNK_CHARS = 1200;

// Below this, a trailing fragment is folded back into the previous chunk rather
// than embedded alone. A 20-character chunk carries almost no signal and
// pollutes retrieval with a near-random vector.
export const MIN_CHUNK_CHARS = 80;

// Split prose to fit the budget, preferring sentence boundaries so a chunk is
// never cut mid-clause. Falls back to a hard character split only for text with
// no sentence breaks at all (a very long unpunctuated list, say).
export function splitProse(text, maxChars = MAX_CHUNK_CHARS) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [clean];
  const out = [];
  let current = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    // A single sentence over budget can't be placed whole — hard-split it.
    if (sentence.length > maxChars) {
      if (current) {
        out.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        out.push(sentence.slice(i, i + maxChars).trim());
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maxChars) {
      out.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) out.push(current);

  // Fold a runt tail back into its predecessor. Only when the result still
  // fits, so the budget is never violated to avoid a short chunk.
  if (out.length > 1) {
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    if (last.length < MIN_CHUNK_CHARS && prev.length + last.length + 1 <= maxChars) {
      out.splice(out.length - 2, 2, `${prev} ${last}`);
    }
  }
  return out;
}


// Split a body of text and make sure EVERY resulting piece names its country.
//
// The bug this exists to prevent: splitting an already-labelled string
// ("Brazil — Climate: ...") puts the label on the first piece only, so every
// continuation chunk is anonymous prose. Retrieved on its own, an anonymous
// chunk is exactly the misattribution risk the naming rule exists to stop —
// and it fails silently, because short content never splits. It was latent
// until model-drafted prose made long fields realistic.
//
// A single piece is returned untouched, so output is unchanged for everything
// that fits — only the split path differs.
function namedPieces(name, text, maxChars = MAX_CHUNK_CHARS) {
  const first = splitProse(text, maxChars);
  if (first.length <= 1) return first;

  // It splits, so continuation pieces will each gain a "<Name> — " prefix.
  // Re-split against the reduced budget: adding the prefix afterwards would
  // push a piece that exactly filled the budget over the gte-small cap, which
  // is the silent truncation this whole cap exists to avoid.
  const prefix = `${name} — `;
  const pieces = splitProse(text, Math.max(1, maxChars - prefix.length));
  return pieces.map((piece, i) =>
    i === 0 || piece.startsWith(name) ? piece : prefix + piece
  );
}

// Render the numeric/relational columns as a sentence rather than shipping a
// JSON blob. An embedding of `{"population":216422446}` is close to meaningless;
// "Brazil has a population of about 216.4 million" sits in the same space as
// the questions people actually ask.
function geographyText(row, name, neighborNames) {
  const parts = [];
  if (row.population != null) {
    parts.push(`has a population of about ${formatCount(row.population)}`);
  }
  if (row.area_km2 != null) {
    parts.push(`covers about ${formatCount(row.area_km2)} square kilometres`);
  }
  if (row.lat != null && row.lng != null) {
    parts.push(`is centred near ${Number(row.lat).toFixed(1)}, ${Number(row.lng).toFixed(1)}`);
  }

  const sentences = [];
  if (parts.length) sentences.push(`${name} ${joinList(parts)}.`);

  const neighbors = Array.isArray(neighborNames) ? neighborNames.filter(Boolean) : [];
  if (neighbors.length) {
    sentences.push(`${name} shares a land border with ${joinList(neighbors)}.`);
  } else if (Array.isArray(row.neighbors) && row.neighbors.length === 0) {
    // Worth stating positively: "has no land borders" is a real, askable fact,
    // and without it an island's borders question retrieves nothing at all.
    sentences.push(`${name} has no land borders.`);
  }
  return sentences.join(" ");
}

function formatCount(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} billion`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} million`;
  if (num >= 1e3) return `${Math.round(num / 1e3)} thousand`;
  return String(num);
}

function joinList(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Turn one content.countries row into ordered, self-contained chunks.
//
// `neighborNames` maps ISO code → display name; the ingestion job supplies it
// so a borders chunk reads "Argentina, Bolivia and Colombia" rather than
// "ar, bo, co". Missing entries are simply dropped — a chunk naming a code
// would be worse than one naming fewer countries.
export function chunkCountry(row, neighborNames = {}) {
  if (!row || !row.code || !row.name) return [];

  const name = row.name;
  const drafts = [];

  // Overview — the identity chunk. Answers "what/where is X" and gives every
  // other chunk a retrieval sibling that establishes context.
  const identity = [
    `${name}${row.region ? ` is a country in ${row.region}` : ""}.`,
    row.capital ? `Its capital is ${row.capital}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const summary = String(row.summary ?? "").trim();
  for (const piece of namedPieces(name, `${identity} ${summary}`.trim())) {
    drafts.push({ content: piece, source: "summary" });
  }

  // Geography and borders.
  const geo = geographyText(row, name, (row.neighbors ?? []).map((c) => neighborNames[c]));
  for (const piece of namedPieces(name, geo)) {
    drafts.push({ content: piece, source: "geography" });
  }

  // The "why it matters" facts. Sorted by key so chunk indexes stay stable
  // across runs — JSON object key order is not guaranteed, and unstable
  // ordering would make every re-ingestion rewrite every row.
  const facts = row.facts && typeof row.facts === "object" ? row.facts : {};
  for (const key of Object.keys(facts).sort()) {
    // Underscore-prefixed keys are metadata, not content. `_sources` carries
    // provenance for citation and licence cleanliness; chunking it would
    // produce a "[object Object]" chunk and, worse, one that retrieval could
    // return as if it were a fact about the country.
    if (key.startsWith("_")) continue;
    const value = String(facts[key] ?? "").trim();
    if (!value) continue;
    const labelled = `${name} — ${titleCase(key)}: ${value}`;
    for (const piece of namedPieces(name, labelled)) {
      drafts.push({ content: piece, source: `facts.${key}` });
    }
  }

  return drafts.map((d, i) => ({ ...d, chunkIndex: i, countryCode: row.code }));
}

function titleCase(key) {
  return String(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Which stored chunk indexes are now orphaned, given what this run produced.
// Re-ingestion upserts by (country_code, chunk_index), so shrinking content
// leaves the tail behind — retired text that would still be retrievable, and
// still citable, long after it stopped being true.
export function staleChunkIndexes(existingIndexes = [], producedCount = 0) {
  return [...new Set(existingIndexes)]
    .filter((i) => Number.isInteger(i) && i >= producedCount)
    .sort((a, b) => a - b);
}
