'use client'

// SM-F-23 an organization's integrations: API clients, their scoped tokens, signed webhooks and the
// deliveries made to them. A new token and a webhook's signing secret are readable once, in the answer that
// creates (or replaces) them; this tab shows that value until the person says they have stored it.

import { KeyRound, PlugZap, Webhook } from 'lucide-react'
import { useState } from 'react'
import { IntegrationPanel, type ApiToken, type RevealedSecret, type WebhookEndpoint } from '@/components/commerce/admin'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { API_BASE, ApiClientMeta, ApiTokenMeta, WebhookDeliveryMeta, WebhookEndpointMeta } from '@/lib/contract/generated'
import { attempt } from '@/lib/client/api'
import type { ApiTokenRecord, WebhookRecord } from '@/lib/client/records'
import { useCommand, useList, useSave, useSource } from '@/lib/client/resources'
import type { Rec } from '@/lib/contract/types'

type ClientRecord = Rec & { name: string; status: 'active' | 'revoked' }
// Everything an organization holds fits one page of each (the contract's largest).
const ALL = (max: number) => `page_size=${max}`

const tokenView = (t: ApiTokenRecord): ApiToken => ({
  id: t.id, name: t.name, scopes: t.scopes, last4: t.last4, createdAt: t.created_at, lastUsedAt: t.last_used_at ?? undefined, status: t.status, client: t.client.label, expiresAt: t.expires_at ?? undefined,
})
const webhookView = (w: WebhookRecord): WebhookEndpoint => ({
  id: w.id, url: w.url, events: w.events, active: w.is_active, lastDelivery: w.last_delivery ? { ...w.last_delivery, code: w.last_delivery.code ?? undefined } : undefined,
})

