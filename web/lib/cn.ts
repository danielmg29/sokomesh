import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the project's token scale so `text-md` is a size, not a colour.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
      radius: ['xs', 'sm', 'md', 'lg'],
      shadow: ['raised', 'overlay'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
