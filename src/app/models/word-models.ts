export type Difficulty = 'easy' | 'normal' | 'hard';

export interface WordHints {
  easy: [string, string, string];
  normal: [string, string, string];
  hard: [string, string, string];
}

export interface WordEntry {
  id: string;
  category: string;
  subcategory: string;
  word: string;
  similarWords: [string, string, string];
  hints: WordHints;
}

export interface CategorySource {
  id: string;
  label: string;
  entries: WordEntry[];
  enabled: boolean;
}

export interface WordSelection {
  id: string;
  category: string;
  subcategory: string;
  similarWords: [string, string, string];
  hint: string;
  word: string;
}
