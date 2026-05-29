import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WS_URL = `${import.meta.env.VITE_BACKEND_URL}`;
export const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
