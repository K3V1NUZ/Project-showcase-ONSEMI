// Demo mode: a tiny in-browser stand-in for the Supabase client.
//
// Used automatically when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// are not set, so the app can be cloned and run with zero configuration.
// Data lives in localStorage of the current browser only. It implements just
// the subset of the PostgREST query builder that src/lib/queries.ts uses.

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;
type Result = { data: unknown; error: { message: string; code?: string; details?: string; hint?: string } | null };

const STORAGE_KEY = "nutritrack-demo-db";
const AUTH_KEY = "nutritrack-demo-auth";
const DEMO_USER = { id: "00000000-0000-0000-0000-000000000001", email: "demo@nutritrack.local" };

export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "1" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

function loadDb(): Db {
  const empty: Db = { foods: [], meal_entries: [], meals: [], meal_components: [], user_settings: [] };
  if (!hasStorage()) return empty;
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return empty;
  }
}

function saveDb(db: Db) {
  if (hasStorage()) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// Attach the embedded relations queries.ts selects (foods inside entries,
// components + foods inside meals). Extra columns are harmless.
function expand(table: string, row: Row, db: Db): Row {
  const foodById = (id: unknown) => db.foods.find((f) => f.id === id) ?? null;
  if (table === "meal_entries") return { ...row, foods: foodById(row.food_id) };
  if (table === "meals") {
    return {
      ...row,
      meal_components: db.meal_components
        .filter((c) => c.meal_id === row.id)
        .map((c) => ({ ...c, foods: foodById(c.food_id) })),
    };
  }
  return row;
}

function ilike(value: unknown, pattern: string): boolean {
  if (typeof value !== "string") return false;
  const re = new RegExp(
    "^" +
      pattern
        .replace(/\\([%_])/g, "\u0000$1")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/%/g, ".*")
        .replace(/_/g, ".")
        .replace(/\u0000(.)/g, (_, c) => "\\" + c) +
      "$",
    "i"
  );
  return re.test(value);
}

type Op = "select" | "insert" | "update" | "delete" | "upsert";

class QueryBuilder implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private returnRows = false;

  constructor(
    private table: string,
    private op: Op,
    private payload?: Row | Row[],
    private upsertKey?: string
  ) {}

  select() {
    this.returnRows = true;
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  gte(col: string, val: string) {
    this.filters.push((r) => String(r[col]) >= val);
    return this;
  }
  lt(col: string, val: string) {
    this.filters.push((r) => String(r[col]) < val);
    return this;
  }
  not(col: string, op: string, val: unknown) {
    if (op === "is" && val === null) this.filters.push((r) => r[col] != null);
    return this;
  }
  or(expr: string) {
    // Format used by the app: "col.ilike.%x%,col2.ilike.%x%"
    const parts = expr.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".");
      return { col, op, val: rest.join(".") };
    });
    this.filters.push((r) => parts.some((p) => p.op === "ilike" && ilike(r[p.col], p.val)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private run(): Result {
    const db = loadDb();
    const rows = db[this.table] ?? (db[this.table] = []);
    const now = () => new Date().toISOString();
    let out: Row[] = [];

    if (this.op === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      out = items.map((p) => ({ id: uuid(), created_at: now(), ...p }));
      rows.push(...out);
      saveDb(db);
    } else if (this.op === "upsert") {
      const p = this.payload as Row;
      const key = this.upsertKey || "id";
      const existing = rows.find((r) => r[key] === p[key]);
      if (existing) Object.assign(existing, p);
      else rows.push({ id: uuid(), created_at: now(), ...p });
      saveDb(db);
    } else if (this.op === "update") {
      out = rows.filter((r) => this.filters.every((f) => f(r)));
      out.forEach((r) => Object.assign(r, this.payload));
      saveDb(db);
    } else if (this.op === "delete") {
      const keep = rows.filter((r) => !this.filters.every((f) => f(r)));
      const removedIds = new Set(rows.filter((r) => !keep.includes(r)).map((r) => r.id));
      db[this.table] = keep;
      if (this.table === "meals") {
        db.meal_components = db.meal_components.filter((c) => !removedIds.has(c.meal_id));
      }
      saveDb(db);
    } else {
      out = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
      }
      if (this.limitN != null) out = out.slice(0, this.limitN);
      out = out.map((r) => expand(this.table, r, db));
    }

    if (this.op !== "select" && !this.returnRows) return { data: null, error: null };
    if (this.mode === "single") {
      return out.length === 1
        ? { data: out[0], error: null }
        : { data: null, error: { message: "Expected a single row", code: "PGRST116" } };
    }
    if (this.mode === "maybeSingle") return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

function isSignedIn(): boolean {
  // Signed in by default; "Sign out" in settings flips this off.
  return !hasStorage() || localStorage.getItem(AUTH_KEY) !== "signed-out";
}

export function createDemoClient() {
  return {
    from(table: string) {
      return {
        select: () => new QueryBuilder(table, "select"),
        insert: (payload: Row | Row[]) => new QueryBuilder(table, "insert", payload),
        update: (payload: Row) => new QueryBuilder(table, "update", payload),
        delete: () => new QueryBuilder(table, "delete"),
        upsert: (payload: Row, opts?: { onConflict?: string }) =>
          new QueryBuilder(table, "upsert", payload, opts?.onConflict),
      };
    },
    auth: {
      async getUser() {
        return { data: { user: isSignedIn() ? DEMO_USER : null }, error: null };
      },
      async signInWithOtp() {
        return { data: {}, error: null };
      },
      async verifyOtp() {
        if (hasStorage()) localStorage.removeItem(AUTH_KEY);
        return { data: { user: DEMO_USER }, error: null };
      },
      async signOut() {
        if (hasStorage()) localStorage.setItem(AUTH_KEY, "signed-out");
        return { error: null };
      },
    },
  };
}
