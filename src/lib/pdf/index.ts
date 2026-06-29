import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { generateBarcodeDataURL } from '../barcodeUtils';
import { QRItem } from '../../types';

// Include the extracted content directly here and fix references
