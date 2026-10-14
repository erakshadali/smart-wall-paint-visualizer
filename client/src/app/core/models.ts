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

export type Finish = 'matte' | 'satin' | 'glossy';

export interface WallDto {
  type: 'polygon' | 'brush';
  points: { x: number; y: number }[];
  brushSize?: number;
  colorId?: string;
  opacity: number;
  finish: Finish;
}

export interface Project {
  _id: string;
  title: string;
  originalImageUrl: string;
  resultImageUrl?: string;
  walls: (WallDto & { _id?: string })[];
  updatedAt: string;
}
