import { create } from 'zustand';
import type { ToastPayload, NotificationType } from '@/types';

interface ToastState {
  toasts: ToastPayload[];
  push: (type: NotificationType, title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

let seed = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, title, message) => {
    const id = `toast-${Date.now()}-${seed++}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }));
    setTimeout(() => {
      get().dismiss(id);
    }, 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(type: NotificationType, title: string, message?: string) {
  useToastStore.getState().push(type, title, message);
}

export const toastSuccess = (title: string, message?: string) =>
  useToastStore.getState().push('Success', title, message);
export const toastError = (title: string, message?: string) =>
  useToastStore.getState().push('Error', title, message);
export const toastWarning = (title: string, message?: string) =>
  useToastStore.getState().push('Warning', title, message);
export const toastInfo = (title: string, message?: string) =>
  useToastStore.getState().push('Info', title, message);