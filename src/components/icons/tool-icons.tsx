"use client";

import {
  Combine, Split, Minimize2, LayoutGrid, RotateCcw, FileMinus2, FilePlus2,
  FileText, Wrench, ScanText, FileCode, Presentation, Table2, ImagePlus, Globe,
  BarChart3, FileImage, Archive, Edit3, ListOrdered, Droplets, Unlock, Lock,
  Diff, FileType, Crop, Paintbrush, PanelTop, FileSpreadsheet,
  Image as ImageIcon, Expand, Wand2, CircleEllipsis, Type, ArrowRightLeft, ImageUp,
  BrainCircuit, QrCode, Link as LinkIcon, Scale, Calculator, Bot, Waypoints, FileJson,
  type LucideIcon
} from 'lucide-react';

const iconMap: { [key: string]: LucideIcon } = {
  Combine,
  Split,
  Minimize2,
  LayoutGrid,
  RotateCcw,
  FileMinus2,
  FilePlus2,
  FileText,
  Wrench,
  ScanText,
  FileCode,
  Presentation,
  Table2,
  ImagePlus,
  Globe,
  BarChart3,
  FileImage,
  Archive,
  Edit3,
  ListOrdered,
  Droplets,
  Unlock,
  Lock,
  Diff,
  FileType,
  Crop,
  Paintbrush,
  PanelTop,
  FileSpreadsheet,
  'Image': ImageIcon,
  'ImageIcon': ImageIcon,
  Expand,
  Wand2,
  CircleEllipsis,
  Type,
  ArrowRightLeft,
  ImageUp,
  BrainCircuit,
  QrCode,
  'Link': LinkIcon,
  'LinkIcon': LinkIcon,
  Scale,
  Calculator,
  Bot,
  Waypoints,
  FileJson,
};

export function getToolIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText; // Return FileText as a fallback
}
