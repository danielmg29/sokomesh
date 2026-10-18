// The shape of contract/ac-contract.json (manual 3.1). These types describe the artefact;
// they never add facts to it. Generated values live in ./generated.ts.

/** Recipe tone axis. `signal` is the constitution's trade signal (reserved, featured), never a warning. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'signal'

/** Presentation hint for a state mark when the tone's default mark is less precise. */
export type ChoiceMark = 'pending' | 'processing' | 'partial' | 'restricted' | 'unavailable' | 'unknown'

export type Choice = { value: string; label: string; tone?: Tone; mark?: ChoiceMark; help?: string }

export type FieldMeta = {
  name: string
  type: string
  widget: string
  label?: string
  help?: string
  required?: boolean
  readOnly?: boolean
  default?: unknown
  maxLength?: number
  min?: number
  max?: number
  maxDigits?: number
  decimalPlaces?: number
  currency?: string
  choices?: readonly Choice[]
  filter?: readonly string[]
  relation?: { model: string; display: string }
  fieldPolicy?: { read?: string; write?: string }
  group?: string
  weight?: number
  /** Slot hint (manual 6.6): which semantic slot this field fills. */
  role?: 'subtitle' | 'owner'
  /** Sale or stock unit shown after quantities, e.g. "bale". */
  unit?: string
  step?: number
  /** Upload rules for image and file widgets. */
  accept?: readonly string[]
  maxBytes?: number
  /** Upper bound for multiselect choices. */
  maxItems?: number
}

export type ActionMeta = {
  name: string
  label: string
  kind: 'create' | 'update' | 'archive' | 'command'
  policy: string
  input?: readonly string[]
  confirm?: boolean
  tone?: Tone | 'primary'
  icon?: string
  when?: Record<string, readonly string[]>
}

export type ModelMeta = {
  key: string
  label: string
  labelPlural?: string
  /** API path under `API_BASE` for registered resources: `<path>`, `<path>/<ref>`, `<path>/<ref>/<action>`. */
  path?: string
  /** What `<ref>` is: the primary key, or the slug for public pages. */
  lookup?: 'pk' | 'slug'
  /** Readable without signing in. */
  public?: boolean
  primaryKey?: string
  displayField?: string
  tenantScoped?: boolean
  versioned?: boolean
  immutable?: boolean
  ordering?: readonly string[]
  list: { fields: readonly string[]; defaultPageSize: number; maxPageSize: number }
  search?: readonly string[]
  fields: readonly FieldMeta[]
  actions?: readonly ActionMeta[]
  events?: { topic: string; kinds: readonly string[] }
  cache?: { tag: string; listTtl: number; detailTtl: number }
}

export type ErrorMeta = { status: number; retryable: boolean; message: string }

/** Tags with their allowed attributes, URL rules and video providers (`url` is a canonical-URL pattern). */
export type RichTextPolicy = {
  tags: Readonly<Record<string, readonly string[]>>
  classes: Readonly<Record<string, readonly string[]>>
  linkSchemes: readonly string[]
  imageSchemes: readonly string[]
  sameOriginImages: boolean
  embeds: readonly { name: string; url: string; player: string }[]
}

/**
 * The parameter grammar every list endpoint accepts (backend/core/operations/listing.py). Names are the
 * query-string keys; a filter is `<field><operatorSeparator><op>`, `in` lists are `listSeparator`-joined.
 */
export type ListQueryPolicy = {
  search: string
  ordering: string
  pageSize: string
  cursor: string
  operatorSeparator: string
  listSeparator: string
  operators: readonly string[]
  maxSearchLength: number
  maxSearchTerms: number
  maxListValues: number
  countCap: number
  dateTimezone: string
}

/** One keyset page as every list endpoint returns it. `total` is counted up to `listQuery.countCap`. */
/** Choice counts and options a list adds beside its page (the product list's buyer filters). */
export type ListFacets = {
  /** Field -> choice value -> how many rows picking it would show, with every other filter applied. */
  counts: Record<string, Record<string, number>>
  /** Field -> the choices a relation filter offers (sellers in the current results). */
  options: Record<string, { value: string; label: string }[]>
  price?: { min: string | null; max: string | null }
}

/** One keyset page: `next` and `previous` are cursors (null at either end). */
export type ListPage<Row = Rec> = {
  results: Row[]
  next: string | null
  previous?: string | null
  total: number
  totalCapped: boolean
  pageSize: number
  facets?: ListFacets
}

export type Contract = {
  meta: { contractVersion: string; apiBase: string; generatedBy: string }
  auth: { mode: 'single' | 'multi'; verification: string[]; session: 'cookie' }
  limits: Record<string, number>
  listQuery: ListQueryPolicy
  /** Languages the backend writes to people in (notifications, documents); `value` is a BCP 47 tag. */
  locales: { default: string; supported: readonly Choice[] }
  /** The rich-text allow-list the backend sanitises against (backend/core/richtext.py). */
  richText: RichTextPolicy
  errors: Record<string, ErrorMeta>
  policies: { roles: Record<string, string[]> }
  events: Record<string, unknown>
  models: Record<string, Omit<ModelMeta, 'key'>>
}

/** A record as the API serialises it: field values plus server-decided permissions. */
export type Rec = { id: string; version?: number; _can?: readonly string[] } & { [field: string]: unknown }

/** Error body returned by core.http.respond on the backend. */
export type AppError = {
  code: string
  detail: string
  fields: Record<string, string[]>
  retryable: boolean
}
