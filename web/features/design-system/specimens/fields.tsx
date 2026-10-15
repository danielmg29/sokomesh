'use client'

import { useEffect, useState } from 'react'
import { FieldDiff, FieldView } from '@/components/kernel/fields/FieldView'
import { FieldFilter, FieldInput } from '@/components/kernel/fields/FieldInput'
import type { FilterValue, ImageUpload } from '@/components/kernel/fields/types'
import { Button } from '@/components/ui/button'
import type { FieldMeta } from '@/lib/contract/types'
import { DEMO_NOW, extraFields, images, organizationMeta, organizationValues, placeOptions, productMeta, products, relationOptions, sellers } from '../fixtures'
import { Plate, Plates } from '../kit'

const org = (name: string) => organizationMeta.fields.find(f => f.name === name)!
const prod = (name: string) => productMeta.fields.find(f => f.name === name)!

type Spec = {
  field: FieldMeta
  value: unknown
  /** A second value for the diff. */
  after?: unknown
  /** The saved version in a conflict. */
  theirs?: unknown
  error?: string
  restricted?: string
  noInput?: boolean
  options?: { value: string; label: string; description?: string; disabled?: boolean; reason?: string }[]
  /** Widget-specific states beyond the shared set: each renders the input with this value and message. */
  variants?: { label: string; value?: unknown; error?: string; restricted?: string; note?: string }[]
}

const longNote = 'Certificate of incorporation is a photocopy, and the KRA PIN certificate names Mwangaza Wholesale Depot rather than Mwangaza Wholesalers Ltd. Upload the original scan of the certificate and a PIN certificate in the registered name. The single business permit is in order. Resubmit once both documents match the registered name so the review can continue without another round of messages.'

// Every kind of content the editor can produce, as the backend would store it. The video is Big Buck Bunny
// (Blender Foundation, CC BY 3.0); it loads from YouTube only when the reader presses play.
const richFull = {
  html: '<h3>Storage and handling</h3><p>Bales are <strong>shrink-wrapped</strong> and stacked <u>at most six high</u> on pallets. See our <a href="https://mwangaza-demo.co.ke/delivery" rel="noopener noreferrer nofollow">delivery terms</a>.</p>'
    + '<figure class="image"><img src="/images/products/maize-flour.webp" alt="A heap of yellow maize flour"><figcaption>Sifted maize flour, as packed in every 2 kg packet (demo photograph).</figcaption></figure>'
    + '<ul><li><p>Dispatch within 24 hours</p><ul><li><p>Same day for orders before 11:00</p></li></ul></li><li><p>Own fleet to Nakuru, Kericho and Narok</p></li></ul>'
    + '<blockquote><p>Keep in a cool, dry place, off the floor.</p></blockquote>'
    + '<table><tbody><tr><th><p>Pack</p></th><th><p>Units</p></th><th><p>Net weight</p></th></tr><tr><td><p>Bale</p></td><td><p>12 × 2 kg</p></td><td><p>24 kg</p></td></tr><tr><td><p>Sack</p></td><td><p>1 × 25 kg</p></td><td><p>25 kg</p></td></tr></tbody></table>'
    + '<figure class="media"><oembed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ"></oembed></figure><hr><p>Questions? Use <code>MVN-2K-12</code> when you call.</p>',
  text: '',
}

const richAfter = { html: '<h3>Mwangaza Wholesalers</h3><p>Family wholesaler serving the Rift Valley since 2011.</p><ul><li>Dispatch within 24 hours</li><li>Own fleet to Nakuru, Kericho, Narok and Bomet</li></ul>', text: 'Mwangaza Wholesalers. Family wholesaler serving the Rift Valley since 2011. Dispatch within 24 hours. Own fleet to Nakuru, Kericho, Narok and Bomet.' }

