import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR');
}

export function extractLastDigits(text: string, count = 12): string {
  const digits = (text || '').replace(/\s/g, '').replace(/\D/g, '');
  return digits.slice(-count) || '0000';
}