export function IntegrationsTab({ canManage }: { canManage: boolean }) {
  const clients = useList<ClientRecord>(ApiClientMeta, ALL(ApiClientMeta.list.maxPageSize))
  const tokens = useList<ApiTokenRecord>(ApiTokenMeta, ALL(ApiTokenMeta.list.maxPageSize))
  const webhooks = useList<WebhookRecord>(WebhookEndpointMeta, ALL(WebhookEndpointMeta.list.maxPageSize))
  const clientSource = useSource(ApiClientMeta)
  const deliverySource = useSource(WebhookDeliveryMeta)
  const clientCommand = useCommand(ApiClientMeta, [ApiTokenMeta])
  const tokenCommand = useCommand(ApiTokenMeta)
  const hookCommand = useCommand(WebhookEndpointMeta)
  const deliveryCommand = useCommand(WebhookDeliveryMeta, [WebhookEndpointMeta])
  const saveClient = useSave(ApiClientMeta)
  const saveToken = useSave<ApiTokenRecord>(ApiTokenMeta)
  const saveHook = useSave<WebhookRecord>(WebhookEndpointMeta)
  const [revealed, setRevealed] = useState<Omit<RevealedSecret, 'onDone'> | null>(null)

  if (tokens.isPending || webhooks.isPending || clients.isPending) return <LoadingState variant="skeleton" shape="list" label="Loading integrations" />
  if (tokens.isError || webhooks.isError || clients.isError) {
    return <ErrorState kind="retryable" size="inline" title="Integrations did not load" onRetry={() => { void tokens.refetch(); void webhooks.refetch(); void clients.refetch() }} />
  }
  const tokenRecords = new Map(tokens.data.results.map(t => [t.id, t]))
  const hookRecords = new Map(webhooks.data.results.map(w => [w.id, w]))
  const active = clients.data.results.filter(c => c.status === 'active').map(c => ({ value: c.id, label: c.name }))
  const showSecret = (w: WebhookRecord) => w.secret && setRevealed({ title: 'Signing secret', value: w.secret, detail: `Deliveries to ${w.url} are signed with this secret. Store it where the receiving system can read it; it is not shown again.` })

  const addClient = canManage ? (
    <ProjectedForm meta={ApiClientMeta} fields={['name']} mode="create" recipe="sheet" submitLabel="Add client" title="New API client"
      description="One per system that connects (an ERP, a stock sheet, a reporting job), so its tokens can be revoked together."
      trigger={<Button variant="secondary" leadingIcon={PlugZap}>Add a client</Button>}
      onSubmit={values => attempt(() => saveClient.mutateAsync({ body: values }), 'Client added')} />
  ) : null
  const addToken = canManage ? (
    <ProjectedForm meta={ApiTokenMeta} fields={['client', 'name', 'scopes', 'expires_at']} mode="create" recipe="sheet" submitLabel="Issue token" options={{ client: active }}
      title="New API token" description={active.length ? 'The token is shown once, when it is issued. Give it only the scopes the system needs.' : 'Add an API client first; each token belongs to one.'}
      trigger={<Button variant="primary" leadingIcon={KeyRound}>Issue a token</Button>}
      onSubmit={values => attempt(async () => {
        const t = await saveToken.mutateAsync({ body: values })
        if (t.token) setRevealed({ title: `Token “${t.name}”`, value: t.token, detail: 'Copy it into the system that will use it. SokoMesh keeps only a fingerprint and cannot show it again; revoke it and issue another if it is lost.' })
      }, 'Token issued')} />
  ) : null
  const addWebhook = canManage ? (
    <ProjectedForm meta={WebhookEndpointMeta} fields={['url', 'events']} mode="create" recipe="sheet" submitLabel="Add webhook" title="New webhook"
      description="An HTTPS address on the public internet. Each event is sent as a signed POST and retried with growing gaps if it fails."
      trigger={<Button variant="primary" leadingIcon={Webhook}>Add a webhook</Button>}
      onSubmit={values => attempt(async () => showSecret(await saveHook.mutateAsync({ body: values })), 'Webhook added')} />
  ) : null

  return (
    <div className="flex flex-col gap-10">
      <PageSection title="API clients" description="The systems that connect to SokoMesh for your organization. Revoking a client revokes all its tokens." actions={addClient}>
        <ListBlock meta={ApiClientMeta} records={[]} query="server" source={clientSource} onRun={clientCommand.run}
          empty={{ kind: 'no-data', title: 'No clients', description: canManage ? 'Add one for each system you connect.' : 'An owner or manager can connect systems.' }} />
      </PageSection>
      <PageSection title="Tokens and webhooks" description="Tokens let a system read or change your data; webhooks tell it when something changes. Each is shown in full only once.">
        <IntegrationPanel tokens={tokens.data.results.map(tokenView)} webhooks={webhooks.data.results.map(webhookView)}
          revealed={revealed ? { ...revealed, onDone: () => setRevealed(null) } : null} addToken={addToken} addWebhook={addWebhook}
          tokenActions={t => <ActionBar meta={ApiTokenMeta} record={tokenRecords.get(t.id)!} onRun={tokenCommand.run} pending={tokenCommand.pending} density="compact" />}
          webhookActions={w => (
            <ActionBar meta={WebhookEndpointMeta} record={hookRecords.get(w.id)!} pending={hookCommand.pending} density="compact"
              onRun={async (action, record, input) => showSecret(await hookCommand.run(action, record, input) as WebhookRecord)} />
          )}
          deliveries={(
            <div className="flex flex-col gap-2">
              <h4 className="font-display text-lg font-bold">Deliveries</h4>
              <ListBlock meta={WebhookDeliveryMeta} records={[]} query="server" source={deliverySource} onRun={deliveryCommand.run} density="compact"
                empty={{ kind: 'no-data', title: 'No deliveries yet', description: 'Each event sent to a webhook is listed here with its attempts and the answer it got.' }} />
            </div>
          )} />
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 text-md md:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="font-semibold">Endpoints</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {['products', 'inventory', 'inventory/receipts', 'orders'].map(p => <code key={p} className="font-mono text-sm">{API_BASE}integration/{p}</code>)}
          </dd>
          <dt className="font-semibold">Authentication</dt>
          <dd><code className="font-mono text-sm">Authorization: Bearer smk_…</code>, up to 100 requests a minute per token</dd>
          <dt className="font-semibold">Webhook signature</dt>
          <dd><code className="font-mono text-sm">X-SokoMesh-Signature: t=…,v1=…</code>, an HMAC-SHA256 of the time and the body with the endpoint&apos;s secret</dd>
        </dl>
      </PageSection>
    </div>
  )
}
