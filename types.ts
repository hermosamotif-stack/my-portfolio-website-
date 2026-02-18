
export interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  year: string;
}

export enum Section {
  HERO = 'hero',
  WORK = 'work',
  ABOUT = 'about',
  SERVICES = 'services',
  CONTACT = 'contact'
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
