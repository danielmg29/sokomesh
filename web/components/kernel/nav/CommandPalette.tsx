'use client'

import { ArrowDown, ArrowUp, Search, type LucideIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Kbd } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandLoading } from '@/components/ui/command'
import { Icon } from '@/components/ui/icon'

export type PaletteEntry = { id: string; label: string; group: string; hint?: string; icon?: LucideIcon; keywords?: string[]; onSelect: () => void }

type Props = {
  /** Navigation targets and collection actions the viewer's role may run. */
  entries: readonly PaletteEntry[]
  placeholder?: string
  searching?: boolean
  triggerLabel?: string
  /** Render the trigger as a wide search field (masthead) or an icon button. */
  trigger?: 'field' | 'icon'
}

/** Ctrl/⌘ K opens it anywhere. Fully keyboard-operable; groups keep the contract's order. */
export function CommandPalette({ entries, placeholder = 'Search or jump to…', searching, triggerLabel = 'Search', trigger = 'field' }: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const groups = [...new Set(entries.map(e => e.group))]
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        {trigger === 'field' ? (
          <button type="button" className="flex h-9 w-full max-w-sm items-center gap-2 rounded-sm border pointer-coarse:h-(--touch-target) border-chrome-muted/40 bg-chrome-foreground/5 px-3 text-left text-md text-chrome-muted hover:bg-chrome-foreground/10">
            <Icon icon={Search} />
            <span className="flex-1 truncate">{triggerLabel}</span>
            <Kbd className="border-chrome-muted/50 bg-transparent text-chrome-muted pointer-coarse:hidden">Ctrl K</Kbd>
          </button>
        ) : (
          <Button variant="secondary" size="icon" aria-label={triggerLabel}><Icon icon={Search} /></Button>
        )}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-reveal" />
        <DialogPrimitive.Content className="fixed top-[12dvh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-md border border-border-strong bg-surface shadow-overlay data-[state=open]:animate-reveal">
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Type to search, use the arrow keys to move and Enter to choose.</DialogPrimitive.Description>
          <Command loop>
            <CommandInput placeholder={placeholder} autoFocus />
            <CommandList className="max-h-[min(60dvh,26rem)]">
              {searching ? <CommandLoading><span className="block px-3 py-4 text-md text-muted">Searching…</span></CommandLoading> : null}
              <CommandEmpty>No matching pages or actions. Try a product name, SKU or order number.</CommandEmpty>
              {groups.map(g => (
                <CommandGroup key={g} heading={g}>
                  {entries.filter(e => e.group === g).map(e => (
                    <CommandItem key={e.id} value={`${e.label} ${e.keywords?.join(' ') ?? ''} ${e.id}`} onSelect={() => { setOpen(false); e.onSelect() }}>
                      {e.icon ? <Icon icon={e.icon} className="text-muted" /> : null}
                      <span className="flex-1 truncate">{e.label}</span>
                      {e.hint ? <span className="font-mono text-xs text-muted">{e.hint}</span> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
          <div className="flex items-center gap-3 border-t border-border bg-sunken px-3 py-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Kbd aria-label="Up arrow"><Icon icon={ArrowUp} className="size-3" /></Kbd><Kbd aria-label="Down arrow"><Icon icon={ArrowDown} className="size-3" /></Kbd> move</span><span><Kbd>Enter</Kbd> open</span><span><Kbd>Esc</Kbd> close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
