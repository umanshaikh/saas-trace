import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats integer paise into Indian Rupee string with 2 decimal places.
 * e.g. 125000 -> "₹1,250.00"
 */
export function formatPaise(paise: number): string {
  if (isNaN(paise) || paise === null || paise === undefined) return "₹0.00";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Formats integer paise into Indian Rupee string without decimals if whole.
 * e.g. 125000 -> "₹1,250"
 */
export function formatPaiseSimple(paise: number): string {
  if (isNaN(paise) || paise === null || paise === undefined) return "₹0";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Converts user input rupees to integer paise safely avoiding floating point artifacts.
 */
export function rupeesToPaise(rupees: number): number {
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts paise to float rupees for number input displays.
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Generates human-friendly sequential invoice numbers
 * e.g. TRC-2026-89421
 */
export function generateInvoiceNumber(prefix: string = "TRC"): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${randomSuffix}`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
