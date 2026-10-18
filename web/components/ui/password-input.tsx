'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { IconButton } from './button'
import { Input } from './input'

/** A password field with a show/hide toggle; the browser's password manager still sees `autoComplete`. */
export function PasswordInput({ autoComplete, ...props }: Omit<ComponentProps<typeof Input>, 'type' | 'suffix'> & { autoComplete: 'current-password' | 'new-password' }) {
  const [shown, setShown] = useState(false)
  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      autoComplete={autoComplete}
      suffix={<IconButton icon={shown ? EyeOff : Eye} label={shown ? 'Hide password' : 'Show password'} size="icon-sm" onClick={() => setShown(s => !s)} />}
    />
  )
}