const specs: Record<string, Spec> = {
  'F-01': { field: org('name'), value: organizationValues.name, after: 'Mwangaza Wholesalers & Sons', theirs: 'Mwangaza Wholesale Depot', error: 'Trading name is required.' },
  'F-02': { field: extraFields.textarea!, value: 'Certificate of incorporation is a photocopy; upload the original scan.', after: 'Certificate expired in August 2026; upload the renewed certificate.', error: 'Required on rejection.', variants: [{ label: 'Input · over the limit', value: `${longNote} ${longNote}`, note: 'Count turns to the danger tone' }] },
  'F-03': { field: org('description'), value: organizationValues.description, after: richAfter, variants: [{ label: 'Input · over the limit', value: { html: `<p>${longNote.repeat(4)}</p>`, text: longNote.repeat(4) } }] },
  'F-04': { field: prod('unit_price'), value: '1740.00', after: '1795.00', theirs: '1760.00', error: 'Use at most 2 decimal places.' },
  'F-05': { field: extraFields.quantity!, value: 20, after: 25, variants: [
    { label: 'Input · below MOQ', value: 3, error: 'Minimum order is 5 bales.' },
    { label: 'Input · over stock', value: 120, error: 'Only 96 bales are available. Reduce the quantity or request a quote.' },
    { label: 'Input · off step', value: 22, error: 'Order in multiples of 5 bales: 20 or 25.' },
  ] },
  'F-06': { field: org('payment_terms_days'), value: 14, after: 30, error: 'Must be at most 90.' },
  'F-07': { field: extraFields.decimal!, value: '24.60', after: '24.80', error: 'Use at most 2 decimal places.' },
  'F-08': { field: extraFields.unit!, value: 'bale_12x2kg', after: 'sack_25kg', error: 'A sack cannot be sold in 2 kg packets; choose bale.' },
  'F-09': { field: org('organization_type'), value: 'seller', after: 'buyer', error: 'Choose an account type.' },
  'F-10': { field: extraFields.status!, value: 'under_review', after: 'active', noInput: true, variants: [{ label: 'Input · command-only', value: 'under_review', restricted: 'Status changes only through Approve, Reject or Suspend.' }] },
  'F-11': { field: org('delivery_regions'), value: organizationValues.delivery_regions, after: ['Nakuru', 'Kericho', 'Narok', 'Bomet'], error: 'Choose at most 5.', variants: [{ label: 'Input · max selected', value: ['Nakuru', 'Nairobi', 'Kiambu', 'Kericho', 'Narok'], note: 'Remaining options disabled at 5' }] },
  'F-12': { field: prod('seller'), value: sellers.mwangaza, after: sellers.rift, options: relationOptions },
  'F-13': { field: org('accepts_substitutes'), value: true, after: false },
  'F-14': { field: org('trading_since'), value: '2011-03-01', after: '2012-03-01' },
  'F-15': { field: extraFields.datetime!, value: '2026-10-16T17:00:00+03:00', after: '2026-10-18T17:00:00+03:00', variants: [{ label: 'Input · time zone', value: '2026-10-16T17:00:00+03:00', note: 'Entered and shown in East Africa Time' }] },
  'F-16': { field: extraFields.relativeTime!, value: '2026-10-12T11:32:00+03:00', noInput: true },
  'F-17': { field: org('logo'), value: [images.maize, images.flour, images.rice], noInput: true },
  'F-18': { field: org('registration_certificate'), value: organizationValues.registration_certificate },
  'F-19': { field: org('support_email'), value: organizationValues.support_email, after: 'sales@mwangaza-demo.co.ke', error: 'Enter an email address like name@business.co.ke.' },
  'F-20': { field: org('support_phone'), value: organizationValues.support_phone, after: '+254722123456', error: 'Enter a Kenyan mobile number starting 07 or 01.' },
  'F-21': { field: extraFields.url!, value: 'https://hooks.mwangaza-demo.co.ke/sokomesh', error: 'Use a secure https:// address.' },
  'F-22': { field: { ...prod('sku'), readOnly: false }, value: 'MVN-2K-12', after: 'MVN-2K-12B' },
  'F-23': { field: org('address'), value: organizationValues.address, after: { ...(organizationValues.address as object), line2: 'Godown 16' } },
  'F-24': { field: org('location'), value: organizationValues.location, options: placeOptions, variants: [{ label: 'Input · geocode error', value: null, error: 'We could not find “Nakru”. Check the spelling or choose a place from the list.' }] },
  'F-25': { field: extraFields.secret!, value: { set: true, last4: '4f2a', rotatedAt: '2026-09-30T10:00:00+03:00' } },
  'F-26': { field: extraFields.json!, value: { pack_size: { type: 'enum', choices: ['1 kg', '2 kg'] }, fortified: { type: 'boolean' } }, after: { pack_size: { type: 'enum', choices: ['1 kg', '2 kg', '5 kg'] }, fortified: { type: 'boolean' } } },
}

function ImageLifecycle() {
  const field = { ...org('logo'), label: 'Product image' }
  const [v, setV] = useState<unknown>({ state: 'empty' })
  const upload = v as ImageUpload
  useEffect(() => {
    if (upload.state === 'uploading') {
      const t = setTimeout(() => setV({ ...upload, progress: Math.min(100, (upload.progress ?? 0) + 25), state: (upload.progress ?? 0) >= 75 ? 'processing' : 'uploading' }), 350)
      return () => clearTimeout(t)
    }
    if (upload.state === 'processing') {
      const t = setTimeout(() => setV({ ...upload, state: 'ready' }), 900)
      return () => clearTimeout(t)
    }
  }, [upload])
  return (
    <div className="flex flex-col gap-3">
      <FieldInput field={field} value={v} onChange={setV} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setV({ state: 'uploading', progress: 0, fileName: 'mavuno-bale-front.png', image: images.maize })}>Simulate upload</Button>
        <Button size="sm" variant="secondary" onClick={() => setV({ state: 'rejected', fileName: 'bale.heic', reason: 'This file type is not accepted. Use PNG, JPEG.' })}>Simulate rejection</Button>
      </div>
    </div>
  )
}

