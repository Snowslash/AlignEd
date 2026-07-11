export interface QuickFormState {
  title: string;
  date: string;
  audience: string;
  level: string;
  topic: string;
  durationMinutes: number;
  setting: string;
}

export type EntryMode = 'retrospective' | 'prospective';
