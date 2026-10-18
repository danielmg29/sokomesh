import {
  Archive, BadgeCheck, Ban, Check, ClipboardCheck, Copy, Download, Eye, FilePlus2, FileText, HandCoins, Mail, MessageSquare, Package, PackageCheck,
  PackageMinus, Pencil, Printer, ReceiptText, RefreshCw, Repeat2, Scale, Send, ShoppingCart, Trash2, Truck, Undo2, Upload, UserPlus, X, type LucideIcon,
} from 'lucide-react'

/** Contract icon names (kebab-case, from action metadata) to the drawn icon set. */
export const actionIcons: Record<string, LucideIcon> = {
  archive: Archive, 'badge-check': BadgeCheck, ban: Ban, check: Check, 'clipboard-check': ClipboardCheck, copy: Copy, download: Download,
  eye: Eye, 'file-plus': FilePlus2, 'file-text': FileText, 'hand-coins': HandCoins, mail: Mail, 'message-square': MessageSquare, package: Package,
  'package-check': PackageCheck, 'package-minus': PackageMinus, pencil: Pencil, printer: Printer, receipt: ReceiptText, 'refresh-cw': RefreshCw,
  repeat: Repeat2, scale: Scale, send: Send, 'shopping-cart': ShoppingCart, 'trash-2': Trash2, truck: Truck, 'undo-2': Undo2, upload: Upload,
  'user-plus': UserPlus, x: X,
}

export const iconFor = (name?: string) => (name ? actionIcons[name] : undefined)
