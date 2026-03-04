/**
 * Global type augmentations for Window interface
 */

import type { Feature } from '@automaker/types';

interface MockContextFile {
  featureId: string;
  path: string;
  content: string;
}

export interface MockProject {
  id: string;
  name?: string;
  path: string;
  lastOpened?: string;
}

declare global {
  interface Window {
    __mockFeatures?: Feature[];
    __currentProject?: MockProject | null;
    __mockContextFile?: MockContextFile;
    __checkApiMode?: () => void;
  }
}

export {};
