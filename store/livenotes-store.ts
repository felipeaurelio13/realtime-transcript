import { create } from 'zustand';
import { EMPTY_SUMMARY, SummaryShape, TranscriptBlock } from '@/lib/types';
import { uid } from '@/lib/utils';

interface CostState {
  transcriptionCost: number;
  summaryCost: number;
  recordingStartedAt: number | null;
}

interface LiveNotesState extends CostState {
  status: 'idle' | 'recording';
  errorMessage: string | null;
  contextPrompt: string;
  liveTranscript: string;
  committedTranscript: TranscriptBlock[];
  fullTranscript: string;
  /** Character offset up to which the transcript has been summarized (O(1) delta calc). */
  summarizedOffset: number;
  currentSummary: SummaryShape;
  lastSummaryUpdateAt: number;
  /** Timestamp when the first transcript block was committed (for adaptive batching). */
  sessionStartedAt: number | null;
  setStatus: (status: 'idle' | 'recording') => void;
  setErrorMessage: (message: string | null) => void;
  setContextPrompt: (value: string) => void;
  setLiveTranscript: (value: string) => void;
  updateLiveDelta: (delta: string) => void;
  commitLiveTranscript: (text?: string, options?: { preserveLiveTranscript?: boolean }) => void;
  updateBlock: (id: string, text: string) => void;
  setSummary: (summary: SummaryShape, summarizedOffset: number) => void;
  startRecordingCost: () => void;
  stopRecordingCost: () => void;
  addSummaryCost: (inputTokens: number, outputTokens: number) => void;
  totalCost: () => number;
  reset: () => void;
}

const TRANSCRIPTION_COST_PER_MIN = 0.006; // gpt-4o-transcribe
const SUMMARY_INPUT_COST_PER_TOKEN = 0.40 / 1_000_000; // gpt-4.1-mini
const SUMMARY_OUTPUT_COST_PER_TOKEN = 1.60 / 1_000_000; // gpt-4.1-mini

const initialState = {
  status: 'idle' as const,
  errorMessage: null,
  contextPrompt: '',
  liveTranscript: '',
  committedTranscript: [],
  fullTranscript: '',
  summarizedOffset: 0,
  currentSummary: EMPTY_SUMMARY,
  lastSummaryUpdateAt: 0,
  sessionStartedAt: null as number | null,
  transcriptionCost: 0,
  summaryCost: 0,
  recordingStartedAt: null as number | null
};

export const useLiveNotesStore = create<LiveNotesState>((set, get) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setContextPrompt: (contextPrompt) => set({ contextPrompt }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  updateLiveDelta: (delta) => set({ liveTranscript: `${get().liveTranscript}${delta}` }),
  commitLiveTranscript: (override, options) => {
    const currentText = (override ?? get().liveTranscript).trim();
    if (!currentText) {
      if (!options?.preserveLiveTranscript) {
        set({ liveTranscript: '' });
      }
      return;
    }

    const block: TranscriptBlock = {
      id: uid(),
      text: currentText,
      createdAt: Date.now()
    };

    set((state) => ({
      liveTranscript: options?.preserveLiveTranscript ? state.liveTranscript : '',
      committedTranscript: [...state.committedTranscript, block],
      fullTranscript: state.fullTranscript ? `${state.fullTranscript}\n${currentText}` : currentText,
      sessionStartedAt: state.sessionStartedAt ?? Date.now()
    }));
  },
  updateBlock: (id, text) =>
    set((state) => {
      const blocks = state.committedTranscript.map((b) =>
        b.id === id ? { ...b, text } : b
      );
      return {
        committedTranscript: blocks,
        fullTranscript: blocks.map((b) => b.text).join('\n'),
        summarizedOffset: 0
      };
    }),
  startRecordingCost: () => set({ recordingStartedAt: Date.now() }),
  stopRecordingCost: () =>
    set((state) => {
      if (!state.recordingStartedAt) return {};
      const minutes = (Date.now() - state.recordingStartedAt) / 60_000;
      return {
        transcriptionCost: state.transcriptionCost + minutes * TRANSCRIPTION_COST_PER_MIN,
        recordingStartedAt: null
      };
    }),
  addSummaryCost: (inputTokens, outputTokens) =>
    set((state) => ({
      summaryCost:
        state.summaryCost +
        inputTokens * SUMMARY_INPUT_COST_PER_TOKEN +
        outputTokens * SUMMARY_OUTPUT_COST_PER_TOKEN
    })),
  totalCost: () => {
    const state = get();
    let transcription = state.transcriptionCost;
    if (state.recordingStartedAt) {
      transcription += ((Date.now() - state.recordingStartedAt) / 60_000) * TRANSCRIPTION_COST_PER_MIN;
    }
    return transcription + state.summaryCost;
  },
  setSummary: (summary, offset) =>
    set({
      currentSummary: summary,
      summarizedOffset: offset,
      lastSummaryUpdateAt: Date.now()
    }),
  reset: () => set({ ...initialState })
}));
