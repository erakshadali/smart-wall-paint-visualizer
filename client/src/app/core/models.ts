export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Color {
  _id: string;
  name: string;
  hex: string;
  brand?: string;
  tags?: string[];
}

export interface Pattern {
  _id: string;
  name: string;
  description?: string;
  style?: string;
  imageUrl: string;
  scale?: number;
}

export type Finish = 'matte' | 'satin' | 'glossy';

export interface WallDto {
  type: 'polygon' | 'brush';
  points: { x: number; y: number }[];
  brushSize?: number;
  colorId?: string;
  patternId?: string;
  patternScale?: number;
  opacity: number;
  finish: Finish;
}

export interface Project {
  _id: string;
  title: string;
  originalImageUrl: string;
  resultImageUrl?: string;
  walls: (WallDto & { _id?: string })[];
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  users: number;
  imagesUploaded: number;
  designsSaved: number;
  avgSessionSeconds: number;
  avgSatisfaction: number;
  feedbackCount: number;
}

export interface TimelineDay {
  day: string;
  uploads: number;
  saved: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  projectCount: number;
}

export interface AdminProject extends Omit<Project, 'walls'> {
  walls: unknown[];
  owner?: { name: string; email: string };
}
