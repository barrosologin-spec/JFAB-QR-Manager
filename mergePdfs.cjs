const fs = require('fs');

const danfeContent = fs.readFileSync('src/lib/pdf/generateDanfeContent.ts', 'utf-8');
const plateContent = fs.readFileSync('src/lib/pdf/generatePlateContent.ts', 'utf-8');
const printPlateContent = fs.readFileSync('src/lib/pdf/generatePrintPlateContent.ts', 'utf-8');

const combined = `
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { generateBarcodeDataURL } from '../barcodeUtils';
import { QRItem } from '../../types';

export interface PDFContext {
  items: QRItem[];
  selectedContainer: string;
  selectedCategory: string;
  selectedDate: string;
  isFinalized: boolean;
  pdfSettings: any;
  setPdfProgress: (progress: any) => void;
  addNotification: (type: 'success'|'error'|'info'|'warning', title: string, message: string) => void;
  addCustomAuditLog: (action: string, details: string) => Promise<void>;
  storage: any;
}

export const generateDanfe = async (ctx: PDFContext, targetItems?: QRItem[]) => {
  const { items, selectedContainer, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;
  ${danfeContent.replace(/const handleDownloadDanfePDF = async \(targetItems\?: QRItem\[\]\) => \{/, '')}

export const generateContainerReport = async (ctx: PDFContext) => {
  const { items, selectedContainer, selectedCategory, selectedDate, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;
  ${plateContent.replace(/const handleDownloadPDF = async \(\) => \{/, '')}

export const printContainerPlate = async (ctx: PDFContext) => {
  const { items, selectedContainer, selectedCategory, selectedDate, isFinalized, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog, storage } = ctx;
  ${printPlateContent.replace(/const handlePrintPlate = async \(\) => \{/, '')}
`;

fs.writeFileSync('src/lib/pdf/generators.ts', combined);

const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
const newAppContent = appContent.replace(
  "import {jsPDF} from 'jspdf';",
  "import {jsPDF} from 'jspdf';\nimport { generateDanfe, generateContainerReport, printContainerPlate } from './lib/pdf/generators';"
);
fs.writeFileSync('src/App.tsx', newAppContent);
