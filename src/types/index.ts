/**
 * Global TypeScript Interfaces for Ourspace
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  pairCode: string;
  partnerId?: string;
  createdAt: string;
}

export interface Couple {
  id: string;
  userOne: string; // User ID
  userTwo: string; // User ID
  anniversaryDate?: string;
  settings?: {
    theme?: string;
    notificationsEnabled?: boolean;
  };
  createdAt: string;
}

export interface StickyNote {
  id: string;
  coupleId: string;
  creatorId: string;
  title: string;
  content: string;
  color?: string; // Tailwind background style classes
  tag?: 'Love' | 'Task' | 'Reminder' | 'Idea' | 'General';
  positionX?: number;
  positionY?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  coupleId: string;
  creatorId: string;
  title: string;
  description: string;
  date: string;
  type: 'Trip' | 'Journal' | 'Milestone' | 'General';
  mediaUrls?: string[];
  createdAt: string;
}

export interface Recommendation {
  id: string;
  coupleId: string;
  creatorId: string;
  category: 'date-night' | 'watchlist' | 'places';
  title: string;
  description: string;
  rating?: string; // Fun level or metadata note
  isChecked?: boolean; // Finished or completed indicator
  createdAt: string;
}
