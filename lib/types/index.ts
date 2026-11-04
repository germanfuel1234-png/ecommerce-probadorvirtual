// Product Types
export interface Clothing {
  id: string;
  name: string;
  category: 'shirt' | 'jacket' | 'sweater' | 'dress' | 'pants';
  imageUrl: string;
  price: number;
  description: string;
  color: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  clothingItems: Clothing[];
  description: string;
  category: string;
}

// Virtual Try-On Types
export type VTONState = 
  | 'idle'
  | 'loading'
  | 'camera_permission_denied'
  | 'camera_active'
  | 'processing_frame'
  | 'error'
  | 'stream_active';

export interface VTONFrame {
  timestamp: number;
  data: Blob | ArrayBuffer;
  format: 'jpeg' | 'webp' | 'png';
}

export interface VTONResponse {
  success: boolean;
  processedFrame?: Blob;
  timestamp: number;
  error?: string;
  latency: number; // milliseconds
}

// Cart Types
export interface CartItem {
  clothingId: string;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// API Client Types
export interface VTONAPIConfig {
  provider: 'replicate' | 'fashn' | 'decart' | 'mock';
  apiKey?: string;
  endpoint?: string;
  modelId?: string;
  wsUrl?: string;
}

export interface VTONRequestPayload {
  frame: Blob;
  clothingImage: Blob;
  clothingType: Clothing['category'];
  userId?: string;
  sessionId?: string;
}

// UI Types
export interface GuidanceFrame {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}
