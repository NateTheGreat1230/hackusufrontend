import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEntityNumber(number: string | number | undefined | null, prefix: "INV" | "PROJ" | "TK" | "MO"): string {
  if (number === undefined || number === null || number === '') return '---';
  const numStr = String(number).replace(/\D/g, '');
  if (!numStr) return '---';
  return `${prefix}${numStr}`;
}
