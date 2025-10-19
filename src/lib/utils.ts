import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely get an item from localStorage with fallback
 * @param key - The localStorage key
 * @param fallback - Value to return if operation fails (default: null)
 * @returns The stored value or the fallback
 */
export function safeGetItem(key: string, fallback: string | null = null): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`localStorage.getItem failed for key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely set an item in localStorage with error handling
 * @param key - The localStorage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * @param key - The localStorage key
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`localStorage.removeItem failed for key "${key}":`, error);
    return false;
  }
}
