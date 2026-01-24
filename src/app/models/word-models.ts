export type Difficulty = 'easy' | 'normal' | 'hard';

export interface WordSub {
  id?: string;
  easy?: string[];
  normal?: string[];
  hard?: string[];
}

export interface WordEntryRaw {
  category?: string;
  sub?: WordSub;
  words?: string[];
}

export interface WordHints {
  easy: string[];
  normal: string[];
  hard: string[];
}

export interface WordEntry {
  category: string;
  hints: WordHints;
  words: string[];
}

export interface CategorySource {
  id: string;
  label: string;
  entries: WordEntry[];
  enabled: boolean;
}

export interface WordSelection {
  category: string;
  hint: string;
  word: string;
}
