import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

export type SummaryTimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;

export const SUMMARY_MODAL_DELAY_MS = 2800;

export const cancelSummaryModal = (timerRef: SummaryTimerRef): void => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
};

export const scheduleSummaryModal = (
  timerRef: SummaryTimerRef,
  setShowGameSummary: Dispatch<SetStateAction<boolean>>,
  delayMs: number = SUMMARY_MODAL_DELAY_MS,
): void => {
  cancelSummaryModal(timerRef);
  timerRef.current = setTimeout(() => {
    setShowGameSummary(true);
    timerRef.current = null;
  }, delayMs);
};