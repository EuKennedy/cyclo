import clsx, { type ClassValue } from 'clsx';

/** Conditional className join. */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
