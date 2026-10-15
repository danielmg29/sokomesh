// AUTO-GENERATED from contract/ac-contract.json (contract 0.3.0) by tools/gen-contract.mts — do not edit.
export const CONTRACT_VERSION = "0.3.0"
export const API_BASE = "/api/v1/"
export const auth = {
  "mode": "multi",
  "session": "cookie",
  "verification": [
    "email"
  ]
} as const
export const limits = {
  "defaultPageSize": 25,
  "maxBulk": 500,
  "maxPageSize": 100,
  "maxRequestBytes": 1048576,
  "maxUploadBytes": 26214400,
  "streamChunk": 500
} as const
export const locales = {
  "default": "en-KE",
  "supported": [
    {
      "label": "English",
      "value": "en-KE"
    },
    {
      "label": "Kiswahili",
      "value": "sw-KE"
    }
  ]
} as const
export const richText = {
  "classes": {
    "figure": [
      "image",
      "media"
    ]
  },
  "embeds": [
    {
      "name": "YouTube",
      "player": "https://www.youtube-nocookie.com/embed/{id}",
      "url": "^https://www\\.youtube\\.com/watch\\?v=([A-Za-z0-9_-]{11})$"
    },
    {
      "name": "Vimeo",
      "player": "https://player.vimeo.com/video/{id}?dnt=1",
      "url": "^https://vimeo\\.com/(\\d{6,12})$"
    }
  ],
  "imageSchemes": [
    "https"
  ],
  "linkSchemes": [
    "https",
    "http",
    "mailto"
  ],
  "sameOriginImages": true,
  "tags": {
    "a": [
      "href"
    ],
    "blockquote": [],
    "br": [],
    "code": [],
    "em": [],
    "figcaption": [],
    "figure": [
      "class"
    ],
    "h3": [],
    "h4": [],
    "hr": [],
    "img": [
      "src",
      "alt"
    ],
    "li": [],
    "oembed": [
      "url"
    ],
    "ol": [],
    "p": [],
    "s": [],
    "strong": [],
    "table": [],
    "tbody": [],
    "td": [],
    "th": [],
    "thead": [],
    "tr": [],
    "u": [],
    "ul": []
  }
} as const
export type Locale = (typeof locales)['supported'][number]['value']
export const errors = {
  "CONFLICT": {
    "message": "Someone else changed this record. Review the latest version and try again.",
    "retryable": false,
    "status": 409
  },
  "DUPLICATE": {
    "message": "A record with these details already exists.",
    "retryable": false,
    "status": 409
  },
  "FORBIDDEN": {
    "message": "Your role does not allow this action.",
    "retryable": false,
    "status": 403
  },
  "LIMIT_EXCEEDED": {
    "message": "This request is larger than the allowed limit.",
    "retryable": false,
    "status": 413
  },
  "NOT_FOUND": {
    "message": "We couldn't find that record. It may have been removed.",
    "retryable": false,
    "status": 404
  },
  "RATE_LIMITED": {
    "message": "Too many requests. Wait a moment, then try again.",
    "retryable": true,
    "status": 429
  },
  "UNAVAILABLE": {
    "message": "The service is temporarily unavailable. Try again shortly.",
    "retryable": true,
    "status": 503
  },
  "VALIDATION": {
    "message": "Some details need attention before this can be saved.",
    "retryable": false,
    "status": 422
  }
} as const
export type ErrorCode = keyof typeof errors
export const roles = [
  "buyer_owner",
  "buyer_purchaser",
  "marketplace_admin",
  "seller_manager",
  "warehouse_operator"
] as const
export type Role = (typeof roles)[number]
export const registry = {} as const
export type ModelKey = keyof typeof registry