function FileLifecycle() {
  const field = org('registration_certificate')
  const states = ['uploading', 'scanning', 'ready', 'restricted', 'error'] as const
  return (
    <div className="flex flex-col gap-2.5">
      {states.map(s => (
        <div key={s} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
          <span className="caps text-muted">{s}</span>
          <FieldView field={field} value={{ name: s === 'restricted' ? 'bank-letter.pdf' : 'certificate-of-incorporation.pdf', size: 482_120, type: 'application/pdf', state: s, url: s === 'ready' ? '#' : undefined }} />
        </div>
      ))}
    </div>
  )
}

function SecretLifecycle() {
  const field = extraFields.secret!
  const [v, setV] = useState<unknown>({ set: true, last4: '4f2a', rotatedAt: '2026-09-30T10:00:00+03:00' })
  useEffect(() => {
    const s = v as { rotating?: boolean }
    if (!s.rotating) return
    const t = setTimeout(() => setV({ set: true, last4: '9c1e', rotatedAt: DEMO_NOW, revealed: 'whsec_demo_7Q2xLk9Rv4mT8nWp3sZa9c1e' }), 1100)
    return () => clearTimeout(t)
  }, [v])
  return <FieldInput field={field} value={v} onChange={setV} />
}

function FieldSpecimen({ code }: { code: string }) {
  const s = specs[code]
  const [value, setValue] = useState<unknown>(s?.value ?? null)
  const [filter, setFilter] = useState<FilterValue | undefined>()
  if (!s) return null
  const hasFilter = Boolean(s.field.filter?.length) || ['text', 'currency', 'quantity', 'select', 'status', 'multiselect', 'boolean', 'date', 'datetime', 'relation', 'address', 'location', 'unit', 'integer', 'decimal', 'email', 'phone'].includes(s.field.widget)
  const filterField = { ...s.field, filter: s.field.filter?.length ? s.field.filter : ['eq'] }
  const widget = s.field.widget
  return (
    <Plates cols={2}>
      <Plate label="View · comfortable"><FieldView field={s.field} value={s.value} context="comfortable" now={DEMO_NOW} /></Plate>
      <Plate label="View · compact" note="Table cell"><div className="max-w-56"><FieldView field={s.field} value={s.value} context="compact" now={DEMO_NOW} /></div></Plate>
      {widget === 'image' ? <Plate label="View · media (cover)"><div className="max-w-xs overflow-hidden rounded-md border border-border"><FieldView field={s.field} value={products[0]!.image} context="media" /></div></Plate> : null}
      <Plate label="View · empty"><FieldView field={s.field} value={null} /></Plate>
      {!s.noInput ? <Plate label="Input" note="Contract constraints mirrored on blur"><FieldInput field={s.field} value={value} onChange={setValue} options={s.options} /></Plate> : null}
      {widget === 'richtext' ? <Plate label="Input · every content type" note="Image, nested list, quote, table, video and rule" span><FieldInput field={{ ...s.field, maxLength: 4000 }} value={richFull} onChange={() => undefined} mirror={false} /></Plate> : null}
      {widget === 'richtext' ? <Plate label="View · every content type" note="Video plays only on request" span><FieldView field={s.field} value={richFull} context="comfortable" /></Plate> : null}
      {widget === 'image' ? <Plate label="Input · upload lifecycle" span><ImageLifecycle /></Plate> : null}
      {widget === 'file' ? <Plate label="States" span><FileLifecycle /></Plate> : null}
      {widget === 'secret' ? <Plate label="Rotate · revealed once" span><SecretLifecycle /></Plate> : null}
      {s.variants?.map(v => (
        <Plate key={v.label} label={v.label} note={v.note}>
          <FieldInput field={s.field} value={v.value} onChange={() => undefined} error={v.error} restrictedReason={v.restricted} options={s.options} mirror={false} />
        </Plate>
      ))}
      {s.error ? <Plate label="Input · error" note="Server message wins"><FieldInput field={s.field} value={s.value} onChange={() => undefined} error={s.error} options={s.options} /></Plate> : null}
      {!s.noInput && widget !== 'secret' ? <Plate label="Input · disabled"><FieldInput field={s.field} value={s.value} onChange={() => undefined} disabled options={s.options} /></Plate> : null}
      {!s.noInput && widget !== 'secret' ? <Plate label="Input · permission-restricted"><FieldInput field={s.field} value={s.value} onChange={() => undefined} restrictedReason="Only seller managers can change this." /></Plate> : null}
      {hasFilter ? <Plate label="Filter" note={`op: ${filter?.op ?? (filterField.filter?.[0] ?? 'eq')}`}><FieldFilter field={filterField} value={filter} onChange={setFilter} options={s.options} counts={widget === 'select' || widget === 'status' ? Object.fromEntries((s.field.choices ?? []).map((c, i) => [c.value, [12, 4, 0, 7][i % 4]!])) : undefined} /></Plate> : null}
      {s.after !== undefined ? <Plate label="Diff · changed"><FieldDiff field={s.field} before={s.value} after={s.after} /></Plate> : null}
      {s.theirs !== undefined ? <Plate label="Diff · conflict" span><FieldDiff field={s.field} before={s.value} after={s.after} theirs={s.theirs} /></Plate> : null}
    </Plates>
  )
}

export default function FieldSpecimens({ code }: { code: string }) {
  return <FieldSpecimen code={code} />
}
