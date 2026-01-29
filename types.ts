export interface DreamAnalysis {
  symbols: { name: string; meaning: string; type: 'person' | 'place' | 'object' | 'action' }[];
  emotionalAnalysis: string;
  moods: string[];
  creativeStory: string;
  themes: string[];
}

export interface Dream {
  id: string;
  timestamp: number;
  content: string;
  mood: string;
  clarity: number; // 1-5
  isRecurring: boolean;
  imageUrl?: string;
  analysis?: DreamAnalysis;
  isPublic?: boolean; // For shared universe
  realityConnection?: string; // Follow up
}

export type Tab = 'journal' | 'stats' | 'universe' | 'community';

export const MOODS = ['Euphoric', 'Peaceful', 'Confused', 'Anxious', 'Terrified', 'Surreal', 'Nostalgic', 'Adventurous'];
