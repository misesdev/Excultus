import { create } from 'zustand';

export type FeedbackTone = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackMessage {
  id: number;
  message: string;
  tone: FeedbackTone;
  action?: { label: string; onPress: () => void };
}

interface FeedbackState {
  current: FeedbackMessage | null;
  show: (message: Omit<FeedbackMessage, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

/** Transient UI feedback (toasts/snackbars). Presentation-only state. */
export const useFeedbackStore = create<FeedbackState>(set => ({
  current: null,
  show: message => set({ current: { ...message, id: ++nextId } }),
  dismiss: id => set(state => (state.current?.id === id ? { current: null } : state)),
}));

/** Imperative helpers usable from hooks and callbacks. */
export const feedback = {
  info: (message: string) => useFeedbackStore.getState().show({ message, tone: 'info' }),
  success: (message: string) =>
    useFeedbackStore.getState().show({ message, tone: 'success' }),
  error: (message: string, action?: FeedbackMessage['action']) =>
    useFeedbackStore.getState().show({ message, tone: 'error', action }),
  withAction: (
    message: string,
    action: FeedbackMessage['action'],
    tone: FeedbackTone = 'info',
  ) => useFeedbackStore.getState().show({ message, tone, action }),
};
