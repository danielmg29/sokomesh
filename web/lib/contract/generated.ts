// AUTO-GENERATED from contract/ac-contract.json (contract 1.0.0) by tools/gen-contract.mts — do not edit.
import { z } from 'zod'
import type { ModelMeta } from '@/lib/contract/types'
import { decimalString } from '@/lib/contract/decimal'
export const CONTRACT_VERSION = "1.0.0"
export const API_BASE = "/api/v1/"
export const auth = {
  "mode": "multi",
  "password": {
    "help": "At least 8 characters, not close to your name or email, not a common password and not only numbers.",
    "minLength": 8
  },
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
export const listQuery = {
  "countCap": 10000,
  "cursor": "cursor",
  "dateTimezone": "Africa/Nairobi",
  "listSeparator": ",",
  "maxListValues": 50,
  "maxSearchLength": 200,
  "maxSearchTerms": 8,
  "operatorSeparator": "__",
  "operators": [
    "eq",
    "in",
    "contains",
    "gte",
    "lte",
    "isnull"
  ],
  "ordering": "ordering",
  "pageSize": "page_size",
  "search": "q"
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
export const uploads = {
  "avatar": {
    "maxBytes": 2097152,
    "types": [
      "image/jpeg",
      "image/png",
      "image/webp"
    ]
  },
  "document": {
    "maxBytes": 10485760,
    "types": [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ]
  },
  "productImage": {
    "maxBytes": 15728640,
    "types": [
      "image/jpeg",
      "image/png",
      "image/webp"
    ]
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
  "UNAUTHENTICATED": {
    "message": "Sign in to continue.",
    "retryable": false,
    "status": 401
  },
  "UNAVAILABLE": {
    "message": "The service is temporarily unavailable. Try again shortly.",
    "retryable": true,
    "status": 503
  },
  "UNVERIFIED": {
    "message": "Confirm your email address to continue.",
    "retryable": false,
    "status": 403
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
export const rolePermissions = {
  "buyer_owner": [
    "address.create",
    "address.delete",
    "address.list",
    "address.update",
    "approval_policy.create",
    "approval_policy.get",
    "approval_policy.list",
    "approval_policy.update",
    "cart.checkout",
    "cart.get",
    "cart.list",
    "cart.update",
    "cart_line.create",
    "cart_line.get",
    "cart_line.list",
    "cart_line.remove",
    "cart_line.update",
    "integration.list",
    "integration.manage",
    "membership.invite",
    "membership.list",
    "membership.update",
    "order.approve",
    "order.cancel",
    "order.dispute",
    "order.get",
    "order.list",
    "order.pay",
    "order.reorder",
    "organization.get",
    "organization.update",
    "quote.accept",
    "quote.create",
    "quote.get",
    "quote.list",
    "return_case.create",
    "return_case.evidence",
    "return_case.get",
    "return_case.list",
    "shipment.get",
    "shipment.list"
  ],
  "buyer_purchaser": [
    "address.list",
    "approval_policy.get",
    "approval_policy.list",
    "cart.checkout",
    "cart.get",
    "cart.list",
    "cart.update",
    "cart_line.create",
    "cart_line.get",
    "cart_line.list",
    "cart_line.remove",
    "cart_line.update",
    "membership.list",
    "order.approve",
    "order.cancel",
    "order.dispute",
    "order.get",
    "order.list",
    "order.pay",
    "order.reorder",
    "organization.get",
    "quote.accept",
    "quote.create",
    "quote.get",
    "quote.list",
    "return_case.create",
    "return_case.evidence",
    "return_case.get",
    "return_case.list",
    "shipment.get",
    "shipment.list"
  ],
  "marketplace_admin": [
    "*"
  ],
  "seller_manager": [
    "address.create",
    "address.delete",
    "address.list",
    "address.update",
    "analytics.view",
    "buyer_group.create",
    "buyer_group.list",
    "buyer_group.remove",
    "catalog_product.archive",
    "catalog_product.create",
    "catalog_product.get",
    "catalog_product.list",
    "catalog_product.publish",
    "catalog_product.update",
    "fulfillment_task.get",
    "fulfillment_task.list",
    "fulfillment_task.update",
    "integration.list",
    "integration.manage",
    "inventory.adjust",
    "inventory.list",
    "inventory.receive",
    "media_asset.create",
    "media_asset.get",
    "media_asset.list",
    "media_asset.remove",
    "media_asset.update",
    "membership.invite",
    "membership.list",
    "membership.update",
    "metric_definition.list",
    "order.cancel",
    "order.fulfil",
    "order.get",
    "order.list",
    "organization.get",
    "organization.update",
    "price_rule.create",
    "price_rule.get",
    "price_rule.list",
    "price_rule.update",
    "quote.get",
    "quote.list",
    "quote.respond",
    "return_case.decide",
    "return_case.evidence",
    "return_case.get",
    "return_case.list",
    "seller_document.create",
    "seller_document.delete",
    "seller_document.list",
    "seller_profile.get",
    "seller_profile.submit",
    "seller_profile.update",
    "shipment.get",
    "shipment.list",
    "shipment.update",
    "variant.create",
    "variant.get",
    "variant.list",
    "variant.update"
  ],
  "warehouse_operator": [
    "address.list",
    "catalog_product.get",
    "catalog_product.list",
    "fulfillment_task.get",
    "fulfillment_task.list",
    "fulfillment_task.update",
    "inventory.list",
    "inventory.receive",
    "media_asset.get",
    "media_asset.list",
    "membership.list",
    "order.fulfil",
    "order.get",
    "order.list",
    "organization.get",
    "price_rule.get",
    "price_rule.list",
    "return_case.evidence",
    "return_case.get",
    "return_case.list",
    "seller_document.list",
    "seller_profile.get",
    "shipment.get",
    "shipment.list",
    "shipment.update",
    "variant.get",
    "variant.list"
  ]
} as const
export const AccountSchema = z.object({
  id: z.uuid().nullish(),
  display_name: z.string().max(150).min(1),
  email: z.email(),
  phone: z.string().max(20).nullish(),
  date_joined: z.iso.datetime({ offset: true }).nullish(),
  avatar: z.unknown().nullish(),
})
export type Account = z.infer<typeof AccountSchema>
export const AccountWriteSchema = AccountSchema.omit({ email: true, date_joined: true, avatar: true })
export const AccountMeta = {
  "key": "account",
  "actions": [],
  "displayField": "display_name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "Shown to your team and on the orders, quotes and reviews you send.",
      "label": "Your name",
      "maxLength": 150,
      "name": "display_name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "help": "Sign-in address. Write to support to change it.",
      "label": "Email",
      "maxLength": 254,
      "name": "email",
      "readOnly": true,
      "required": true,
      "type": "email",
      "weight": 20,
      "widget": "email"
    },
    {
      "help": "For delivery calls and M-Pesa prompts, for example +254 712 345 678.",
      "label": "Phone",
      "maxLength": 20,
      "name": "phone",
      "type": "string",
      "weight": 30,
      "widget": "phone"
    },
    {
      "label": "Member since",
      "name": "date_joined",
      "readOnly": true,
      "type": "datetime",
      "weight": 40,
      "widget": "date"
    },
    {
      "accept": [
        "image/jpeg",
        "image/png",
        "image/webp"
      ],
      "help": "Square photos work best.",
      "label": "Photo",
      "maxBytes": 2097152,
      "name": "avatar",
      "readOnly": true,
      "type": "image",
      "weight": 5,
      "widget": "image"
    }
  ],
  "label": "Account",
  "labelPlural": "Accounts",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "display_name",
      "email"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [],
  "path": "account/profile",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const AddressSchema = z.object({
  id: z.uuid().nullish(),
  label: z.string().max(80).min(1),
  line1: z.string().max(200).min(1),
  line2: z.string().max(200).nullish(),
  city: z.string().max(100).min(1),
  region: z.string().max(100).nullish(),
  postal_code: z.string().max(20).nullish(),
  country_code: z.enum(["KE", "UG", "TZ", "RW"]).nullish(),
  location_point: z.unknown().nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Address = z.infer<typeof AddressSchema>
export const AddressWriteSchema = AddressSchema.omit({ created_at: true })
export const AddressMeta = {
  "key": "address",
  "actions": [
    {
      "confirm": true,
      "kind": "archive",
      "label": "Delete address",
      "name": "delete",
      "policy": "address.delete",
      "tone": "danger"
    }
  ],
  "displayField": "label",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "Warehouse, Head office, Shop 1.",
      "label": "Label",
      "maxLength": 80,
      "name": "label",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "label": "Address line 1",
      "maxLength": 200,
      "name": "line1",
      "required": true,
      "type": "string",
      "weight": 20,
      "widget": "text"
    },
    {
      "label": "Address line 2",
      "maxLength": 200,
      "name": "line2",
      "type": "string",
      "weight": 30,
      "widget": "text"
    },
    {
      "label": "Town or city",
      "maxLength": 100,
      "name": "city",
      "required": true,
      "type": "string",
      "weight": 40,
      "widget": "text"
    },
    {
      "label": "County",
      "maxLength": 100,
      "name": "region",
      "type": "string",
      "weight": 50,
      "widget": "text"
    },
    {
      "label": "Postal code",
      "maxLength": 20,
      "name": "postal_code",
      "type": "string",
      "weight": 60,
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Kenya",
          "value": "KE"
        },
        {
          "label": "Uganda",
          "value": "UG"
        },
        {
          "label": "Tanzania",
          "value": "TZ"
        },
        {
          "label": "Rwanda",
          "value": "RW"
        }
      ],
      "default": "KE",
      "label": "Country",
      "maxLength": 2,
      "name": "country_code",
      "type": "enum",
      "weight": 70,
      "widget": "select"
    },
    {
      "label": "Map point",
      "name": "location_point",
      "type": "location",
      "weight": 80,
      "widget": "location"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Address",
  "labelPlural": "Addresses",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "label",
      "line1",
      "city",
      "region"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "label"
  ],
  "path": "addresses",
  "primaryKey": "id",
  "public": false,
  "search": [
    "label",
    "line1",
    "city"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const ApiClientSchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().max(80).min(1),
  status: z.enum(["active", "revoked"]).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type ApiClient = z.infer<typeof ApiClientSchema>
export const ApiClientWriteSchema = ApiClientSchema.omit({ status: true, created_at: true })
export const ApiClientMeta = {
  "key": "api_client",
  "actions": [
    {
      "confirm": true,
      "icon": "ban",
      "kind": "command",
      "label": "Revoke",
      "name": "revoke",
      "policy": "integration.manage",
      "tone": "danger",
      "when": {
        "status": [
          "active"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "What connects with it, such as Stock sync (ERP).",
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Active",
          "tone": "success",
          "value": "active"
        },
        {
          "label": "Revoked",
          "tone": "neutral",
          "value": "revoked"
        }
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "API client",
  "labelPlural": "API clients",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "status",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "name"
  ],
  "path": "integrations/clients",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const ApiTokenSchema = z.object({
  id: z.uuid().nullish(),
  client: z.uuid(),
  name: z.string().max(80).min(1),
  scopes: z.unknown(),
  expires_at: z.iso.datetime({ offset: true }).nullish(),
  last4: z.string().max(4).min(1),
  status: z.enum(["active", "revoked"]).nullish(),
  last_used_at: z.iso.datetime({ offset: true }).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type ApiToken = z.infer<typeof ApiTokenSchema>
export const ApiTokenWriteSchema = ApiTokenSchema.omit({ last4: true, status: true, last_used_at: true, created_at: true })
export const ApiTokenMeta = {
  "key": "api_token",
  "actions": [
    {
      "confirm": true,
      "icon": "ban",
      "kind": "command",
      "label": "Revoke",
      "name": "revoke",
      "policy": "integration.manage",
      "tone": "danger",
      "when": {
        "status": [
          "active"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Client",
      "name": "client",
      "relation": {
        "display": "name",
        "model": "api_client"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Read products and packs",
          "value": "catalogue.read"
        },
        {
          "label": "Read stock",
          "value": "inventory.read"
        },
        {
          "label": "Record goods received",
          "value": "inventory.write"
        },
        {
          "label": "Read orders",
          "value": "orders.read"
        }
      ],
      "help": "Give each connection only what it needs.",
      "label": "Access",
      "name": "scopes",
      "required": true,
      "type": "multiselect",
      "weight": 15,
      "widget": "multiselect"
    },
    {
      "label": "Expires",
      "name": "expires_at",
      "type": "datetime",
      "weight": 20,
      "widget": "datetime"
    },
    {
      "label": "Last4",
      "maxLength": 4,
      "name": "last4",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "choices": [
        {
          "label": "Active",
          "tone": "success",
          "value": "active"
        },
        {
          "label": "Revoked",
          "tone": "neutral",
          "value": "revoked"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Last used",
      "name": "last_used_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Created",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "API token",
  "labelPlural": "API tokens",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "client",
      "scopes",
      "last4",
      "status",
      "last_used_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-created_at"
  ],
  "path": "integrations/tokens",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const ApprovalPolicySchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().max(80).min(1),
  threshold_amount: decimalString(14, 2),
  approver_role_keys: z.unknown(),
  minimum_approvals: z.number().int().nullish(),
  exempt_approvers: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  currency: z.string().max(3).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type ApprovalPolicy = z.infer<typeof ApprovalPolicySchema>
export const ApprovalPolicyWriteSchema = ApprovalPolicySchema.omit({ is_active: true, currency: true, updated_at: true })
export const ApprovalPolicyMeta = {
  "key": "approval_policy",
  "actions": [
    {
      "confirm": true,
      "icon": "pause",
      "kind": "command",
      "label": "Switch off",
      "name": "switch_off",
      "policy": "approval_policy.update",
      "when": {
        "is_active": [
          "true"
        ]
      }
    },
    {
      "icon": "check",
      "kind": "command",
      "label": "Switch on",
      "name": "switch_on",
      "policy": "approval_policy.update",
      "when": {
        "is_active": [
          "false"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "help": "Orders of this value and above need approval.",
      "label": "From order value",
      "maxDigits": 14,
      "name": "threshold_amount",
      "required": true,
      "type": "decimal",
      "weight": 20,
      "widget": "currency"
    },
    {
      "choices": [
        {
          "label": "Buyer owner",
          "value": "buyer_owner"
        },
        {
          "label": "Buyer purchaser",
          "value": "buyer_purchaser"
        }
      ],
      "help": "Members with any of these roles can approve; never the person who placed the order.",
      "label": "Who can approve",
      "name": "approver_role_keys",
      "required": true,
      "type": "multiselect",
      "weight": 30,
      "widget": "multiselect"
    },
    {
      "default": 1,
      "label": "Approvals needed",
      "name": "minimum_approvals",
      "type": "integer",
      "weight": 40,
      "widget": "integer"
    },
    {
      "default": true,
      "help": "Orders placed by someone who can approve go straight to the seller. Turn this off to have a second person check every large order.",
      "label": "Approvers' own orders skip approval",
      "name": "exempt_approvers",
      "type": "boolean",
      "weight": 50,
      "widget": "boolean"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "On",
      "name": "is_active",
      "readOnly": true,
      "type": "boolean",
      "widget": "boolean"
    },
    {
      "label": "Currency",
      "maxLength": 3,
      "name": "currency",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Approval policy",
  "labelPlural": "Approval policies",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "threshold_amount",
      "approver_role_keys",
      "minimum_approvals",
      "exempt_approvers",
      "is_active"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "threshold_amount",
    "-updated_at"
  ],
  "path": "approval-policies",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const AuditEventSchema = z.object({
  id: z.uuid().nullish(),
  occurred_at: z.iso.datetime({ offset: true }),
  domain: z.enum(["account", "catalog", "price", "inventory", "order", "payment", "fulfilment", "return", "integration"]).nullish(),
  event_type: z.string().max(60).min(1),
  summary: z.string().max(500).min(1),
  actor_label: z.string().max(150).nullish(),
  reason: z.string().nullish(),
  correlation_id: z.string().max(64).nullish(),
  request_id: z.string().max(64).nullish(),
  resource_type: z.string().max(40).min(1),
  resource_id: z.string().max(64).min(1),
})
export type AuditEvent = z.infer<typeof AuditEventSchema>
export const AuditEventWriteSchema = AuditEventSchema.omit({ occurred_at: true, domain: true, event_type: true, summary: true, actor_label: true, reason: true, correlation_id: true, request_id: true, resource_type: true, resource_id: true })
export const AuditEventMeta = {
  "key": "audit_event",
  "actions": [],
  "displayField": "event_type",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "range"
      ],
      "label": "When",
      "name": "occurred_at",
      "readOnly": true,
      "required": true,
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "choices": [
        {
          "label": "Accounts",
          "value": "account"
        },
        {
          "label": "Catalogue",
          "value": "catalog"
        },
        {
          "label": "Prices",
          "value": "price"
        },
        {
          "label": "Inventory",
          "tone": "signal",
          "value": "inventory"
        },
        {
          "label": "Orders",
          "tone": "info",
          "value": "order"
        },
        {
          "label": "Payments",
          "tone": "success",
          "value": "payment"
        },
        {
          "label": "Fulfilment",
          "value": "fulfilment"
        },
        {
          "label": "Returns",
          "tone": "warning",
          "value": "return"
        },
        {
          "label": "Integrations",
          "tone": "neutral",
          "value": "integration"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Area",
      "name": "domain",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Event",
      "maxLength": 60,
      "name": "event_type",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "label": "What happened",
      "maxLength": 500,
      "name": "summary",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "By",
      "maxLength": 150,
      "name": "actor_label",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Reason",
      "name": "reason",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Correlation",
      "maxLength": 64,
      "name": "correlation_id",
      "readOnly": true,
      "type": "string",
      "widget": "code"
    },
    {
      "label": "Request",
      "maxLength": 64,
      "name": "request_id",
      "readOnly": true,
      "type": "string",
      "widget": "code"
    },
    {
      "label": "Record type",
      "maxLength": 40,
      "name": "resource_type",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Record",
      "maxLength": 64,
      "name": "resource_id",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    }
  ],
  "label": "Audit event",
  "labelPlural": "Audit trail",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "occurred_at",
      "domain",
      "event_type",
      "summary",
      "actor_label"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-occurred_at"
  ],
  "path": "audit-events",
  "primaryKey": "id",
  "public": false,
  "search": [
    "summary",
    "event_type"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const BuyerGroupMemberSchema = z.object({
  id: z.uuid().nullish(),
  buyer: z.uuid(),
  group_key: z.string().max(40).min(1),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type BuyerGroupMember = z.infer<typeof BuyerGroupMemberSchema>
export const BuyerGroupMemberWriteSchema = BuyerGroupMemberSchema.omit({ created_at: true })
export const BuyerGroupMemberMeta = {
  "key": "buyer_group_member",
  "actions": [
    {
      "icon": "trash",
      "kind": "archive",
      "label": "Remove from group",
      "name": "remove",
      "policy": "buyer_group.remove"
    }
  ],
  "displayField": "group_key",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Buyer",
      "name": "buyer",
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "filter": [
        "in"
      ],
      "help": "A short name your price rules use, such as key_accounts.",
      "label": "Group",
      "maxLength": 40,
      "name": "group_key",
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Buyer group member",
  "labelPlural": "Buyer groups",
  "list": {
    "defaultPageSize": 100,
    "fields": [
      "buyer",
      "group_key",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "group_key",
    "-created_at"
  ],
  "path": "catalog/buyer-groups",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const CartSchema = z.object({
  id: z.uuid().nullish(),
  buyer_organization: z.uuid(),
  created_by: z.uuid(),
  status: z.enum(["active", "submitted", "abandoned", "converted"]).nullish(),
  currency: z.string().max(3).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Cart = z.infer<typeof CartSchema>
export const CartWriteSchema = CartSchema.omit({ buyer_organization: true, created_by: true, status: true, currency: true, updated_at: true })
export const CartMeta = {
  "key": "cart",
  "actions": [
    {
      "icon": "check",
      "kind": "command",
      "label": "Accept new prices",
      "name": "accept_prices",
      "policy": "cart.update",
      "when": {
        "status": [
          "active"
        ]
      }
    },
    {
      "icon": "check",
      "input": [
        "delivery_address",
        "special_instructions"
      ],
      "kind": "command",
      "label": "Place orders",
      "name": "checkout",
      "policy": "cart.checkout",
      "when": {
        "status": [
          "active"
        ]
      }
    },
    {
      "confirm": true,
      "icon": "trash",
      "kind": "command",
      "label": "Empty cart",
      "name": "empty",
      "policy": "cart.update",
      "tone": "danger",
      "when": {
        "status": [
          "active"
        ]
      }
    }
  ],
  "displayField": "id",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Buyer",
      "name": "buyer_organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Started by",
      "name": "created_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "choices": [
        {
          "label": "Active",
          "tone": "info",
          "value": "active"
        },
        {
          "label": "Submitted",
          "tone": "success",
          "value": "submitted"
        },
        {
          "label": "Set aside",
          "tone": "neutral",
          "value": "abandoned"
        },
        {
          "label": "Ordered",
          "tone": "success",
          "value": "converted"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Currency",
      "maxLength": 3,
      "name": "currency",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "inputOnly": true,
      "label": "Deliver to",
      "name": "delivery_address",
      "relation": {
        "display": "label",
        "model": "address"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "help": "Gate, opening hours, who receives the goods.",
      "inputOnly": true,
      "label": "Delivery notes",
      "maxLength": 1000,
      "name": "special_instructions",
      "type": "text",
      "widget": "textarea"
    }
  ],
  "label": "Cart",
  "labelPlural": "Carts",
  "list": {
    "defaultPageSize": 10,
    "fields": [
      "status",
      "updated_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-updated_at"
  ],
  "path": "carts",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": true,
  "versioned": true
} as const satisfies ModelMeta
export const CartLineSchema = z.object({
  id: z.uuid().nullish(),
  cart: z.uuid(),
  variant: z.uuid(),
  quantity: z.number().int(),
  unit: z.string().max(20).nullish(),
  quoted_unit_price: decimalString(12, 2).nullish(),
  price_validated_at: z.iso.datetime({ offset: true }).nullish(),
  stock_status: z.enum(["available", "limited", "unavailable", "unknown"]).nullish(),
  seller: z.uuid().nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type CartLine = z.infer<typeof CartLineSchema>
export const CartLineWriteSchema = CartLineSchema.omit({ cart: true, unit: true, quoted_unit_price: true, price_validated_at: true, stock_status: true, seller: true, updated_at: true })
export const CartLineMeta = {
  "key": "cart_line",
  "actions": [
    {
      "icon": "trash",
      "kind": "archive",
      "label": "Remove",
      "name": "remove",
      "policy": "cart_line.remove"
    }
  ],
  "displayField": "id",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Cart",
      "name": "cart",
      "readOnly": true,
      "relation": {
        "display": "id",
        "model": "cart"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Product",
      "name": "variant",
      "relation": {
        "display": "sku",
        "model": "variant"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "help": "In packs; at least the minimum order.",
      "label": "Quantity",
      "name": "quantity",
      "required": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Unit",
      "maxLength": 20,
      "name": "unit",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Price when added",
      "maxDigits": 12,
      "name": "quoted_unit_price",
      "readOnly": true,
      "type": "decimal",
      "widget": "currency"
    },
    {
      "label": "Price checked",
      "name": "price_validated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "choices": [
        {
          "label": "Available",
          "tone": "success",
          "value": "available"
        },
        {
          "label": "Limited",
          "tone": "warning",
          "value": "limited"
        },
        {
          "label": "Unavailable",
          "tone": "danger",
          "value": "unavailable"
        },
        {
          "label": "Not reported",
          "tone": "neutral",
          "value": "unknown"
        }
      ],
      "label": "Stock",
      "name": "stock_status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Seller",
      "name": "seller",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Cart line",
  "labelPlural": "Cart lines",
  "list": {
    "defaultPageSize": 100,
    "fields": [
      "variant",
      "quantity",
      "quoted_unit_price",
      "stock_status"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-updated_at"
  ],
  "path": "cart-lines",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const CatalogProductSchema = z.object({
  id: z.uuid().nullish(),
  primary_image: z.unknown().nullish(),
  name: z.string().max(160).min(1),
  category_contract: z.uuid(),
  category: z.uuid(),
  brand: z.string().max(80).nullish(),
  short_description: z.string().nullish(),
  description: z.unknown().nullish(),
  attributes: z.unknown().nullish(),
  slug: z.string().max(160).nullish(),
  available_from: z.iso.datetime({ offset: true }).nullish(),
  available_until: z.iso.datetime({ offset: true }).nullish(),
  seo_title: z.string().max(70).nullish(),
  seo_description: z.string().nullish(),
  status: z.enum(["draft", "published", "suspended", "archived"]).nullish(),
  variant_count: z.number().int().nullish(),
  published_at: z.iso.datetime({ offset: true }).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type CatalogProduct = z.infer<typeof CatalogProductSchema>
export const CatalogProductWriteSchema = CatalogProductSchema.omit({ primary_image: true, category: true, status: true, variant_count: true, published_at: true, updated_at: true })
export const CatalogProductMeta = {
  "key": "catalog_product",
  "actions": [
    {
      "icon": "check",
      "kind": "command",
      "label": "Publish",
      "name": "publish",
      "policy": "catalog_product.publish",
      "when": {
        "status": [
          "draft"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Take off sale",
      "name": "unpublish",
      "policy": "catalog_product.publish",
      "tone": "warning",
      "when": {
        "status": [
          "published"
        ]
      }
    },
    {
      "confirm": true,
      "icon": "archive",
      "kind": "command",
      "label": "Archive",
      "name": "archive",
      "policy": "catalog_product.archive",
      "tone": "danger",
      "when": {
        "status": [
          "draft",
          "published"
        ]
      }
    },
    {
      "kind": "command",
      "label": "Restore as draft",
      "name": "restore",
      "policy": "catalog_product.archive",
      "when": {
        "status": [
          "archived"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Photo",
      "name": "primary_image",
      "readOnly": true,
      "type": "image",
      "weight": 5,
      "widget": "image"
    },
    {
      "label": "Product",
      "maxLength": 160,
      "name": "name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "help": "The category's published contract decides which details the product needs.",
      "label": "Category",
      "name": "category_contract",
      "relation": {
        "display": "name",
        "model": "category_contract"
      },
      "required": true,
      "type": "relation",
      "weight": 12,
      "widget": "relation"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Category",
      "name": "category",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "category"
      },
      "required": true,
      "type": "relation",
      "weight": 13,
      "widget": "relation"
    },
    {
      "label": "Brand",
      "maxLength": 80,
      "name": "brand",
      "type": "string",
      "weight": 14,
      "widget": "text"
    },
    {
      "help": "One or two plain sentences for product cards and search.",
      "label": "Summary",
      "name": "short_description",
      "type": "text",
      "weight": 15,
      "widget": "textarea"
    },
    {
      "label": "Description",
      "name": "description",
      "type": "richtext",
      "weight": 20,
      "widget": "richtext"
    },
    {
      "label": "Details",
      "name": "attributes",
      "type": "json",
      "weight": 25,
      "widget": "json"
    },
    {
      "group": "listing",
      "help": "The public address. Leave empty to make one from the name.",
      "label": "Slug",
      "maxLength": 160,
      "name": "slug",
      "type": "string",
      "weight": 30,
      "widget": "text"
    },
    {
      "group": "listing",
      "label": "Listed from",
      "name": "available_from",
      "type": "datetime",
      "weight": 31,
      "widget": "datetime"
    },
    {
      "group": "listing",
      "label": "Listed until",
      "name": "available_until",
      "type": "datetime",
      "weight": 32,
      "widget": "datetime"
    },
    {
      "group": "search",
      "label": "Search title",
      "maxLength": 70,
      "name": "seo_title",
      "type": "string",
      "weight": 40,
      "widget": "text"
    },
    {
      "group": "search",
      "label": "Search description",
      "name": "seo_description",
      "type": "text",
      "weight": 41,
      "widget": "textarea"
    },
    {
      "choices": [
        {
          "label": "Draft",
          "tone": "neutral",
          "value": "draft"
        },
        {
          "label": "Published",
          "tone": "success",
          "value": "published"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        },
        {
          "label": "Archived",
          "tone": "neutral",
          "value": "archived"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Variants",
      "name": "variant_count",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Published",
      "name": "published_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Product",
  "labelPlural": "Products",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "primary_image",
      "name",
      "category",
      "status",
      "variant_count",
      "updated_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-updated_at",
    "name"
  ],
  "path": "catalog/products",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name",
    "brand"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const CategorySchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().max(80).min(1),
  slug: z.string().max(80).min(1),
  parent: z.uuid().nullish(),
  description: z.string().nullish(),
  position: z.number().int().nullish(),
  product_count: z.number().int().nullish(),
})
export type Category = z.infer<typeof CategorySchema>
export const CategoryWriteSchema = CategorySchema.omit({ name: true, slug: true, parent: true, description: true, position: true, product_count: true })
export const CategoryMeta = {
  "key": "category",
  "actions": [],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Slug",
      "maxLength": 80,
      "name": "slug",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq",
        "isnull"
      ],
      "label": "Parent",
      "name": "parent",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "category"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Description",
      "name": "description",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "label": "Position",
      "name": "position",
      "readOnly": true,
      "type": "integer",
      "widget": "hidden"
    },
    {
      "label": "Products",
      "name": "product_count",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    }
  ],
  "label": "Category",
  "labelPlural": "Categories",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "name",
      "product_count"
    ],
    "maxPageSize": 100
  },
  "lookup": "slug",
  "ordering": [
    "position",
    "name"
  ],
  "path": "categories",
  "primaryKey": "id",
  "public": true,
  "search": [
    "name"
  ],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const CategoryContractSchema = z.object({
  id: z.uuid().nullish(),
  category: z.uuid(),
  name: z.string().max(80).min(1),
  version: z.number().int().nullish(),
  status: z.enum(["draft", "published", "retired"]).nullish(),
  attribute_schema: z.unknown().nullish(),
  unit_rules: z.unknown().nullish(),
  facet_keys: z.unknown().nullish(),
  comparison_keys: z.unknown().nullish(),
  display_recipe: z.unknown().nullish(),
  seller_guidance: z.unknown().nullish(),
  buyer_guidance: z.unknown().nullish(),
  predecessor: z.uuid().nullish(),
  published_by: z.uuid().nullish(),
  published_at: z.iso.datetime({ offset: true }).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type CategoryContract = z.infer<typeof CategoryContractSchema>
export const CategoryContractWriteSchema = CategoryContractSchema.omit({ version: true, status: true, predecessor: true, published_by: true, published_at: true, updated_at: true })
export const CategoryContractMeta = {
  "key": "category_contract",
  "actions": [
    {
      "confirm": true,
      "icon": "check",
      "kind": "command",
      "label": "Publish",
      "name": "publish",
      "policy": "category_contract.publish",
      "when": {
        "status": [
          "draft"
        ]
      }
    },
    {
      "icon": "copy",
      "kind": "command",
      "label": "New draft",
      "name": "revise",
      "policy": "category_contract.revise",
      "when": {
        "status": [
          "published"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Category",
      "name": "category",
      "relation": {
        "display": "name",
        "model": "category"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "help": "What buyers see; publishing renames the category.",
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "label": "Version",
      "name": "version",
      "readOnly": true,
      "type": "integer",
      "weight": 15,
      "widget": "integer"
    },
    {
      "choices": [
        {
          "label": "Draft",
          "tone": "info",
          "value": "draft"
        },
        {
          "label": "Published",
          "tone": "success",
          "value": "published"
        },
        {
          "label": "Retired",
          "tone": "neutral",
          "value": "retired"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "weight": 20,
      "widget": "status"
    },
    {
      "label": "Attributes",
      "name": "attribute_schema",
      "type": "json",
      "weight": 30,
      "widget": "json"
    },
    {
      "label": "Units",
      "name": "unit_rules",
      "type": "json",
      "weight": 31,
      "widget": "json"
    },
    {
      "label": "Buyer filters",
      "name": "facet_keys",
      "type": "json",
      "weight": 32,
      "widget": "json"
    },
    {
      "label": "Compared attributes",
      "name": "comparison_keys",
      "type": "json",
      "weight": 33,
      "widget": "json"
    },
    {
      "label": "Display",
      "name": "display_recipe",
      "type": "json",
      "weight": 34,
      "widget": "json"
    },
    {
      "label": "Guidance for sellers",
      "name": "seller_guidance",
      "type": "richtext",
      "weight": 40,
      "widget": "richtext"
    },
    {
      "label": "Guidance for buyers",
      "name": "buyer_guidance",
      "type": "richtext",
      "weight": 41,
      "widget": "richtext"
    },
    {
      "label": "Previous version",
      "name": "predecessor",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "category_contract"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Published by",
      "name": "published_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Published",
      "name": "published_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Category contract",
  "labelPlural": "Category contracts",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "category",
      "version",
      "status",
      "updated_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-updated_at",
    "name",
    "-version"
  ],
  "path": "category-contracts",
  "primaryKey": "id",
  "public": true,
  "search": [
    "name"
  ],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const FulfillmentTaskSchema = z.object({
  id: z.uuid().nullish(),
  order: z.uuid(),
  status: z.enum(["queued", "picking", "packed", "handed_over", "cancelled"]).nullish(),
  assigned_to: z.uuid().nullish(),
  packages: z.number().int().nullish(),
  weight_kg: decimalString(8, 2).nullish(),
  driver_name: z.string().max(80).nullish(),
  vehicle_registration: z.string().max(20).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
  handed_over_at: z.iso.datetime({ offset: true }).nullish(),
})
export type FulfillmentTask = z.infer<typeof FulfillmentTaskSchema>
export const FulfillmentTaskWriteSchema = FulfillmentTaskSchema.omit({ order: true, status: true, assigned_to: true, created_at: true, handed_over_at: true })
export const FulfillmentTaskMeta = {
  "key": "fulfillment_task",
  "actions": [
    {
      "icon": "package",
      "kind": "command",
      "label": "Start picking",
      "name": "start",
      "policy": "fulfillment_task.update",
      "when": {
        "status": [
          "queued"
        ]
      }
    },
    {
      "input": [
        "picks"
      ],
      "kind": "command",
      "label": "Record picks",
      "name": "record_picks",
      "policy": "fulfillment_task.update",
      "when": {
        "status": [
          "queued",
          "picking"
        ]
      }
    },
    {
      "icon": "package-check",
      "input": [
        "packages",
        "weight_kg"
      ],
      "kind": "command",
      "label": "Packed",
      "name": "pack",
      "policy": "fulfillment_task.update",
      "when": {
        "status": [
          "picking"
        ]
      }
    },
    {
      "icon": "truck",
      "input": [
        "carrier_name",
        "carrier_reference",
        "estimated_end_at",
        "driver_name",
        "vehicle_registration",
        "evidence_file"
      ],
      "kind": "command",
      "label": "Hand over",
      "name": "hand_over",
      "policy": "fulfillment_task.update",
      "when": {
        "status": [
          "packed"
        ]
      }
    }
  ],
  "displayField": "order",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Order",
      "name": "order",
      "readOnly": true,
      "relation": {
        "display": "order_number",
        "model": "order"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "choices": [
        {
          "label": "To pick",
          "tone": "info",
          "value": "queued"
        },
        {
          "label": "Picking",
          "tone": "signal",
          "value": "picking"
        },
        {
          "label": "Packed",
          "tone": "warning",
          "value": "packed"
        },
        {
          "label": "Handed over",
          "tone": "success",
          "value": "handed_over"
        },
        {
          "label": "Cancelled",
          "tone": "neutral",
          "value": "cancelled"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Picker",
      "name": "assigned_to",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Packages",
      "name": "packages",
      "type": "integer",
      "widget": "integer"
    },
    {
      "decimalPlaces": 2,
      "label": "Total weight (kg)",
      "maxDigits": 8,
      "name": "weight_kg",
      "type": "decimal",
      "widget": "decimal"
    },
    {
      "label": "Driver",
      "maxLength": 80,
      "name": "driver_name",
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Vehicle registration",
      "maxLength": 20,
      "name": "vehicle_registration",
      "type": "string",
      "widget": "code"
    },
    {
      "filter": [
        "range"
      ],
      "label": "Queued",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Handed over at",
      "name": "handed_over_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "help": "For each line: packs picked, and why if short.",
      "inputOnly": true,
      "label": "Picks",
      "name": "picks",
      "type": "json",
      "widget": "json"
    },
    {
      "inputOnly": true,
      "label": "Carrier",
      "maxLength": 80,
      "name": "carrier_name",
      "type": "string",
      "widget": "text"
    },
    {
      "inputOnly": true,
      "label": "Tracking reference",
      "maxLength": 80,
      "name": "carrier_reference",
      "type": "string",
      "widget": "code"
    },
    {
      "inputOnly": true,
      "label": "Expected by",
      "name": "estimated_end_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "help": "The loaded goods with the delivery note.",
      "inputOnly": true,
      "label": "Handover photo",
      "name": "evidence_file",
      "type": "file",
      "widget": "file"
    }
  ],
  "label": "Pick list",
  "labelPlural": "Pick lists",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "order",
      "status",
      "assigned_to",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "created_at",
    "-created_at"
  ],
  "path": "fulfilment/tasks",
  "primaryKey": "id",
  "public": false,
  "search": [
    "order"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const InventoryBalanceSchema = z.object({
  id: z.uuid().nullish(),
  variant: z.uuid(),
  location: z.uuid(),
  bin_label: z.string().max(20).nullish(),
  on_hand: z.number().int().nullish(),
  reserved: z.number().int().nullish(),
  allocated: z.number().int().nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
  product: z.uuid().nullish(),
  available: z.number().int().nullish(),
  stock_state: z.enum(["ok", "low", "out"]).nullish(),
})
export type InventoryBalance = z.infer<typeof InventoryBalanceSchema>
export const InventoryBalanceWriteSchema = InventoryBalanceSchema.omit({ location: true, on_hand: true, reserved: true, allocated: true, updated_at: true, product: true, available: true, stock_state: true })
export const InventoryBalanceMeta = {
  "key": "inventory_balance",
  "actions": [
    {
      "icon": "plus",
      "input": [
        "quantity",
        "note"
      ],
      "kind": "command",
      "label": "Receive goods",
      "name": "receive",
      "policy": "inventory.receive"
    },
    {
      "input": [
        "quantity_change",
        "reason_code",
        "note"
      ],
      "kind": "command",
      "label": "Adjust stock",
      "name": "adjust",
      "policy": "inventory.adjust",
      "tone": "warning"
    }
  ],
  "displayField": "product",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Pack",
      "name": "variant",
      "relation": {
        "display": "sku",
        "model": "variant"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Location",
      "name": "location",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "location"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "help": "Where the pack sits, such as A-03.",
      "label": "Bin",
      "maxLength": 20,
      "name": "bin_label",
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "label": "On hand",
      "name": "on_hand",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Held for checkouts",
      "name": "reserved",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Allocated to paid orders",
      "name": "allocated",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Product",
      "name": "product",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "product"
      },
      "type": "relation",
      "weight": 1,
      "widget": "relation"
    },
    {
      "help": "On hand less the packs held for checkouts and allocated to paid orders.",
      "label": "Available",
      "name": "available",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "choices": [
        {
          "label": "In stock",
          "tone": "success",
          "value": "ok"
        },
        {
          "label": "Running low",
          "tone": "warning",
          "value": "low"
        },
        {
          "label": "Below one order",
          "tone": "danger",
          "value": "out"
        }
      ],
      "label": "Stock",
      "name": "stock_state",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "help": "Whole packs, as counted at the door.",
      "inputOnly": true,
      "label": "Packs received",
      "name": "quantity",
      "type": "integer",
      "widget": "integer"
    },
    {
      "help": "Positive to add packs, negative to remove them.",
      "inputOnly": true,
      "label": "Change on hand",
      "name": "quantity_change",
      "type": "integer",
      "widget": "integer"
    },
    {
      "choices": [
        {
          "label": "Stock count correction",
          "value": "count"
        },
        {
          "label": "Damaged in the warehouse",
          "value": "damage"
        },
        {
          "label": "Lost or stolen",
          "value": "loss"
        },
        {
          "label": "Found in the warehouse",
          "value": "found"
        },
        {
          "label": "Past its date",
          "value": "expired"
        },
        {
          "label": "Other (explain in the note)",
          "value": "other"
        }
      ],
      "inputOnly": true,
      "label": "Why",
      "name": "reason_code",
      "type": "enum",
      "widget": "select"
    },
    {
      "help": "Delivery note number, count sheet, who checked.",
      "inputOnly": true,
      "label": "Note",
      "maxLength": 300,
      "name": "note",
      "type": "text",
      "widget": "textarea"
    }
  ],
  "label": "Stock balance",
  "labelPlural": "Stock balances",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "product",
      "variant",
      "available",
      "stock_state",
      "on_hand",
      "reserved",
      "allocated",
      "bin_label"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "variant",
    "-updated_at",
    "on_hand"
  ],
  "path": "inventory/balances",
  "primaryKey": "id",
  "public": false,
  "search": [
    "variant"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const InventoryMovementSchema = z.object({
  id: z.uuid().nullish(),
  occurred_at: z.iso.datetime({ offset: true }),
  variant: z.uuid(),
  movement_type: z.enum(["receipt", "reservation", "release", "allocation", "adjustment", "shipment", "return"]),
  quantity: z.number().int(),
  available_after: z.number().int(),
  on_hand_after: z.number().int(),
  unit: z.string().max(20).min(1),
  reference_label: z.string().max(80).nullish(),
  reason_code: z.enum(["count", "damage", "loss", "found", "expired", "other"]).nullish(),
  note: z.string().max(300).nullish(),
  actor: z.uuid().nullish(),
})
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>
export const InventoryMovementWriteSchema = InventoryMovementSchema.omit({ occurred_at: true, variant: true, movement_type: true, quantity: true, available_after: true, on_hand_after: true, unit: true, reference_label: true, reason_code: true, note: true, actor: true })
export const InventoryMovementMeta = {
  "key": "inventory_movement",
  "actions": [],
  "displayField": "reference_label",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "range"
      ],
      "label": "When",
      "name": "occurred_at",
      "readOnly": true,
      "required": true,
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Pack",
      "name": "variant",
      "readOnly": true,
      "relation": {
        "display": "sku",
        "model": "variant"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "choices": [
        {
          "label": "Receipt",
          "tone": "success",
          "value": "receipt"
        },
        {
          "label": "Reservation",
          "tone": "signal",
          "value": "reservation"
        },
        {
          "label": "Release",
          "tone": "info",
          "value": "release"
        },
        {
          "label": "Allocation",
          "tone": "info",
          "value": "allocation"
        },
        {
          "label": "Adjustment",
          "tone": "warning",
          "value": "adjustment"
        },
        {
          "label": "Shipment",
          "tone": "neutral",
          "value": "shipment"
        },
        {
          "label": "Return to stock",
          "tone": "success",
          "value": "return"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Movement",
      "name": "movement_type",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Change in available",
      "name": "quantity",
      "readOnly": true,
      "required": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Available after",
      "name": "available_after",
      "readOnly": true,
      "required": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "On hand after",
      "name": "on_hand_after",
      "readOnly": true,
      "required": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Unit",
      "maxLength": 20,
      "name": "unit",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Reference",
      "maxLength": 80,
      "name": "reference_label",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Stock count correction",
          "value": "count"
        },
        {
          "label": "Damaged in the warehouse",
          "value": "damage"
        },
        {
          "label": "Lost or stolen",
          "value": "loss"
        },
        {
          "label": "Found in the warehouse",
          "value": "found"
        },
        {
          "label": "Past its date",
          "value": "expired"
        },
        {
          "label": "Other (explain in the note)",
          "value": "other"
        }
      ],
      "label": "Reason",
      "name": "reason_code",
      "readOnly": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "Note",
      "maxLength": 300,
      "name": "note",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Actor",
      "name": "actor",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    }
  ],
  "label": "Stock movement",
  "labelPlural": "Stock movements",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "occurred_at",
      "variant",
      "movement_type",
      "quantity",
      "available_after",
      "reference_label"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-occurred_at"
  ],
  "path": "inventory/movements",
  "primaryKey": "id",
  "public": false,
  "search": [
    "reference_label",
    "note"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const MediaAssetSchema = z.object({
  id: z.uuid().nullish(),
  product: z.uuid().nullish(),
  variant: z.uuid().nullish(),
  original_name: z.string().max(160).min(1),
  alt_text: z.string().max(200).min(1),
  sort_order: z.number().int().nullish(),
  mime_type: z.string().max(40).min(1),
  size_bytes: z.number().int(),
  width_px: z.number().int().nullish(),
  height_px: z.number().int().nullish(),
  scan_status: z.enum(["pending", "clean", "rejected", "failed"]).nullish(),
  processing_status: z.enum(["queued", "processing", "ready", "failed"]).nullish(),
  rejection_reason: z.string().max(200).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type MediaAsset = z.infer<typeof MediaAssetSchema>
export const MediaAssetWriteSchema = MediaAssetSchema.omit({ product: true, original_name: true, mime_type: true, size_bytes: true, width_px: true, height_px: true, scan_status: true, processing_status: true, rejection_reason: true, created_at: true })
export const MediaAssetMeta = {
  "key": "media_asset",
  "actions": [
    {
      "confirm": true,
      "icon": "trash",
      "kind": "archive",
      "label": "Remove",
      "name": "remove",
      "policy": "media_asset.remove",
      "tone": "danger"
    }
  ],
  "displayField": "original_name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Product",
      "name": "product",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "catalog_product"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Variant",
      "name": "variant",
      "relation": {
        "display": "sku",
        "model": "variant"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "File",
      "maxLength": 160,
      "name": "original_name",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "help": "What the photograph shows, for people who cannot see it.",
      "label": "Description",
      "maxLength": 200,
      "name": "alt_text",
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "default": 0,
      "label": "Order",
      "name": "sort_order",
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Type",
      "maxLength": 40,
      "name": "mime_type",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Size",
      "name": "size_bytes",
      "readOnly": true,
      "required": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Width",
      "name": "width_px",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Height",
      "name": "height_px",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "choices": [
        {
          "label": "Checking",
          "tone": "info",
          "value": "pending"
        },
        {
          "label": "Clean",
          "tone": "success",
          "value": "clean"
        },
        {
          "label": "Rejected",
          "tone": "danger",
          "value": "rejected"
        },
        {
          "label": "Could not check",
          "tone": "warning",
          "value": "failed"
        }
      ],
      "label": "Check",
      "name": "scan_status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "choices": [
        {
          "label": "Queued",
          "tone": "neutral",
          "value": "queued"
        },
        {
          "label": "Processing",
          "tone": "info",
          "value": "processing"
        },
        {
          "label": "Ready",
          "tone": "success",
          "value": "ready"
        },
        {
          "label": "Failed",
          "tone": "danger",
          "value": "failed"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Processing",
      "name": "processing_status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Why it was rejected",
      "maxLength": 200,
      "name": "rejection_reason",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Photograph",
  "labelPlural": "Photographs",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "original_name",
      "alt_text",
      "processing_status",
      "scan_status",
      "sort_order"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "sort_order",
    "-created_at"
  ],
  "path": "catalog/media",
  "primaryKey": "id",
  "public": false,
  "search": [
    "original_name",
    "alt_text"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const MembershipSchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().nullish(),
  email: z.email(),
  user: z.uuid(),
  organization: z.uuid(),
  role_key: z.enum(["buyer_owner", "buyer_purchaser", "seller_manager", "warehouse_operator", "marketplace_admin"]),
  status: z.enum(["invited", "active", "suspended", "removed"]).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Membership = z.infer<typeof MembershipSchema>
export const MembershipWriteSchema = MembershipSchema.omit({ name: true, user: true, organization: true, status: true, created_at: true })
export const MembershipMeta = {
  "key": "membership",
  "actions": [
    {
      "icon": "pencil",
      "input": [
        "role_key"
      ],
      "kind": "update",
      "label": "Change role",
      "name": "change_role",
      "policy": "membership.update",
      "when": {
        "status": [
          "invited",
          "active",
          "suspended"
        ]
      }
    },
    {
      "icon": "mail",
      "kind": "command",
      "label": "Resend invitation",
      "name": "resend",
      "policy": "membership.invite",
      "when": {
        "status": [
          "invited"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Suspend",
      "name": "suspend",
      "policy": "membership.update",
      "tone": "warning",
      "when": {
        "status": [
          "active"
        ]
      }
    },
    {
      "kind": "command",
      "label": "Reactivate",
      "name": "reactivate",
      "policy": "membership.update",
      "when": {
        "status": [
          "suspended"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "archive",
      "label": "Remove from organization",
      "name": "remove",
      "policy": "membership.update",
      "tone": "danger",
      "when": {
        "status": [
          "invited",
          "active",
          "suspended"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Name",
      "name": "name",
      "readOnly": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "label": "Email",
      "name": "email",
      "required": true,
      "type": "email",
      "weight": 20,
      "widget": "email"
    },
    {
      "label": "User",
      "name": "user",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "required": true,
      "type": "relation",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Organization",
      "name": "organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "hidden"
    },
    {
      "choices": [
        {
          "label": "Buyer owner",
          "value": "buyer_owner"
        },
        {
          "label": "Buyer purchaser",
          "value": "buyer_purchaser"
        },
        {
          "label": "Seller manager",
          "value": "seller_manager"
        },
        {
          "label": "Warehouse operator",
          "value": "warehouse_operator"
        },
        {
          "label": "Marketplace administrator",
          "value": "marketplace_admin"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Role",
      "name": "role_key",
      "required": true,
      "type": "enum",
      "weight": 30,
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "Invited",
          "tone": "info",
          "value": "invited"
        },
        {
          "label": "Active",
          "tone": "success",
          "value": "active"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        },
        {
          "label": "Removed",
          "tone": "neutral",
          "value": "removed"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "weight": 40,
      "widget": "status"
    },
    {
      "label": "Joined",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "weight": 50,
      "widget": "relative-time"
    }
  ],
  "label": "Member",
  "labelPlural": "Members",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "email",
      "role_key",
      "status",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "name",
    "-created_at"
  ],
  "path": "memberships",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name",
    "email"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const MetricDefinitionSchema = z.object({
  id: z.uuid().nullish(),
  key: z.string().max(40).min(1),
  name: z.string().max(80).min(1),
  aggregation: z.enum(["sum", "count", "avg", "ratio"]),
  source_entity: z.enum(["order", "order_line", "variant"]),
  unit: z.string().max(20).nullish(),
  better: z.enum(["higher", "lower"]).nullish(),
  description: z.string().nullish(),
  dimensions_json: z.unknown().nullish(),
  version: z.number().int().nullish(),
})
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>
export const MetricDefinitionWriteSchema = MetricDefinitionSchema.omit({ key: true, name: true, aggregation: true, source_entity: true, unit: true, better: true, description: true, dimensions_json: true, version: true })
export const MetricDefinitionMeta = {
  "key": "metric_definition",
  "actions": [],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Key",
      "maxLength": 40,
      "name": "key",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "label": "Name",
      "maxLength": 80,
      "name": "name",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Sum",
          "value": "sum"
        },
        {
          "label": "Count",
          "value": "count"
        },
        {
          "label": "Average",
          "value": "avg"
        },
        {
          "label": "Ratio",
          "value": "ratio"
        }
      ],
      "label": "Aggregation",
      "name": "aggregation",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "Orders",
          "value": "order"
        },
        {
          "label": "Order lines",
          "value": "order_line"
        },
        {
          "label": "Variants (stock now)",
          "value": "variant"
        }
      ],
      "label": "Source",
      "name": "source_entity",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "Unit",
      "maxLength": 20,
      "name": "unit",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Higher",
          "value": "higher"
        },
        {
          "label": "Lower",
          "value": "lower"
        }
      ],
      "label": "Better when",
      "name": "better",
      "readOnly": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "What it means",
      "name": "description",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "label": "Breakdowns",
      "name": "dimensions_json",
      "readOnly": true,
      "type": "json",
      "widget": "json"
    },
    {
      "label": "Version",
      "name": "version",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    }
  ],
  "label": "Metric",
  "labelPlural": "Metrics",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "name",
      "key",
      "aggregation",
      "unit",
      "version"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "key",
    "-version"
  ],
  "path": "metric-definitions",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name",
    "key"
  ],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const NotificationSchema = z.object({
  id: z.uuid().nullish(),
  event_key: z.enum(["order", "approval", "quote", "payment", "delivery", "account"]),
  title: z.string().max(160).min(1),
  body_text: z.string().min(1),
  deep_link: z.string().max(300).nullish(),
  status: z.enum(["queued", "sent", "failed", "read"]).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
  read_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Notification = z.infer<typeof NotificationSchema>
export const NotificationWriteSchema = NotificationSchema.omit({ event_key: true, title: true, body_text: true, deep_link: true, status: true, created_at: true, read_at: true })
export const NotificationMeta = {
  "key": "notification",
  "actions": [
    {
      "icon": "check",
      "kind": "command",
      "label": "Mark as read",
      "name": "read",
      "policy": "self",
      "when": {
        "status": [
          "queued",
          "sent"
        ]
      }
    }
  ],
  "displayField": "title",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "choices": [
        {
          "label": "Orders",
          "value": "order"
        },
        {
          "label": "Approvals",
          "value": "approval"
        },
        {
          "label": "Quotes",
          "value": "quote"
        },
        {
          "label": "Payments",
          "value": "payment"
        },
        {
          "label": "Deliveries",
          "value": "delivery"
        },
        {
          "label": "Account and team",
          "value": "account"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Event",
      "name": "event_key",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "Title",
      "maxLength": 160,
      "name": "title",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Message",
      "name": "body_text",
      "readOnly": true,
      "required": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "label": "Link",
      "maxLength": 300,
      "name": "deep_link",
      "readOnly": true,
      "type": "string",
      "widget": "url"
    },
    {
      "choices": [
        {
          "label": "Queued",
          "tone": "neutral",
          "value": "queued"
        },
        {
          "label": "Sent",
          "tone": "signal",
          "value": "sent"
        },
        {
          "label": "Failed",
          "tone": "danger",
          "value": "failed"
        },
        {
          "label": "Read",
          "tone": "neutral",
          "value": "read"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "filter": [
        "range"
      ],
      "label": "Received",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Read",
      "name": "read_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Notification",
  "labelPlural": "Notifications",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "title",
      "event_key",
      "status",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-created_at"
  ],
  "path": "notifications",
  "primaryKey": "id",
  "public": false,
  "search": [
    "title",
    "body_text"
  ],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const NotificationPreferenceSchema = z.object({
  id: z.uuid().nullish(),
  event_key: z.enum(["order", "approval", "quote", "payment", "delivery", "account"]),
  channel: z.enum(["in_app", "email"]),
  enabled: z.boolean().nullish(),
  locale: z.enum(["en-KE", "sw-KE"]).nullish(),
})
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>
export const NotificationPreferenceWriteSchema = NotificationPreferenceSchema.omit({ event_key: true, channel: true, locale: true })
export const NotificationPreferenceMeta = {
  "key": "notification_preference",
  "actions": [],
  "displayField": "event_key",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "choices": [
        {
          "label": "Orders",
          "value": "order"
        },
        {
          "label": "Approvals",
          "value": "approval"
        },
        {
          "label": "Quotes",
          "value": "quote"
        },
        {
          "label": "Payments",
          "value": "payment"
        },
        {
          "label": "Deliveries",
          "value": "delivery"
        },
        {
          "label": "Account and team",
          "value": "account"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Event",
      "name": "event_key",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "In the app",
          "value": "in_app"
        },
        {
          "label": "Email",
          "value": "email"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Channel",
      "name": "channel",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "widget": "select"
    },
    {
      "default": true,
      "label": "Enabled",
      "name": "enabled",
      "type": "boolean",
      "widget": "boolean"
    },
    {
      "choices": [
        {
          "label": "English",
          "value": "en-KE"
        },
        {
          "label": "Kiswahili",
          "value": "sw-KE"
        }
      ],
      "label": "Language",
      "maxLength": 10,
      "name": "locale",
      "readOnly": true,
      "type": "enum",
      "widget": "select"
    }
  ],
  "label": "Notification preference",
  "labelPlural": "Notification preferences",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "event_key",
      "channel",
      "enabled"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "event_key"
  ],
  "path": "notification-preferences",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const OrderSchema = z.object({
  id: z.uuid().nullish(),
  order_number: z.string().max(20).min(1),
  seller_organization: z.uuid(),
  buyer_organization: z.uuid(),
  submitted_by: z.uuid().nullish(),
  delivery_address: z.uuid().nullish(),
  status: z.enum(["pending_approval", "awaiting_payment", "submitted", "confirmed", "picking", "partially_fulfilled", "shipped", "delivered", "cancelled", "disputed"]).nullish(),
  submitted_at: z.iso.datetime({ offset: true }),
  subtotal: decimalString(14, 2),
  total: decimalString(14, 2),
  special_instructions: z.string().nullish(),
})
export type Order = z.infer<typeof OrderSchema>
export const OrderWriteSchema = OrderSchema.omit({ order_number: true, seller_organization: true, buyer_organization: true, submitted_by: true, delivery_address: true, status: true, submitted_at: true, subtotal: true, total: true, special_instructions: true })
export const OrderMeta = {
  "key": "order",
  "actions": [
    {
      "icon": "check",
      "input": [
        "comment"
      ],
      "kind": "command",
      "label": "Approve order",
      "name": "approve",
      "policy": "order.approve",
      "when": {
        "status": [
          "pending_approval"
        ]
      }
    },
    {
      "input": [
        "comment"
      ],
      "kind": "command",
      "label": "Reject",
      "name": "reject",
      "policy": "order.approve",
      "tone": "danger",
      "when": {
        "status": [
          "pending_approval"
        ]
      }
    },
    {
      "icon": "smartphone",
      "input": [
        "phone"
      ],
      "kind": "command",
      "label": "Pay with M-Pesa",
      "name": "pay",
      "policy": "order.pay",
      "when": {
        "status": [
          "awaiting_payment"
        ]
      }
    },
    {
      "icon": "check",
      "kind": "command",
      "label": "Confirm order",
      "name": "confirm",
      "policy": "order.fulfil",
      "when": {
        "status": [
          "submitted"
        ]
      }
    },
    {
      "kind": "command",
      "label": "Start picking",
      "name": "start_picking",
      "policy": "order.fulfil",
      "when": {
        "status": [
          "confirmed"
        ]
      }
    },
    {
      "input": [
        "reason"
      ],
      "kind": "command",
      "label": "Short-ship",
      "name": "mark_partial",
      "policy": "order.fulfil",
      "tone": "warning",
      "when": {
        "status": [
          "picking"
        ]
      }
    },
    {
      "icon": "truck",
      "input": [
        "carrier_name",
        "carrier_reference",
        "estimated_start_at",
        "estimated_end_at"
      ],
      "kind": "command",
      "label": "Ship",
      "name": "ship",
      "policy": "order.fulfil",
      "when": {
        "status": [
          "confirmed",
          "picking",
          "partially_fulfilled"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Mark delivered",
      "name": "mark_delivered",
      "policy": "order.fulfil",
      "when": {
        "status": [
          "shipped"
        ]
      }
    },
    {
      "input": [
        "reason"
      ],
      "kind": "command",
      "label": "Cancel order",
      "name": "cancel",
      "policy": "order.cancel",
      "tone": "danger",
      "when": {
        "status": [
          "pending_approval",
          "awaiting_payment",
          "submitted",
          "confirmed",
          "picking"
        ]
      }
    },
    {
      "input": [
        "reason"
      ],
      "kind": "command",
      "label": "Report a problem",
      "name": "dispute",
      "policy": "order.dispute",
      "tone": "danger",
      "when": {
        "status": [
          "shipped",
          "delivered"
        ]
      }
    },
    {
      "icon": "copy",
      "kind": "command",
      "label": "Reorder",
      "name": "reorder",
      "policy": "order.reorder"
    }
  ],
  "displayField": "order_number",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Order",
      "maxLength": 20,
      "name": "order_number",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Seller",
      "name": "seller_organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Buyer",
      "name": "buyer_organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Placed by",
      "name": "submitted_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Deliver to",
      "name": "delivery_address",
      "readOnly": true,
      "relation": {
        "display": "label",
        "model": "address"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "choices": [
        {
          "label": "Awaiting approval",
          "tone": "warning",
          "value": "pending_approval"
        },
        {
          "label": "Awaiting payment",
          "value": "awaiting_payment"
        },
        {
          "label": "Submitted",
          "tone": "info",
          "value": "submitted"
        },
        {
          "label": "Confirmed",
          "tone": "info",
          "value": "confirmed"
        },
        {
          "label": "Picking",
          "tone": "signal",
          "value": "picking"
        },
        {
          "label": "Partly fulfilled",
          "tone": "warning",
          "value": "partially_fulfilled"
        },
        {
          "label": "Shipped",
          "tone": "signal",
          "value": "shipped"
        },
        {
          "label": "Delivered",
          "tone": "success",
          "value": "delivered"
        },
        {
          "label": "Cancelled",
          "tone": "neutral",
          "value": "cancelled"
        },
        {
          "label": "Disputed",
          "tone": "danger",
          "value": "disputed"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "filter": [
        "range"
      ],
      "label": "Placed",
      "name": "submitted_at",
      "readOnly": true,
      "required": true,
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Subtotal",
      "maxDigits": 14,
      "name": "subtotal",
      "readOnly": true,
      "required": true,
      "type": "decimal",
      "widget": "currency"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "filter": [
        "range"
      ],
      "label": "Total",
      "maxDigits": 14,
      "name": "total",
      "readOnly": true,
      "required": true,
      "type": "decimal",
      "widget": "currency"
    },
    {
      "label": "Delivery notes",
      "name": "special_instructions",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "help": "The other side reads this.",
      "inputOnly": true,
      "label": "Reason",
      "maxLength": 1000,
      "name": "reason",
      "type": "text",
      "widget": "textarea"
    },
    {
      "help": "Kept in the order history.",
      "inputOnly": true,
      "label": "Comment",
      "maxLength": 500,
      "name": "comment",
      "type": "text",
      "widget": "textarea"
    },
    {
      "inputOnly": true,
      "label": "Carrier",
      "maxLength": 80,
      "name": "carrier_name",
      "type": "string",
      "widget": "text"
    },
    {
      "inputOnly": true,
      "label": "Tracking reference",
      "maxLength": 80,
      "name": "carrier_reference",
      "type": "string",
      "widget": "code"
    },
    {
      "inputOnly": true,
      "label": "Expected from",
      "name": "estimated_start_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "inputOnly": true,
      "label": "Expected by",
      "name": "estimated_end_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "help": "The Safaricom number that receives the payment prompt. It is not kept.",
      "inputOnly": true,
      "label": "M-Pesa number",
      "name": "phone",
      "type": "string",
      "widget": "phone"
    }
  ],
  "label": "Order",
  "labelPlural": "Orders",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "order_number",
      "seller_organization",
      "buyer_organization",
      "status",
      "submitted_at",
      "total"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-submitted_at",
    "submitted_at",
    "-total"
  ],
  "path": "orders",
  "primaryKey": "id",
  "public": false,
  "search": [
    "order_number"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const OrganizationSchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().max(160).min(1),
  organization_type: z.enum(["seller", "buyer", "marketplace_admin"]),
  legal_name: z.string().max(200).nullish(),
  tax_identifier: z.string().max(40).nullish(),
  default_currency: z.enum(["KES"]).nullish(),
  timezone: z.enum(["Africa/Nairobi", "Africa/Kampala", "Africa/Dar_es_Salaam", "Africa/Kigali"]).nullish(),
  status: z.enum(["active", "suspended", "archived"]).nullish(),
  approval_state: z.enum(["pending", "approved", "rejected", "suspended"]).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Organization = z.infer<typeof OrganizationSchema>
export const OrganizationWriteSchema = OrganizationSchema.omit({ organization_type: true, status: true, approval_state: true, created_at: true, updated_at: true })
export const OrganizationMeta = {
  "key": "organization",
  "actions": [
    {
      "icon": "check",
      "kind": "command",
      "label": "Approve",
      "name": "approve",
      "policy": "organization.review",
      "tone": "primary",
      "when": {
        "approval_state": [
          "pending",
          "rejected",
          "suspended"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Reject",
      "name": "reject",
      "policy": "organization.review",
      "tone": "danger",
      "when": {
        "approval_state": [
          "pending"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Suspend",
      "name": "suspend",
      "policy": "organization.review",
      "tone": "warning",
      "when": {
        "approval_state": [
          "approved"
        ]
      }
    }
  ],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "The name buyers and sellers see.",
      "label": "Trading name",
      "maxLength": 160,
      "name": "name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Seller",
          "value": "seller"
        },
        {
          "label": "Buyer",
          "value": "buyer"
        },
        {
          "label": "Marketplace administration",
          "value": "marketplace_admin"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Organization type",
      "name": "organization_type",
      "readOnly": true,
      "required": true,
      "type": "enum",
      "weight": 5,
      "widget": "select"
    },
    {
      "label": "Registered legal name",
      "maxLength": 200,
      "name": "legal_name",
      "type": "string",
      "weight": 20,
      "widget": "text"
    },
    {
      "fieldPolicy": {
        "read": "organization.update",
        "write": "organization.update"
      },
      "help": "Tax identifier. Visible only to people who manage this organization.",
      "label": "KRA PIN",
      "maxLength": 40,
      "name": "tax_identifier",
      "type": "string",
      "weight": 30,
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Kenyan shilling (KES)",
          "value": "KES"
        }
      ],
      "default": "KES",
      "label": "Currency",
      "maxLength": 3,
      "name": "default_currency",
      "type": "enum",
      "weight": 40,
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "East Africa Time, Nairobi",
          "value": "Africa/Nairobi"
        },
        {
          "label": "East Africa Time, Kampala",
          "value": "Africa/Kampala"
        },
        {
          "label": "East Africa Time, Dar es Salaam",
          "value": "Africa/Dar_es_Salaam"
        },
        {
          "label": "Central Africa Time, Kigali",
          "value": "Africa/Kigali"
        }
      ],
      "default": "Africa/Nairobi",
      "label": "Time zone",
      "maxLength": 64,
      "name": "timezone",
      "type": "enum",
      "weight": 50,
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "Active",
          "tone": "success",
          "value": "active"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        },
        {
          "label": "Archived",
          "tone": "neutral",
          "value": "archived"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "choices": [
        {
          "label": "Pending review",
          "tone": "info",
          "value": "pending"
        },
        {
          "label": "Approved",
          "tone": "success",
          "value": "approved"
        },
        {
          "label": "Rejected",
          "tone": "danger",
          "value": "rejected"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Approval",
      "name": "approval_state",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Created",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Organization",
  "labelPlural": "Organizations",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "name",
      "organization_type",
      "approval_state",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "name",
    "-created_at"
  ],
  "path": "organizations",
  "primaryKey": "id",
  "public": false,
  "search": [
    "name",
    "legal_name"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const PriceRuleSchema = z.object({
  id: z.uuid().nullish(),
  variant: z.uuid(),
  label: z.string().max(80).nullish(),
  buyer_group_key: z.string().max(40).nullish(),
  minimum_quantity: z.number().int().nullish(),
  unit_price: decimalString(12, 2),
  priority: z.number().int().nullish(),
  effective_from: z.iso.datetime({ offset: true }).nullish(),
  effective_until: z.iso.datetime({ offset: true }).nullish(),
  is_active: z.boolean().nullish(),
  unit: z.string().max(20).nullish(),
  currency: z.string().max(3).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type PriceRule = z.infer<typeof PriceRuleSchema>
export const PriceRuleWriteSchema = PriceRuleSchema.omit({ unit: true, currency: true, updated_at: true })
export const PriceRuleMeta = {
  "key": "price_rule",
  "actions": [
    {
      "confirm": true,
      "icon": "pause",
      "kind": "command",
      "label": "Switch off",
      "name": "switch_off",
      "policy": "price_rule.update",
      "when": {
        "is_active": [
          "true"
        ]
      }
    },
    {
      "icon": "check",
      "kind": "command",
      "label": "Switch on",
      "name": "switch_on",
      "policy": "price_rule.update",
      "when": {
        "is_active": [
          "false"
        ]
      }
    }
  ],
  "displayField": "label",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Variant",
      "name": "variant",
      "relation": {
        "display": "sku",
        "model": "variant"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "help": "For you, such as October promotion.",
      "label": "Name",
      "maxLength": 80,
      "name": "label",
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "filter": [
        "in"
      ],
      "help": "Leave empty for every buyer.",
      "label": "Buyer group",
      "maxLength": 40,
      "name": "buyer_group_key",
      "type": "string",
      "weight": 15,
      "widget": "text"
    },
    {
      "default": 1,
      "help": "In packs.",
      "label": "From quantity",
      "name": "minimum_quantity",
      "type": "integer",
      "weight": 20,
      "widget": "integer"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Price per pack",
      "maxDigits": 12,
      "name": "unit_price",
      "required": true,
      "type": "decimal",
      "weight": 25,
      "widget": "currency"
    },
    {
      "default": 0,
      "help": "Where rules overlap, the higher one wins.",
      "label": "Priority",
      "name": "priority",
      "type": "integer",
      "weight": 30,
      "widget": "integer"
    },
    {
      "label": "Starts",
      "name": "effective_from",
      "type": "datetime",
      "weight": 35,
      "widget": "datetime"
    },
    {
      "label": "Ends",
      "name": "effective_until",
      "type": "datetime",
      "weight": 40,
      "widget": "datetime"
    },
    {
      "default": true,
      "filter": [
        "eq"
      ],
      "label": "On",
      "name": "is_active",
      "type": "boolean",
      "weight": 45,
      "widget": "boolean"
    },
    {
      "label": "Unit",
      "maxLength": 20,
      "name": "unit",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Currency",
      "maxLength": 3,
      "name": "currency",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Price rule",
  "labelPlural": "Price rules",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "label",
      "variant",
      "buyer_group_key",
      "minimum_quantity",
      "unit_price",
      "is_active"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-updated_at",
    "minimum_quantity"
  ],
  "path": "catalog/price-rules",
  "primaryKey": "id",
  "public": false,
  "search": [
    "label"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const ProductSchema = z.object({
  id: z.uuid().nullish(),
  primary_image: z.unknown().nullish(),
  gallery: z.unknown().nullish(),
  name: z.string().max(160).min(1),
  seller: z.uuid(),
  category: z.uuid(),
  slug: z.string().max(160).min(1),
  sku: z.string().max(40).nullish(),
  pack_label: z.string().max(80).nullish(),
  unit_price: decimalString(12, 2).nullish(),
  min_order_quantity: z.number().int().nullish(),
  short_description: z.string().nullish(),
  brand: z.string().max(80).nullish(),
  description: z.unknown().nullish(),
  in_stock: z.boolean().nullish(),
  status: z.enum(["draft", "published", "suspended", "archived"]).nullish(),
  published_at: z.iso.datetime({ offset: true }).nullish(),
  seo_title: z.string().max(70).nullish(),
  seo_description: z.string().nullish(),
})
export type Product = z.infer<typeof ProductSchema>
export const ProductWriteSchema = ProductSchema.omit({ primary_image: true, gallery: true, name: true, seller: true, category: true, slug: true, sku: true, pack_label: true, unit_price: true, min_order_quantity: true, short_description: true, brand: true, description: true, in_stock: true, status: true, published_at: true, seo_title: true, seo_description: true })
export const ProductMeta = {
  "key": "product",
  "actions": [],
  "displayField": "name",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Photo",
      "name": "primary_image",
      "readOnly": true,
      "type": "image",
      "weight": 5,
      "widget": "image"
    },
    {
      "label": "More photos",
      "maxItems": 8,
      "name": "gallery",
      "readOnly": true,
      "type": "image",
      "weight": 6,
      "widget": "image"
    },
    {
      "label": "Product",
      "maxLength": 160,
      "name": "name",
      "readOnly": true,
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Seller",
      "name": "seller",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "role": "subtitle",
      "type": "relation",
      "weight": 20,
      "widget": "relation"
    },
    {
      "filter": [
        "in",
        "eq"
      ],
      "label": "Category",
      "name": "category",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "category"
      },
      "required": true,
      "type": "relation",
      "weight": 25,
      "widget": "relation"
    },
    {
      "help": "Public address, unique across the marketplace.",
      "label": "Slug",
      "maxLength": 160,
      "name": "slug",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "hidden"
    },
    {
      "label": "SKU",
      "maxLength": 40,
      "name": "sku",
      "readOnly": true,
      "type": "string",
      "weight": 30,
      "widget": "code"
    },
    {
      "help": "How it is sold, for example Bale of 12 × 2 kg.",
      "label": "Pack",
      "maxLength": 80,
      "name": "pack_label",
      "readOnly": true,
      "type": "string",
      "weight": 35,
      "widget": "text"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "filter": [
        "range"
      ],
      "help": "The lowest price among the product's variants.",
      "label": "Price per pack",
      "maxDigits": 12,
      "name": "unit_price",
      "readOnly": true,
      "type": "decimal",
      "weight": 40,
      "widget": "currency"
    },
    {
      "label": "Minimum order",
      "name": "min_order_quantity",
      "readOnly": true,
      "type": "integer",
      "weight": 45,
      "widget": "integer"
    },
    {
      "help": "One or two plain sentences for product cards and search.",
      "label": "Summary",
      "name": "short_description",
      "readOnly": true,
      "type": "text",
      "weight": 47,
      "widget": "textarea"
    },
    {
      "label": "Brand",
      "maxLength": 80,
      "name": "brand",
      "readOnly": true,
      "type": "string",
      "weight": 48,
      "widget": "text"
    },
    {
      "label": "Description",
      "name": "description",
      "readOnly": true,
      "type": "richtext",
      "weight": 50,
      "widget": "richtext"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "In stock",
      "name": "in_stock",
      "readOnly": true,
      "type": "boolean",
      "weight": 55,
      "widget": "boolean"
    },
    {
      "choices": [
        {
          "label": "Draft",
          "tone": "neutral",
          "value": "draft"
        },
        {
          "label": "Published",
          "tone": "success",
          "value": "published"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        },
        {
          "label": "Archived",
          "tone": "neutral",
          "value": "archived"
        }
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Published",
      "name": "published_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Search title",
      "maxLength": 70,
      "name": "seo_title",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Search description",
      "name": "seo_description",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    }
  ],
  "label": "Product",
  "labelPlural": "Products",
  "list": {
    "defaultPageSize": 24,
    "fields": [
      "primary_image",
      "name",
      "seller",
      "pack_label",
      "unit_price",
      "min_order_quantity"
    ],
    "maxPageSize": 100
  },
  "lookup": "slug",
  "ordering": [
    "-published_at",
    "unit_price",
    "-unit_price",
    "name"
  ],
  "path": "products",
  "primaryKey": "id",
  "public": true,
  "search": [
    "name",
    "sku"
  ],
  "tenantScoped": false,
  "versioned": false
} as const satisfies ModelMeta
export const QuoteSchema = z.object({
  id: z.uuid().nullish(),
  reference: z.string().max(20).min(1),
  seller_organization: z.uuid(),
  buyer_organization: z.uuid().nullish(),
  requested_by: z.uuid().nullish(),
  delivery_address: z.uuid(),
  expires_at: z.iso.datetime({ offset: true }),
  buyer_notes: z.string().nullish(),
  seller_notes: z.string().nullish(),
  status: z.enum(["requested", "responded", "accepted", "declined", "expired", "cancelled"]).nullish(),
  responded_at: z.iso.datetime({ offset: true }).nullish(),
  accepted_at: z.iso.datetime({ offset: true }).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Quote = z.infer<typeof QuoteSchema>
export const QuoteWriteSchema = QuoteSchema.omit({ reference: true, buyer_organization: true, requested_by: true, status: true, responded_at: true, accepted_at: true, created_at: true })
export const QuoteMeta = {
  "key": "quote",
  "actions": [
    {
      "icon": "check",
      "input": [
        "offers",
        "seller_notes"
      ],
      "kind": "command",
      "label": "Send offer",
      "name": "respond",
      "policy": "quote.respond",
      "when": {
        "status": [
          "requested",
          "responded"
        ]
      }
    },
    {
      "input": [
        "seller_notes"
      ],
      "kind": "command",
      "label": "Decline",
      "name": "decline",
      "policy": "quote.respond",
      "tone": "danger",
      "when": {
        "status": [
          "requested",
          "responded"
        ]
      }
    },
    {
      "confirm": true,
      "icon": "check",
      "kind": "command",
      "label": "Accept and order",
      "name": "accept",
      "policy": "quote.accept",
      "when": {
        "status": [
          "responded"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Decline offer",
      "name": "decline_offer",
      "policy": "quote.accept",
      "tone": "danger",
      "when": {
        "status": [
          "responded"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Cancel request",
      "name": "cancel",
      "policy": "quote.accept",
      "tone": "danger",
      "when": {
        "status": [
          "requested"
        ]
      }
    }
  ],
  "displayField": "reference",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Quote",
      "maxLength": 20,
      "name": "reference",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Seller",
      "name": "seller_organization",
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "weight": 10,
      "widget": "relation"
    },
    {
      "filter": [
        "eq",
        "in"
      ],
      "label": "Buyer",
      "name": "buyer_organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Requested by",
      "name": "requested_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Deliver to",
      "name": "delivery_address",
      "relation": {
        "display": "label",
        "model": "address"
      },
      "required": true,
      "type": "relation",
      "weight": 20,
      "widget": "relation"
    },
    {
      "help": "The seller must respond, and you accept, before this time.",
      "label": "Valid until",
      "name": "expires_at",
      "required": true,
      "type": "datetime",
      "weight": 30,
      "widget": "datetime"
    },
    {
      "label": "Notes for the seller",
      "name": "buyer_notes",
      "type": "text",
      "weight": 40,
      "widget": "textarea"
    },
    {
      "label": "Seller's notes",
      "name": "seller_notes",
      "type": "text",
      "weight": 50,
      "widget": "textarea"
    },
    {
      "choices": [
        {
          "label": "Requested",
          "tone": "info",
          "value": "requested"
        },
        {
          "label": "Seller responded",
          "tone": "signal",
          "value": "responded"
        },
        {
          "label": "Accepted",
          "tone": "success",
          "value": "accepted"
        },
        {
          "label": "Declined",
          "tone": "danger",
          "value": "declined"
        },
        {
          "label": "Expired",
          "tone": "neutral",
          "value": "expired"
        },
        {
          "label": "Cancelled",
          "tone": "neutral",
          "value": "cancelled"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Responded",
      "name": "responded_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Accepted",
      "name": "accepted_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "filter": [
        "range"
      ],
      "label": "Requested",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "help": "Your price per pack for each line, by line.",
      "inputOnly": true,
      "label": "Offers",
      "name": "offers",
      "type": "json",
      "widget": "json"
    }
  ],
  "label": "Quote",
  "labelPlural": "Quotes",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "reference",
      "seller_organization",
      "buyer_organization",
      "status",
      "expires_at",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-created_at",
    "expires_at"
  ],
  "path": "quotes",
  "primaryKey": "id",
  "public": false,
  "search": [
    "reference"
  ],
  "tenantScoped": true,
  "versioned": true
} as const satisfies ModelMeta
export const ReturnCaseSchema = z.object({
  id: z.uuid().nullish(),
  reference: z.string().max(20).min(1),
  order: z.uuid(),
  order_line: z.uuid().nullish(),
  case_type: z.enum(["return", "dispute", "damage", "shortage", "wrong_item", "quality_issue"]),
  reason_code: z.enum(["damaged_in_transit", "short_delivered", "wrong_product", "past_date", "quality", "not_as_described", "other"]),
  quantity: z.number().int().nullish(),
  reason_details: z.string().min(1),
  status: z.enum(["open", "evidence_requested", "reviewing", "approved", "rejected", "resolved"]).nullish(),
  decision: z.enum(["approved", "partial", "replacement", "rejected"]).nullish(),
  approved_quantity: z.number().int().nullish(),
  stock_disposition: z.enum(["restock", "quarantine", "scrap", "supplier_return", "none"]).nullish(),
  decision_notes: z.string().nullish(),
  evidence_note: z.string().max(300).nullish(),
  refund_amount: decimalString(14, 2).nullish(),
  refunded_amount: decimalString(14, 2).nullish(),
  opened_by: z.uuid().nullish(),
  opened_at: z.iso.datetime({ offset: true }).nullish(),
  decided_at: z.iso.datetime({ offset: true }).nullish(),
})
export type ReturnCase = z.infer<typeof ReturnCaseSchema>
export const ReturnCaseWriteSchema = ReturnCaseSchema.omit({ reference: true, status: true, evidence_note: true, refund_amount: true, refunded_amount: true, opened_by: true, opened_at: true, decided_at: true })
export const ReturnCaseMeta = {
  "key": "return_case",
  "actions": [
    {
      "icon": "message-square",
      "input": [
        "note"
      ],
      "kind": "command",
      "label": "Ask for evidence",
      "name": "request_evidence",
      "policy": "return_case.decide"
    },
    {
      "icon": "upload",
      "input": [
        "evidence_file",
        "note"
      ],
      "kind": "command",
      "label": "Add evidence",
      "name": "add_evidence",
      "policy": "return_case.evidence"
    },
    {
      "icon": "scale",
      "input": [
        "decision",
        "approved_quantity",
        "stock_disposition",
        "decision_notes"
      ],
      "kind": "command",
      "label": "Record decision",
      "name": "decide",
      "policy": "return_case.decide"
    },
    {
      "confirm": true,
      "kind": "command",
      "label": "Withdraw case",
      "name": "withdraw",
      "policy": "return_case.create",
      "tone": "danger"
    }
  ],
  "displayField": "reference",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "label": "Case",
      "maxLength": 20,
      "name": "reference",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "code"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Order",
      "name": "order",
      "relation": {
        "display": "order_number",
        "model": "order"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "label": "Line",
      "name": "order_line",
      "relation": {
        "display": "product_name_snapshot",
        "model": "order_line"
      },
      "type": "relation",
      "weight": 10,
      "widget": "relation"
    },
    {
      "choices": [
        {
          "label": "Return",
          "value": "return"
        },
        {
          "label": "Dispute",
          "value": "dispute"
        },
        {
          "label": "Damaged goods",
          "value": "damage"
        },
        {
          "label": "Short delivery",
          "value": "shortage"
        },
        {
          "label": "Wrong item",
          "value": "wrong_item"
        },
        {
          "label": "Quality issue",
          "value": "quality_issue"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Type",
      "name": "case_type",
      "required": true,
      "type": "enum",
      "weight": 15,
      "widget": "select"
    },
    {
      "choices": [
        {
          "label": "Damaged on the way",
          "value": "damaged_in_transit"
        },
        {
          "label": "Fewer packs than invoiced",
          "value": "short_delivered"
        },
        {
          "label": "A different product arrived",
          "value": "wrong_product"
        },
        {
          "label": "Past its date or too close to it",
          "value": "past_date"
        },
        {
          "label": "Not of the expected quality",
          "value": "quality"
        },
        {
          "label": "Not as described",
          "value": "not_as_described"
        },
        {
          "label": "Something else",
          "value": "other"
        }
      ],
      "label": "Reason",
      "name": "reason_code",
      "required": true,
      "type": "enum",
      "weight": 20,
      "widget": "select"
    },
    {
      "label": "Packs affected",
      "name": "quantity",
      "type": "integer",
      "weight": 25,
      "widget": "integer"
    },
    {
      "label": "What happened",
      "name": "reason_details",
      "required": true,
      "type": "text",
      "weight": 30,
      "widget": "textarea"
    },
    {
      "choices": [
        {
          "label": "Open",
          "tone": "info",
          "value": "open"
        },
        {
          "label": "Evidence requested",
          "tone": "warning",
          "value": "evidence_requested"
        },
        {
          "label": "Under review",
          "tone": "signal",
          "value": "reviewing"
        },
        {
          "label": "Approved",
          "tone": "success",
          "value": "approved"
        },
        {
          "label": "Rejected",
          "tone": "danger",
          "value": "rejected"
        },
        {
          "label": "Resolved",
          "tone": "neutral",
          "value": "resolved"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "choices": [
        {
          "label": "Approve in full",
          "value": "approved"
        },
        {
          "label": "Approve part of the claim",
          "value": "partial"
        },
        {
          "label": "Send a replacement",
          "value": "replacement"
        },
        {
          "label": "Reject",
          "value": "rejected"
        }
      ],
      "label": "Decision",
      "name": "decision",
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "Packs accepted",
      "name": "approved_quantity",
      "type": "integer",
      "widget": "integer"
    },
    {
      "choices": [
        {
          "label": "Restock",
          "value": "restock"
        },
        {
          "label": "Quarantine for inspection",
          "value": "quarantine"
        },
        {
          "label": "Scrap",
          "value": "scrap"
        },
        {
          "label": "Return to supplier",
          "value": "supplier_return"
        },
        {
          "label": "No stock returned",
          "value": "none"
        }
      ],
      "label": "Returned stock",
      "name": "stock_disposition",
      "type": "enum",
      "widget": "select"
    },
    {
      "label": "Decision explanation",
      "name": "decision_notes",
      "type": "text",
      "widget": "textarea"
    },
    {
      "label": "Evidence asked for",
      "maxLength": 300,
      "name": "evidence_note",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Refund",
      "maxDigits": 14,
      "name": "refund_amount",
      "readOnly": true,
      "type": "decimal",
      "widget": "currency"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Refunded",
      "maxDigits": 14,
      "name": "refunded_amount",
      "readOnly": true,
      "type": "decimal",
      "widget": "currency"
    },
    {
      "label": "Opened by",
      "name": "opened_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "filter": [
        "range"
      ],
      "label": "Opened",
      "name": "opened_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Decided",
      "name": "decided_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "inputOnly": true,
      "label": "Note",
      "maxLength": 300,
      "name": "note",
      "type": "text",
      "widget": "textarea"
    },
    {
      "help": "JPEG, PNG or PDF of what you received.",
      "inputOnly": true,
      "label": "Photo or document",
      "name": "evidence_file",
      "type": "file",
      "widget": "file"
    }
  ],
  "label": "Case",
  "labelPlural": "Returns and disputes",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "reference",
      "order",
      "case_type",
      "status",
      "opened_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-opened_at",
    "opened_at"
  ],
  "path": "returns",
  "primaryKey": "id",
  "public": false,
  "search": [
    "reference"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const SellerDocumentSchema = z.object({
  id: z.uuid().nullish(),
  seller_organization: z.uuid(),
  document_type: z.enum(["registration", "tax", "license", "bank_verification", "other"]),
  file_asset: z.string(),
  verification_status: z.enum(["pending", "verified", "rejected", "expired"]).nullish(),
  expires_at: z.iso.date().nullish(),
  review_notes: z.string().nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type SellerDocument = z.infer<typeof SellerDocumentSchema>
export const SellerDocumentWriteSchema = SellerDocumentSchema.omit({ seller_organization: true, verification_status: true, review_notes: true, created_at: true })
export const SellerDocumentMeta = {
  "key": "seller_document",
  "actions": [
    {
      "icon": "check",
      "input": [
        "review_notes"
      ],
      "kind": "command",
      "label": "Mark verified",
      "name": "verify",
      "policy": "seller_document.verify",
      "tone": "primary",
      "when": {
        "verification_status": [
          "pending",
          "rejected",
          "expired"
        ]
      }
    },
    {
      "confirm": true,
      "input": [
        "review_notes"
      ],
      "kind": "command",
      "label": "Reject document",
      "name": "reject",
      "policy": "seller_document.verify",
      "tone": "danger",
      "when": {
        "verification_status": [
          "pending",
          "verified"
        ]
      }
    },
    {
      "input": [
        "review_notes"
      ],
      "kind": "command",
      "label": "Mark expired",
      "name": "expire",
      "policy": "seller_document.verify",
      "tone": "warning",
      "when": {
        "verification_status": [
          "verified"
        ]
      }
    },
    {
      "confirm": true,
      "kind": "archive",
      "label": "Remove document",
      "name": "remove",
      "policy": "seller_document.delete",
      "tone": "danger",
      "when": {
        "verification_status": [
          "pending",
          "rejected",
          "expired"
        ]
      }
    }
  ],
  "displayField": "document_type",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Seller organization",
      "name": "seller_organization",
      "readOnly": true,
      "relation": {
        "display": "name",
        "model": "organization"
      },
      "required": true,
      "type": "relation",
      "widget": "hidden"
    },
    {
      "choices": [
        {
          "label": "Business registration certificate",
          "value": "registration"
        },
        {
          "label": "KRA PIN certificate",
          "value": "tax"
        },
        {
          "label": "Trading licence",
          "value": "license"
        },
        {
          "label": "Bank verification letter",
          "value": "bank_verification"
        },
        {
          "label": "Other document",
          "value": "other"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Document",
      "name": "document_type",
      "required": true,
      "type": "enum",
      "weight": 10,
      "widget": "select"
    },
    {
      "accept": [
        "application/pdf",
        "image/jpeg",
        "image/png"
      ],
      "label": "File",
      "maxBytes": 10485760,
      "name": "file_asset",
      "required": true,
      "type": "file",
      "weight": 20,
      "widget": "file"
    },
    {
      "choices": [
        {
          "label": "Pending check",
          "tone": "info",
          "value": "pending"
        },
        {
          "label": "Verified",
          "tone": "success",
          "value": "verified"
        },
        {
          "label": "Rejected",
          "tone": "danger",
          "value": "rejected"
        },
        {
          "label": "Expired",
          "tone": "warning",
          "value": "expired"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Check",
      "name": "verification_status",
      "readOnly": true,
      "type": "enum",
      "weight": 30,
      "widget": "status"
    },
    {
      "label": "Valid until",
      "name": "expires_at",
      "type": "date",
      "weight": 40,
      "widget": "date"
    },
    {
      "fieldPolicy": {
        "write": "seller_document.verify"
      },
      "label": "Reviewer notes",
      "name": "review_notes",
      "readOnly": true,
      "type": "text",
      "weight": 50,
      "widget": "textarea"
    },
    {
      "label": "Uploaded",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Seller document",
  "labelPlural": "Seller documents",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "document_type",
      "file_asset",
      "verification_status",
      "expires_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "document_type",
    "-created_at"
  ],
  "path": "seller-documents",
  "primaryKey": "id",
  "public": false,
  "search": [],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const SellerProfileSchema = z.object({
  id: z.uuid().nullish(),
  public_name: z.string().max(160).min(1),
  description: z.unknown().nullish(),
  support_email: z.email().nullish(),
  support_phone: z.string().max(20).nullish(),
  activation_status: z.enum(["draft", "under_review", "active", "rejected", "suspended"]).nullish(),
  reviewed_by: z.uuid().nullish(),
  reviewed_at: z.iso.datetime({ offset: true }).nullish(),
  rejection_reason: z.string().nullish(),
  submitted_at: z.iso.datetime({ offset: true }).nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type SellerProfile = z.infer<typeof SellerProfileSchema>
export const SellerProfileWriteSchema = SellerProfileSchema.omit({ id: true, activation_status: true, reviewed_by: true, reviewed_at: true, rejection_reason: true, submitted_at: true, updated_at: true })
export const SellerProfileMeta = {
  "key": "seller_profile",
  "actions": [
    {
      "icon": "send",
      "kind": "command",
      "label": "Send for review",
      "name": "submit",
      "policy": "seller_profile.submit",
      "tone": "primary",
      "when": {
        "activation_status": [
          "draft",
          "rejected"
        ]
      }
    },
    {
      "icon": "check",
      "kind": "command",
      "label": "Activate seller",
      "name": "activate",
      "policy": "seller_profile.review",
      "tone": "primary",
      "when": {
        "activation_status": [
          "under_review",
          "suspended"
        ]
      }
    },
    {
      "confirm": true,
      "input": [
        "rejection_reason"
      ],
      "kind": "command",
      "label": "Reject application",
      "name": "reject",
      "policy": "seller_profile.review",
      "tone": "danger",
      "when": {
        "activation_status": [
          "under_review"
        ]
      }
    },
    {
      "confirm": true,
      "input": [
        "rejection_reason"
      ],
      "kind": "command",
      "label": "Suspend seller",
      "name": "suspend",
      "policy": "seller_profile.review",
      "tone": "warning",
      "when": {
        "activation_status": [
          "active"
        ]
      }
    }
  ],
  "displayField": "public_name",
  "fields": [
    {
      "name": "id",
      "readOnly": true,
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "The name buyers see on your products.",
      "label": "Marketplace name",
      "maxLength": 160,
      "name": "public_name",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "text"
    },
    {
      "help": "What you sell, where you deliver and how buyers reach you.",
      "label": "About the business",
      "name": "description",
      "type": "richtext",
      "weight": 20,
      "widget": "richtext"
    },
    {
      "label": "Support email",
      "maxLength": 254,
      "name": "support_email",
      "type": "email",
      "weight": 30,
      "widget": "email"
    },
    {
      "label": "Support phone",
      "maxLength": 20,
      "name": "support_phone",
      "type": "string",
      "weight": 40,
      "widget": "phone"
    },
    {
      "choices": [
        {
          "label": "Draft",
          "tone": "neutral",
          "value": "draft"
        },
        {
          "label": "Under review",
          "tone": "info",
          "value": "under_review"
        },
        {
          "label": "Active",
          "tone": "success",
          "value": "active"
        },
        {
          "label": "Rejected",
          "tone": "danger",
          "value": "rejected"
        },
        {
          "label": "Suspended",
          "tone": "warning",
          "value": "suspended"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "activation_status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Reviewed by",
      "name": "reviewed_by",
      "readOnly": true,
      "relation": {
        "display": "display_name",
        "model": "user"
      },
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Reviewed",
      "name": "reviewed_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "fieldPolicy": {
        "write": "seller_profile.review"
      },
      "help": "Shown to the seller. Say what to change.",
      "label": "Reason",
      "name": "rejection_reason",
      "readOnly": true,
      "type": "text",
      "widget": "textarea"
    },
    {
      "label": "Submitted",
      "name": "submitted_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Seller profile",
  "labelPlural": "Seller profiles",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "public_name",
      "activation_status",
      "submitted_at",
      "reviewed_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-submitted_at",
    "public_name"
  ],
  "path": "seller-profiles",
  "primaryKey": "id",
  "public": false,
  "search": [
    "public_name"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const ShipmentSchema = z.object({
  id: z.uuid().nullish(),
  order: z.uuid(),
  carrier_name: z.string().max(80).nullish(),
  carrier_reference: z.string().max(80).nullish(),
  status: z.enum(["pending", "handed_over", "in_transit", "delivered", "exception"]).nullish(),
  estimated_start_at: z.iso.datetime({ offset: true }).nullish(),
  estimated_end_at: z.iso.datetime({ offset: true }).nullish(),
  last_event_at: z.iso.datetime({ offset: true }).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Shipment = z.infer<typeof ShipmentSchema>
export const ShipmentWriteSchema = ShipmentSchema.omit({ order: true, status: true, last_event_at: true, created_at: true })
export const ShipmentMeta = {
  "key": "shipment",
  "actions": [
    {
      "icon": "plus",
      "input": [
        "event_type",
        "description",
        "location_text",
        "occurred_at"
      ],
      "kind": "command",
      "label": "Add update",
      "name": "add_event",
      "policy": "shipment.update",
      "when": {
        "status": [
          "handed_over",
          "in_transit",
          "exception",
          "pending"
        ]
      }
    },
    {
      "icon": "check",
      "input": [
        "proof_file",
        "description",
        "occurred_at"
      ],
      "kind": "command",
      "label": "Confirm delivery",
      "name": "confirm_delivery",
      "policy": "shipment.update",
      "when": {
        "status": [
          "handed_over",
          "in_transit",
          "exception",
          "pending"
        ]
      }
    }
  ],
  "displayField": "carrier_reference",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Order",
      "name": "order",
      "readOnly": true,
      "relation": {
        "display": "order_number",
        "model": "order"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Carrier",
      "maxLength": 80,
      "name": "carrier_name",
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Tracking reference",
      "maxLength": 80,
      "name": "carrier_reference",
      "type": "string",
      "widget": "code"
    },
    {
      "choices": [
        {
          "label": "Being prepared",
          "tone": "neutral",
          "value": "pending"
        },
        {
          "label": "Handed to carrier",
          "tone": "info",
          "value": "handed_over"
        },
        {
          "label": "In transit",
          "tone": "signal",
          "value": "in_transit"
        },
        {
          "label": "Delivered",
          "tone": "success",
          "value": "delivered"
        },
        {
          "label": "Delivery problem",
          "tone": "danger",
          "value": "exception"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Expected from",
      "name": "estimated_start_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "label": "Expected by",
      "name": "estimated_end_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "label": "Last update",
      "name": "last_event_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "choices": [
        {
          "label": "Handed to carrier",
          "value": "handed_over"
        },
        {
          "label": "In transit",
          "value": "in_transit"
        },
        {
          "label": "Out for delivery",
          "value": "out_for_delivery"
        },
        {
          "label": "Delayed",
          "value": "delayed"
        },
        {
          "label": "Delivery problem",
          "value": "exception"
        },
        {
          "label": "Note",
          "value": "note"
        }
      ],
      "inputOnly": true,
      "label": "What happened",
      "name": "event_type",
      "type": "enum",
      "widget": "select"
    },
    {
      "inputOnly": true,
      "label": "Details",
      "maxLength": 500,
      "name": "description",
      "type": "text",
      "widget": "textarea"
    },
    {
      "inputOnly": true,
      "label": "Where",
      "maxLength": 120,
      "name": "location_text",
      "type": "string",
      "widget": "text"
    },
    {
      "help": "Leave empty for now.",
      "inputOnly": true,
      "label": "When",
      "name": "occurred_at",
      "type": "datetime",
      "widget": "datetime"
    },
    {
      "help": "A signed delivery note or photo.",
      "inputOnly": true,
      "label": "Proof of delivery",
      "name": "proof_file",
      "type": "file",
      "widget": "file"
    }
  ],
  "label": "Shipment",
  "labelPlural": "Shipments",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "order",
      "carrier_name",
      "carrier_reference",
      "status",
      "last_event_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-created_at",
    "-last_event_at"
  ],
  "path": "shipments",
  "primaryKey": "id",
  "public": false,
  "search": [
    "carrier_reference"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const VariantSchema = z.object({
  id: z.uuid().nullish(),
  product: z.uuid(),
  sku: z.string().max(40).min(1),
  attributes: z.unknown().nullish(),
  packaging_unit: z.enum(["bale", "sack", "carton", "case", "tray", "crate", "jerrycan", "pack", "piece"]),
  units_per_pack: decimalString(10, 2),
  minimum_order_quantity: z.number().int().nullish(),
  unit_price: decimalString(12, 2),
  stock_on_hand: z.number().int().nullish(),
  is_active: z.boolean().nullish(),
  pack_label: z.string().nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type Variant = z.infer<typeof VariantSchema>
export const VariantWriteSchema = VariantSchema.omit({ stock_on_hand: true, pack_label: true, updated_at: true })
export const VariantMeta = {
  "key": "variant",
  "actions": [],
  "displayField": "sku",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Product",
      "name": "product",
      "relation": {
        "display": "name",
        "model": "catalog_product"
      },
      "required": true,
      "type": "relation",
      "weight": 5,
      "widget": "relation"
    },
    {
      "help": "Your stock code; unique across your catalogue.",
      "label": "SKU",
      "maxLength": 40,
      "name": "sku",
      "required": true,
      "type": "string",
      "weight": 10,
      "widget": "code"
    },
    {
      "label": "Variant details",
      "name": "attributes",
      "type": "json",
      "weight": 15,
      "widget": "json"
    },
    {
      "choices": [
        {
          "label": "Bale",
          "value": "bale"
        },
        {
          "label": "Sack",
          "value": "sack"
        },
        {
          "label": "Carton",
          "value": "carton"
        },
        {
          "label": "Case",
          "value": "case"
        },
        {
          "label": "Tray",
          "value": "tray"
        },
        {
          "label": "Crate",
          "value": "crate"
        },
        {
          "label": "Jerrycan",
          "value": "jerrycan"
        },
        {
          "label": "Pack",
          "value": "pack"
        },
        {
          "label": "Piece",
          "value": "piece"
        }
      ],
      "label": "Sold by the",
      "name": "packaging_unit",
      "required": true,
      "type": "enum",
      "weight": 20,
      "widget": "select"
    },
    {
      "decimalPlaces": 2,
      "help": "Packets, bottles or pieces in one pack.",
      "label": "Units per pack",
      "maxDigits": 10,
      "name": "units_per_pack",
      "required": true,
      "type": "decimal",
      "weight": 25,
      "widget": "decimal"
    },
    {
      "default": 1,
      "help": "In packs.",
      "label": "Minimum order",
      "name": "minimum_order_quantity",
      "type": "integer",
      "weight": 30,
      "widget": "integer"
    },
    {
      "currency": "KES",
      "decimalPlaces": 2,
      "label": "Price per pack",
      "maxDigits": 12,
      "name": "unit_price",
      "required": true,
      "type": "decimal",
      "weight": 35,
      "widget": "currency"
    },
    {
      "help": "From the stock ledger: on hand less held and allocated packs.",
      "label": "Packs available",
      "name": "stock_on_hand",
      "readOnly": true,
      "type": "integer",
      "weight": 40,
      "widget": "integer"
    },
    {
      "default": true,
      "filter": [
        "eq"
      ],
      "label": "On sale",
      "name": "is_active",
      "type": "boolean",
      "weight": 45,
      "widget": "boolean"
    },
    {
      "label": "Pack",
      "name": "pack_label",
      "readOnly": true,
      "type": "string",
      "weight": 50,
      "widget": "text"
    },
    {
      "label": "Updated",
      "name": "updated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Variant",
  "labelPlural": "Variants",
  "list": {
    "defaultPageSize": 50,
    "fields": [
      "sku",
      "pack_label",
      "unit_price",
      "minimum_order_quantity",
      "stock_on_hand",
      "is_active"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "unit_price",
    "sku",
    "-updated_at"
  ],
  "path": "catalog/variants",
  "primaryKey": "id",
  "public": false,
  "search": [
    "sku"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const WebhookDeliverySchema = z.object({
  id: z.uuid().nullish(),
  endpoint: z.uuid(),
  topic: z.string().max(60).min(1),
  status: z.enum(["queued", "delivered", "retrying", "failed"]).nullish(),
  attempts: z.number().int().nullish(),
  response_status: z.number().int().nullish(),
  last_error: z.string().max(200).nullish(),
  next_attempt_at: z.iso.datetime({ offset: true }),
  delivered_at: z.iso.datetime({ offset: true }).nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
})
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>
export const WebhookDeliveryWriteSchema = WebhookDeliverySchema.omit({ endpoint: true, topic: true, status: true, attempts: true, response_status: true, last_error: true, next_attempt_at: true, delivered_at: true, created_at: true })
export const WebhookDeliveryMeta = {
  "key": "webhook_delivery",
  "actions": [
    {
      "icon": "refresh-cw",
      "kind": "command",
      "label": "Send again",
      "name": "retry",
      "policy": "integration.manage",
      "when": {
        "status": [
          "failed"
        ]
      }
    }
  ],
  "displayField": "topic",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "Endpoint",
      "name": "endpoint",
      "readOnly": true,
      "relation": {
        "display": "url",
        "model": "webhook_endpoint"
      },
      "required": true,
      "type": "relation",
      "widget": "relation"
    },
    {
      "label": "Topic",
      "maxLength": 60,
      "name": "topic",
      "readOnly": true,
      "required": true,
      "type": "string",
      "widget": "text"
    },
    {
      "choices": [
        {
          "label": "Queued",
          "tone": "info",
          "value": "queued"
        },
        {
          "label": "Delivered",
          "tone": "success",
          "value": "delivered"
        },
        {
          "label": "Retrying",
          "tone": "warning",
          "value": "retrying"
        },
        {
          "label": "Failed",
          "tone": "danger",
          "value": "failed"
        }
      ],
      "filter": [
        "in"
      ],
      "label": "Status",
      "name": "status",
      "readOnly": true,
      "type": "enum",
      "widget": "status"
    },
    {
      "label": "Attempts",
      "name": "attempts",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Response status",
      "name": "response_status",
      "readOnly": true,
      "type": "integer",
      "widget": "integer"
    },
    {
      "label": "Last error",
      "maxLength": 200,
      "name": "last_error",
      "readOnly": true,
      "type": "string",
      "widget": "text"
    },
    {
      "label": "Next attempt at",
      "name": "next_attempt_at",
      "readOnly": true,
      "required": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Delivered at",
      "name": "delivered_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Created at",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Delivery",
  "labelPlural": "Deliveries",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "topic",
      "endpoint",
      "status",
      "attempts",
      "response_status",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "-created_at"
  ],
  "path": "integrations/deliveries",
  "primaryKey": "id",
  "public": false,
  "search": [
    "topic"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const WebhookEndpointSchema = z.object({
  id: z.uuid().nullish(),
  url: z.string().max(300).min(1),
  events: z.unknown(),
  is_active: z.boolean().nullish(),
  created_at: z.iso.datetime({ offset: true }).nullish(),
  rotated_at: z.iso.datetime({ offset: true }).nullish(),
})
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>
export const WebhookEndpointWriteSchema = WebhookEndpointSchema.omit({ is_active: true, created_at: true, rotated_at: true })
export const WebhookEndpointMeta = {
  "key": "webhook_endpoint",
  "actions": [
    {
      "confirm": true,
      "icon": "refresh-cw",
      "kind": "command",
      "label": "Replace secret",
      "name": "rotate_secret",
      "policy": "integration.manage",
      "tone": "warning"
    },
    {
      "confirm": true,
      "icon": "ban",
      "kind": "command",
      "label": "Switch off",
      "name": "switch_off",
      "policy": "integration.manage",
      "when": {
        "is_active": [
          "true"
        ]
      }
    },
    {
      "icon": "check",
      "kind": "command",
      "label": "Switch on",
      "name": "switch_on",
      "policy": "integration.manage",
      "when": {
        "is_active": [
          "false"
        ]
      }
    }
  ],
  "displayField": "url",
  "fields": [
    {
      "label": "Id",
      "name": "id",
      "type": "uuid",
      "widget": "hidden"
    },
    {
      "help": "An https:// address on the public internet.",
      "label": "Address",
      "maxLength": 300,
      "name": "url",
      "required": true,
      "type": "string",
      "weight": 5,
      "widget": "url"
    },
    {
      "choices": [
        {
          "label": "Order paid and submitted",
          "value": "order.submitted"
        },
        {
          "label": "Order shipped",
          "value": "order.shipped"
        },
        {
          "label": "Order delivered",
          "value": "order.delivered"
        },
        {
          "label": "Order cancelled",
          "value": "order.cancelled"
        },
        {
          "label": "Payment confirmed",
          "value": "payment.confirmed"
        },
        {
          "label": "Payment refunded",
          "value": "payment.refunded"
        },
        {
          "label": "Stock running low",
          "value": "inventory.low"
        },
        {
          "label": "Case opened",
          "value": "return.opened"
        },
        {
          "label": "Case decided",
          "value": "return.decided"
        }
      ],
      "help": "Each event is sent as a signed POST; see the integration guide.",
      "label": "Events",
      "name": "events",
      "required": true,
      "type": "multiselect",
      "weight": 10,
      "widget": "multiselect"
    },
    {
      "filter": [
        "eq"
      ],
      "label": "On",
      "name": "is_active",
      "readOnly": true,
      "type": "boolean",
      "widget": "boolean"
    },
    {
      "label": "Created",
      "name": "created_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    },
    {
      "label": "Rotated at",
      "name": "rotated_at",
      "readOnly": true,
      "type": "datetime",
      "widget": "relative-time"
    }
  ],
  "label": "Webhook",
  "labelPlural": "Webhooks",
  "list": {
    "defaultPageSize": 25,
    "fields": [
      "url",
      "events",
      "is_active",
      "created_at"
    ],
    "maxPageSize": 100
  },
  "lookup": "pk",
  "ordering": [
    "created_at"
  ],
  "path": "integrations/webhooks",
  "primaryKey": "id",
  "public": false,
  "search": [
    "url"
  ],
  "tenantScoped": true,
  "versioned": false
} as const satisfies ModelMeta
export const registry = { account: () => ({ schema: AccountSchema, write: AccountWriteSchema, meta: AccountMeta }), address: () => ({ schema: AddressSchema, write: AddressWriteSchema, meta: AddressMeta }), api_client: () => ({ schema: ApiClientSchema, write: ApiClientWriteSchema, meta: ApiClientMeta }), api_token: () => ({ schema: ApiTokenSchema, write: ApiTokenWriteSchema, meta: ApiTokenMeta }), approval_policy: () => ({ schema: ApprovalPolicySchema, write: ApprovalPolicyWriteSchema, meta: ApprovalPolicyMeta }), audit_event: () => ({ schema: AuditEventSchema, write: AuditEventWriteSchema, meta: AuditEventMeta }), buyer_group_member: () => ({ schema: BuyerGroupMemberSchema, write: BuyerGroupMemberWriteSchema, meta: BuyerGroupMemberMeta }), cart: () => ({ schema: CartSchema, write: CartWriteSchema, meta: CartMeta }), cart_line: () => ({ schema: CartLineSchema, write: CartLineWriteSchema, meta: CartLineMeta }), catalog_product: () => ({ schema: CatalogProductSchema, write: CatalogProductWriteSchema, meta: CatalogProductMeta }), category: () => ({ schema: CategorySchema, write: CategoryWriteSchema, meta: CategoryMeta }), category_contract: () => ({ schema: CategoryContractSchema, write: CategoryContractWriteSchema, meta: CategoryContractMeta }), fulfillment_task: () => ({ schema: FulfillmentTaskSchema, write: FulfillmentTaskWriteSchema, meta: FulfillmentTaskMeta }), inventory_balance: () => ({ schema: InventoryBalanceSchema, write: InventoryBalanceWriteSchema, meta: InventoryBalanceMeta }), inventory_movement: () => ({ schema: InventoryMovementSchema, write: InventoryMovementWriteSchema, meta: InventoryMovementMeta }), media_asset: () => ({ schema: MediaAssetSchema, write: MediaAssetWriteSchema, meta: MediaAssetMeta }), membership: () => ({ schema: MembershipSchema, write: MembershipWriteSchema, meta: MembershipMeta }), metric_definition: () => ({ schema: MetricDefinitionSchema, write: MetricDefinitionWriteSchema, meta: MetricDefinitionMeta }), notification: () => ({ schema: NotificationSchema, write: NotificationWriteSchema, meta: NotificationMeta }), notification_preference: () => ({ schema: NotificationPreferenceSchema, write: NotificationPreferenceWriteSchema, meta: NotificationPreferenceMeta }), order: () => ({ schema: OrderSchema, write: OrderWriteSchema, meta: OrderMeta }), organization: () => ({ schema: OrganizationSchema, write: OrganizationWriteSchema, meta: OrganizationMeta }), price_rule: () => ({ schema: PriceRuleSchema, write: PriceRuleWriteSchema, meta: PriceRuleMeta }), product: () => ({ schema: ProductSchema, write: ProductWriteSchema, meta: ProductMeta }), quote: () => ({ schema: QuoteSchema, write: QuoteWriteSchema, meta: QuoteMeta }), return_case: () => ({ schema: ReturnCaseSchema, write: ReturnCaseWriteSchema, meta: ReturnCaseMeta }), seller_document: () => ({ schema: SellerDocumentSchema, write: SellerDocumentWriteSchema, meta: SellerDocumentMeta }), seller_profile: () => ({ schema: SellerProfileSchema, write: SellerProfileWriteSchema, meta: SellerProfileMeta }), shipment: () => ({ schema: ShipmentSchema, write: ShipmentWriteSchema, meta: ShipmentMeta }), variant: () => ({ schema: VariantSchema, write: VariantWriteSchema, meta: VariantMeta }), webhook_delivery: () => ({ schema: WebhookDeliverySchema, write: WebhookDeliveryWriteSchema, meta: WebhookDeliveryMeta }), webhook_endpoint: () => ({ schema: WebhookEndpointSchema, write: WebhookEndpointWriteSchema, meta: WebhookEndpointMeta }) } as const
export type ModelKey = keyof typeof registry
