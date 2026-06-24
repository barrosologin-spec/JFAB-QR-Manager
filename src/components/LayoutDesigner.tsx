import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { 
  Palette, 
  Sliders, 
  Settings2, 
  Layout, 
  FileText, 
  Printer, 
  Sparkles, 
  Undo,
  Save, 
  Trash2, 
  Eye, 
  Maximize, 
  CheckCircle2, 
  Check, 
  RotateCcw,
  Heading,
  HelpCircle,
  Tag
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateBarcodeDataURL } from '../lib/barcodeUtils';
import { useSyncData } from '../hooks/useSyncData';

interface DesignerTemplate {
  name: string;
  title: string;
  subtitle: string;
  showCategory: boolean;
  showContainer: boolean;
  showTimestamp: boolean;
  showFooterNotes: boolean;
  footerNotesText: string;
  primaryColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  useQrCode: boolean;
  qrScale: number;
  barcodeScale: number;
  fontSizeTitle: number;
  fontSizeDetails: number;
  textColor: string;
  aspectRatio: 'plate' | 'thermal' | 'badge';
  padding: number;
  bgTexture: 'clean' | 'grid' | 'dots' | 'gradient';
}

interface DanfeTemplate {
  name: string;
  themeColor: string;
  showReceipt: boolean;
  showWatermark: boolean;
  watermarkText: string;
  showAdditionalNotes: boolean;
  customLogoText: string;
  showSysAuthentication: boolean;
  customStampText: string;
  rowSpacing: number;
  fontSizeHeader: number;
  fontSizeItems: number;
  margins: number;
}

const DEFAULT_TEMPLATES: Record<string, DesignerTemplate> = {
  industrial: {
    name: "Industrial Padrão",
    title: "CONTROLE DE ATIVOS",
    subtitle: "LOGÍSTICA & ESTOQUE",
    showCategory: true,
    showContainer: true,
    showTimestamp: true,
    showFooterNotes: true,
    footerNotesText: "PROPRIEDADE REGISTRADA - NÃO ALTERAR",
    primaryColor: "#1e3a8a", // dark blue
    borderColor: "#1e3a8a",
    borderWidth: 4,
    borderRadius: 16,
    useQrCode: true,
    qrScale: 1.1,
    barcodeScale: 1.0,
    fontSizeTitle: 18,
    fontSizeDetails: 11,
    textColor: "#0f172a",
    aspectRatio: 'plate',
    padding: 24,
    bgTexture: 'grid'
  },
  minimalist: {
    name: "Mínimo Elegante",
    title: "IDENTIFICAÇÃO DE ATIVO",
    subtitle: "Rastreabilidade Digital",
    showCategory: true,
    showContainer: true,
    showTimestamp: false,
    showFooterNotes: true,
    footerNotesText: "Scan me to register audit",
    primaryColor: "#0f172a", // slate 900
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    useQrCode: true,
    qrScale: 0.95,
    barcodeScale: 1.0,
    fontSizeTitle: 15,
    fontSizeDetails: 10,
    textColor: "#1e293b",
    aspectRatio: 'plate',
    padding: 20,
    bgTexture: 'clean'
  },
  thermal: {
    name: "Etiqueta Térmica 100x150",
    title: "CONTAINER RECEPTOR",
    subtitle: "GERENCIAMENTO INDUSTRIAL",
    showCategory: false,
    showContainer: true,
    showTimestamp: true,
    showFooterNotes: true,
    footerNotesText: "SISTEMA INTEGRADO DE RASTREAMENTO",
    primaryColor: "#000000",
    borderColor: "#000000",
    borderWidth: 2,
    borderRadius: 0,
    useQrCode: false,
    qrScale: 1.0,
    barcodeScale: 1.25,
    fontSizeTitle: 16,
    fontSizeDetails: 12,
    textColor: "#000000",
    aspectRatio: 'thermal',
    padding: 16,
    bgTexture: 'clean'
  },
  badge: {
    name: "Crachá Compacto",
    title: "RFID / QR ATIVO ID",
    subtitle: "Acesso & Movimentação",
    showCategory: true,
    showContainer: true,
    showTimestamp: true,
    showFooterNotes: false,
    footerNotesText: "VÁLIDO PARA AUDITORIAS INTERNAS",
    primaryColor: "#0d9488", // teal-600
    borderColor: "#0d9488",
    borderWidth: 5,
    borderRadius: 24,
    useQrCode: true,
    qrScale: 1.2,
    barcodeScale: 1.0,
    fontSizeTitle: 14,
    fontSizeDetails: 10,
    textColor: "#111827",
    aspectRatio: 'badge',
    padding: 18,
    bgTexture: 'dots'
  }
};

export function LayoutDesigner() {
  const { addCustomAuditLog } = useSyncData();
  const [activeSubTab, setActiveSubTab] = useState<'item' | 'plate' | 'danfe'>('item');

  // Load custom template item
  const [templateItem, setTemplateItem] = useState<DesignerTemplate>(() => {
    const savedItem = localStorage.getItem('jfab_custom_template_item') || localStorage.getItem('jfab_custom_template');
    if (savedItem) {
      try {
        const parsed = JSON.parse(savedItem);
        parsed.name = parsed.name || "Etiqueta do Item";
        return parsed;
      } catch (e) {}
    }
    return { ...DEFAULT_TEMPLATES.industrial, name: "Etiqueta Padrão do Item" };
  });

  // Load custom template plate
  const [templatePlate, setTemplatePlate] = useState<DesignerTemplate>(() => {
    const savedPlate = localStorage.getItem('jfab_custom_template_plate');
    if (savedPlate) {
      try {
        const parsed = JSON.parse(savedPlate);
        parsed.name = parsed.name || "Placa de Identificação";
        return parsed;
      } catch (e) {}
    }
    return {
      ...DEFAULT_TEMPLATES.industrial,
      name: "Placa Geral de Identificação",
      title: "PLACA DE IDENTIFICAÇÃO",
      subtitle: "CONTÊINER DE LOGÍSTICA DIGITAL",
      aspectRatio: 'plate',
      primaryColor: '#dc2626', // Red default for plate
      borderColor: '#dc2626'
    };
  });

  // Load custom template danfe
  const [templateDanfe, setTemplateDanfe] = useState<DanfeTemplate>(() => {
    const saved = localStorage.getItem('jfab_custom_template_danfe');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.name = parsed.name || "Layout Padrão DANFE";
        return parsed;
      } catch (e) {}
    }
    return {
      name: "Layout Padrão DANFE",
      themeColor: "#10b981", // Emerald default
      showReceipt: true,
      showWatermark: true,
      watermarkText: "JOSÉ FELIPE A. BARROSO",
      showAdditionalNotes: true,
      customLogoText: "EMITENTE AUTOMÁTICO S.A.",
      showSysAuthentication: true,
      customStampText: "STATUS: APROVADA & CONSOLIDADA",
      rowSpacing: 6,
      fontSizeHeader: 10,
      fontSizeItems: 6,
      margins: 8
    };
  });

  // Debounced log updates for layout customization
  useEffect(() => {
    // Set initial layout payload to avoid logging on first mount
    const lastLogged = localStorage.getItem('jfab_last_logged_layout');
    const currentPayload = JSON.stringify({ templateItem, templatePlate, templateDanfe });
    if (!lastLogged) {
      localStorage.setItem('jfab_last_logged_layout', currentPayload);
      return;
    }

    const timer = setTimeout(() => {
      const freshLogged = localStorage.getItem('jfab_last_logged_layout');
      if (freshLogged && freshLogged !== currentPayload) {
        addCustomAuditLog('Layout Customizado', 'Ajustes visuais no estúdio de layout (Etiquetas/DANFE) foram consolidados pelo operador.');
      }
      localStorage.setItem('jfab_last_logged_layout', currentPayload);
    }, 4000); // 4 seconds debounce
    return () => clearTimeout(timer);
  }, [templateItem, templatePlate, templateDanfe]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [customKey, setCustomKey] = useState("35230912345678000190550010001234561001234567");

  // Dynamic template resolver
  const template = activeSubTab === 'danfe' 
    ? {
        name: templateDanfe.name,
        title: templateDanfe.customLogoText,
        subtitle: "Documento Auxiliar da Nota Fiscal Eletrônica",
        showCategory: false,
        showContainer: false,
        showTimestamp: true,
        showFooterNotes: templateDanfe.showAdditionalNotes,
        footerNotesText: templateDanfe.watermarkText,
        primaryColor: templateDanfe.themeColor,
        borderColor: templateDanfe.themeColor,
        borderWidth: 1,
        borderRadius: 0,
        useQrCode: false,
        qrScale: 1,
        barcodeScale: 1,
        fontSizeTitle: templateDanfe.fontSizeHeader,
        fontSizeDetails: 8,
        textColor: "#000000",
        aspectRatio: 'plate' as const,
        padding: templateDanfe.margins,
        bgTexture: 'clean' as const,
      }
    : activeSubTab === 'item' ? templateItem : templatePlate;

  const setTemplate = (updater: DesignerTemplate | ((prev: DesignerTemplate) => DesignerTemplate)) => {
    if (activeSubTab === 'item') {
      setTemplateItem(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('jfab_custom_template_item', JSON.stringify(next));
        localStorage.setItem('jfab_custom_template', JSON.stringify(next)); // fallback backward compatibility
        return next;
      });
    } else if (activeSubTab === 'plate') {
      setTemplatePlate(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('jfab_custom_template_plate', JSON.stringify(next));
        return next;
      });
    }
  };

  const setDanfeField = <K extends keyof DanfeTemplate>(field: K, value: DanfeTemplate[K]) => {
    setTemplateDanfe(prev => {
      const next = { ...prev, [field]: value };
      localStorage.setItem('jfab_custom_template_danfe', JSON.stringify(next));
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApplyPreset = (key: keyof typeof DEFAULT_TEMPLATES) => {
    const preset = { ...DEFAULT_TEMPLATES[key] };
    if (activeSubTab === 'plate') {
      preset.name = `${preset.name} (Placa)`;
    }
    setTemplate(preset);
    showToast(`Preset "${preset.name}" aplicado à ${activeSubTab === 'item' ? 'Etiqueta' : 'Placa'} com sucesso!`, 'success');
  };

  const handleReset = () => {
    if (activeSubTab === 'item') {
      const defaultItem = { ...DEFAULT_TEMPLATES.industrial, name: "Etiqueta Padrão do Item" };
      setTemplateItem(defaultItem);
      localStorage.setItem('jfab_custom_template_item', JSON.stringify(defaultItem));
      localStorage.setItem('jfab_custom_template', JSON.stringify(defaultItem));
      showToast("Configurações da Etiqueta resetadas", 'info');
    } else if (activeSubTab === 'plate') {
      const defaultPlate = {
        ...DEFAULT_TEMPLATES.industrial,
        name: "Placa Geral de Identificação",
        title: "PLACA DE IDENTIFICAÇÃO",
        subtitle: "CONTÊINER DE LOGÍSTICA DIGITAL",
        aspectRatio: 'plate',
        primaryColor: '#dc2626',
        borderColor: '#dc2626'
      };
      setTemplatePlate(defaultPlate);
      localStorage.setItem('jfab_custom_template_plate', JSON.stringify(defaultPlate));
      showToast("Configurações da Placa do Container resetadas", 'info');
    } else {
      const defaultDanfe = {
        name: "Layout Padrão DANFE",
        themeColor: "#10b981",
        showReceipt: true,
        showWatermark: true,
        watermarkText: "JOSÉ FELIPE A. BARROSO",
        showAdditionalNotes: true,
        customLogoText: "EMITENTE AUTOMÁTICO S.A.",
        showSysAuthentication: true,
        customStampText: "STATUS: APROVADA & CONSOLIDADA",
        rowSpacing: 6,
        fontSizeHeader: 10,
        fontSizeItems: 6,
        margins: 8
      };
      setTemplateDanfe(defaultDanfe);
      localStorage.setItem('jfab_custom_template_danfe', JSON.stringify(defaultDanfe));
      showToast("Configurações do DANFE resetadas", 'info');
    }
  };

  const handleDownloadSinglePDF = async () => {
    showToast("Gerando arquivo PDF...", "info");
    
    if (activeSubTab === 'plate') {
      // 1. GENERATE FULL ORIGINAL STANDARD A4 CONTAINER PLATE
      const doc = new jsPDF('p', 'mm', 'a4');
      const primaryColor = template.primaryColor;
      const textColor = template.textColor;
      const mainBorderWidth = template.borderWidth / 3.5;
      const mainBorderRadius = template.borderRadius / 3.5;
      
      try {
        const imgData = await generateBarcodeDataURL(customKey);
        
        // Watermarks
        doc.setTextColor(243, 244, 246);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text("JOSÉ FELIPE A. BARROSO", 105, 120, { align: 'center', angle: -25 });
        doc.text("JOSÉ FELIPE A. BARROSO", 105, 230, { align: 'center', angle: 25 });

        // Rounded Outer Border
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(mainBorderWidth > 0 ? mainBorderWidth : 0.4);
        doc.roundedRect(10, 10, 190, 277, mainBorderRadius, mainBorderRadius, 'D');

        // Header (Left branding)
        doc.setTextColor(textColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("JFAB ..::SISTEMAS::..", 16, 21);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(template.title ? template.title : "EXTRATO E IDENTIFICAÇÃO DE FLUXO DE PRODUÇÃO", 16, 26);
        doc.text(template.subtitle ? template.subtitle : "QR MANAGER CLOUD • RELATÓRIO DO LOTE", 16, 31);

        // Stamp Box (Right)
        const stampX = 134;
        const stampY = 14;
        const stampW = 56;
        const stampH = 22;
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.8);
        doc.rect(stampX, stampY, stampW, stampH, 'D');
        doc.rect(stampX + 1.2, stampY + 1.2, stampW - 2.4, stampH - 2.4, 'D');

        doc.setTextColor(primaryColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("FINALIZADO", stampX + (stampW / 2), stampY + 6, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text("SISTEMA OPERACIONAL OK", stampX + (stampW / 2), stampY + 11, { align: 'center' });
        doc.setFont("helvetica", "italic");
        doc.setFontSize(5.5);
        const currentFullDate = new Date().toLocaleString('pt-BR');
        doc.text(currentFullDate, stampX + (stampW / 2), stampY + 16, { align: 'center' });

        // First Divider line
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, 40, 195, 40);

        // Identifier header
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("CÓDIGO IDENTIFICADOR DO CONTÊINER", 105, 52, { align: 'center' });

        doc.setTextColor(textColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(32);
        doc.text(customKey.toUpperCase(), 105, 80, { align: 'center' });

        // Second Divider line
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, 91, 195, 91);

        // Sub-details left column
        const labelX = 16;
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        
        doc.text("COLETA / LINHA:", labelX, 111);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textColor);
        doc.setFontSize(12);
        doc.text("METALURGIA PESADA", labelX, 117);

        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("DATA DE REGISTRO:", labelX, 128);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textColor);
        doc.setFontSize(12);
        doc.text(new Date().toLocaleDateString('pt-BR'), labelX, 134);

        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("VOLUMES ESCANEADOS:", labelX, 145);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor);
        doc.setFontSize(12);
        doc.text("3 ITENS REGISTRADOS", labelX, 151);

        // Sub-details right column barcode or qr
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("CHAVE DIGITALIZÁVEL:", 116, 100);

        const isQR = template.useQrCode;
        if (isQR) {
          doc.addImage(imgData, 'PNG', 122, 104, 52, 52);
        } else {
          doc.addImage(imgData, 'PNG', 116, 112, 70, 36);
        }

        // Third Divider line
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, 162, 195, 162);

        // Composition Manifesto Table
        doc.setTextColor(textColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA (ITENS ESCANEADOS LOTE):", 16, 170);

        const tableY = 177;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("ITEM", 16, tableY);
        doc.text("DESCRIÇÃO DO PRODUTO / QR CODE", 26, tableY);
        doc.text("DATA E HORÁRIO DE SCANEAMENTO", 142, tableY);

        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, tableY + 2, 195, tableY + 2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textColor);

        const mockItems = [
          { name: "01. PEÇA REFORÇADA DE AÇO INOX PL88", time: new Date().toLocaleString('pt-BR') },
          { name: "02. SUPORTE ADAPTADOR METALICO AUTO9", time: new Date().toLocaleString('pt-BR') },
          { name: "03. CABO CONDUTOR TRIFÁSICO BRUT COLEX", time: new Date().toLocaleString('pt-BR') }
        ];

        let currentY = tableY + 7;
        mockItems.forEach((fit, fidx) => {
          doc.text(String(fidx + 1).padStart(2, '0'), 16, currentY);
          doc.text(fit.name, 26, currentY);
          doc.text(fit.time, 142, currentY);
          currentY += 6;
        });

        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, currentY + 1, 195, currentY + 1);

        // Divider for footer
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.4);
        doc.line(15, 266, 195, 266);

        // Footer standard notes
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(template.showFooterNotes ? template.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text("DESENVOLVIDO POR JFAB ..::SISTEMAS::..", 105, 281, { align: 'center' });

        const fileName = `PLACA_CONTEINER_${customKey.toUpperCase()}.pdf`;
        doc.save(fileName);
        showToast(`Placa Original salva com sucesso como: ${fileName}`, 'success');
      } catch (err) {
        console.error(err);
        showToast("Não foi possível gerar a placa original.", "error");
      }
    } else {
      // 2. GENERATE COMPACT ITEMS LABEL AS SELECTED FORMAT (Thermal, Badge, Compact Plate)
      const isThermal = template.aspectRatio === 'thermal';
      const isBadge = template.aspectRatio === 'badge';
      const w = isThermal ? 100 : (isBadge ? 85 : 140);
      const h = isThermal ? 150 : (isBadge ? 54 : 90);
      
      const doc = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [w, h]
      });

      const primaryColorHex = template.primaryColor;
      const borderW = template.borderWidth / 2.5; // calibrate size
      const p = template.padding / 4; // calibrate padding

      // Draw background texture
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, w, h, 'F');

      // Drawing border
      if (borderW > 0) {
        doc.setDrawColor(primaryColorHex);
        doc.setLineWidth(borderW);
        
        const r = template.borderRadius / 3;
        if (r > 0) {
          doc.roundedRect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, r, r, 'D');
        } else {
          doc.rect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, 'D');
        }
      }

      try {
        // Draw dynamic header text
        doc.setTextColor(template.textColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(template.fontSizeTitle);
        doc.text(template.title, w / 2, borderW + p + 6, { align: 'center' });

        // Draw subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(template.fontSizeDetails + 1);
        doc.setTextColor("#64748b");
        doc.text(template.subtitle, w / 2, borderW + p + 11, { align: 'center' });

        // Render Barcode / QR Code
        const codeString = customKey;
        let imgData = "";
        
        if (template.useQrCode) {
          imgData = await generateBarcodeDataURL(codeString);
          // QR Code Size
          const qrSize = (isThermal ? 50 : (isBadge ? 22 : 36)) * template.qrScale;
          const qrX = (w - qrSize) / 2;
          const qrY = isThermal ? 42 : (isBadge ? 18 : 28);
          doc.addImage(imgData, 'JPEG', qrX, qrY, qrSize, qrSize);
        } else {
          imgData = await generateBarcodeDataURL(codeString);
          const bW = (isThermal ? 70 : (isBadge ? 60 : 80)) * template.barcodeScale;
          const bH = (isThermal ? 35 : (isBadge ? 12 : 20)) * template.barcodeScale;
          const bX = (w - bW) / 2;
          const bY = isThermal ? 50 : (isBadge ? 20 : 32);
          doc.addImage(imgData, 'JPEG', bX, bY, bW, bH);
        }

        // Draw bottom metadata
        let metaY = h - borderW - p - 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(template.fontSizeDetails);
        doc.setTextColor(template.textColor);
        doc.text(`CÓDIGO: ${customKey}`, w / 2, metaY, { align: 'center' });

        if (template.showContainer) {
          metaY -= 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(template.fontSizeDetails - 1);
          doc.setTextColor("#475569");
          doc.text("COLETA: CONTAINER INDUSTRIAL", w / 2, metaY, { align: 'center' });
        }

        if (template.showCategory) {
          metaY -= 4;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(template.fontSizeDetails - 2);
          doc.text("Categoria: Metalurgia Pesada", w / 2, metaY, { align: 'center' });
        }

        // Draw top logo banner if industrial style
        if (template.showFooterNotes) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor("#94a3b8");
          doc.text(template.footerNotesText, w / 2, h - borderW - 2, { align: 'center' });
        }
        
        const fileName = `etiqueta_item_${customKey.toLowerCase()}.pdf`;
        doc.save(fileName);
        showToast(`PDF salvo como: ${fileName}`, 'success');
      } catch (err) {
        console.error(err);
        showToast("Não foi possível gerar a etiqueta do item.", 'error');
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 dark:bg-slate-950/20">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-xl border transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900/40 dark:text-emerald-200' :
          toast.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-950/80 dark:border-blue-900/40 dark:text-blue-200' :
          'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900/40 dark:text-rose-200'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${
            toast.type === 'success' ? 'bg-emerald-500' :
            toast.type === 'info' ? 'bg-blue-300' : 'bg-rose-500'
          }`} />
          <p className="text-xs font-bold leading-none">{toast.message}</p>
        </div>
      )}

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Layout size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Estúdio de Layout</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">
              Personalize a identidade visual, dimensões e posicionamento de elementos de placas de identificação e etiquetas térmicas de forma 100% visual.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Resetar
          </button>
          <button
            onClick={handleDownloadSinglePDF}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-blue-600/10 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Printer size={14} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Abas do Estúdio - Configurar Placas vs Etiquetas dos Itens vs DANFE */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('item')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'item'
              ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/40 dark:border-slate-800/20'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent'
          }`}
        >
          <Tag size={14} className="shrink-0" />
          Configurar Itens (Lote PDF)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('plate')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'plate'
              ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/40 dark:border-slate-800/20'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent'
          }`}
        >
          <Layout size={14} className="shrink-0" />
          Configurar Placa do Container
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('danfe')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'danfe'
              ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/40 dark:border-slate-800/20'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent'
          }`}
        >
          <FileText size={14} className="shrink-0" />
          Configurar DANFE (NF-e)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customizer Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Preset Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-500 shrink-0" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Modelos de Início Rápido</h3>
            </div>
            {activeSubTab === 'danfe' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'emerald', label: 'Esmeralda Moderno', color: '#10b981' },
                  { id: 'slate', label: 'Slate Profissional', color: '#475569' },
                  { id: 'navy', label: 'Azul Corporativo', color: '#1e3a8a' },
                  { id: 'classic', label: 'Classic Black', color: '#1e293b' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDanfeField('themeColor', item.color);
                      showToast(`Estilo "${item.label}" aplicado!`, 'success');
                    }}
                    className={`p-3 border text-left rounded-2xl transition-all duration-300 cursor-pointer ${
                      templateDanfe.themeColor === item.color 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-[10px] block text-slate-400 uppercase font-black tracking-widest mb-1">STYLING</span>
                    <span className="text-[11px] leading-tight block">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(DEFAULT_TEMPLATES) as Array<keyof typeof DEFAULT_TEMPLATES>).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className={`p-3 border text-left rounded-2xl transition-all duration-300 cursor-pointer ${
                      template.name === DEFAULT_TEMPLATES[key].name 
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-[10px] block text-slate-400 uppercase font-black tracking-widest mb-1">PRESET</span>
                    <span className="text-[11px] leading-tight block">{DEFAULT_TEMPLATES[key].name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Form Sections */}
          {activeSubTab === 'danfe' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-sm divide-y divide-slate-100 dark:divide-slate-805">
              {/* Secção 1: Identidade Visual & Cores (DANFE) */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-emerald-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Identidade Visual & Cores (DANFE)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Emitente</label>
                    <input 
                      type="text" 
                      value={templateDanfe.customLogoText}
                      onChange={(e) => setDanfeField('customLogoText', e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl"
                      placeholder="Ex: EMITENTE AUTOMÁTICO S.A."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cor de Destaque</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={templateDanfe.themeColor}
                        onChange={(e) => setDanfeField('themeColor', e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer overflow-hidden border border-slate-300"
                      />
                      <span className="text-xs font-mono text-slate-500">{templateDanfe.themeColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secção 2: Ativação de Módulos (DANFE) */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-blue-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Ativação de Módulos & Documentos</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={templateDanfe.showReceipt}
                      onChange={(e) => setDanfeField('showReceipt', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Exibir Canhoto</span>
                      <span className="text-[9px] text-slate-400">Recibo no topo da nota</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={templateDanfe.showWatermark}
                      onChange={(e) => setDanfeField('showWatermark', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Exibir Marca d'Água</span>
                      <span className="text-[9px] text-slate-400">Texto em marca de fundo</span>
                    </div>
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto da Marca d'Água</label>
                    <input 
                      type="text" 
                      value={templateDanfe.watermarkText}
                      onChange={(e) => setDanfeField('watermarkText', e.target.value)}
                      disabled={!templateDanfe.showWatermark}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl disabled:opacity-50"
                      placeholder="Ex: JOSÉ FELIPE A. BARROSO"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={templateDanfe.showAdditionalNotes}
                      onChange={(e) => setDanfeField('showAdditionalNotes', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Exibir Observações</span>
                      <span className="text-[9px] text-slate-400">Dados complementares e operacionais</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={templateDanfe.showSysAuthentication}
                      onChange={(e) => setDanfeField('showSysAuthentication', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Exibir Autenticação</span>
                      <span className="text-[9px] text-slate-400">Carimbo de validação digital</span>
                    </div>
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto da Autenticação</label>
                    <input 
                      type="text" 
                      value={templateDanfe.customStampText}
                      onChange={(e) => setDanfeField('customStampText', e.target.value)}
                      disabled={!templateDanfe.showSysAuthentication}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl disabled:opacity-50"
                      placeholder="Ex: STATUS: APROVADA & CONSOLIDADA"
                    />
                  </div>
                </div>
              </div>

              {/* Secção 3: Layout & Spacing (DANFE) */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-amber-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Layout & Espaçamento Geométrico</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Margens das Páginas</span>
                      <span className="font-mono text-emerald-600 font-bold">{templateDanfe.margins}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="12"
                      step="1"
                      value={templateDanfe.margins}
                      onChange={(e) => setDanfeField('margins', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Altura das Linhas de Itens</span>
                      <span className="font-mono text-emerald-600 font-bold">{templateDanfe.rowSpacing}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="8"
                      step="1"
                      value={templateDanfe.rowSpacing}
                      onChange={(e) => setDanfeField('rowSpacing', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Fonte dos Cabeçalhos</span>
                      <span className="font-mono text-emerald-600 font-bold">{templateDanfe.fontSizeHeader}pt</span>
                    </div>
                    <input 
                      type="range"
                      min="8"
                      max="12"
                      step="1"
                      value={templateDanfe.fontSizeHeader}
                      onChange={(e) => setDanfeField('fontSizeHeader', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Fonte dos Itens (Tabela)</span>
                      <span className="font-mono text-emerald-600 font-bold">{templateDanfe.fontSizeItems}pt</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="8"
                      step="1"
                      value={templateDanfe.fontSizeItems}
                      onChange={(e) => setDanfeField('fontSizeItems', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-sm divide-y divide-slate-100 dark:divide-slate-805">
              {/* Secção 1: Conteúdo de Textos */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Heading size={18} className="text-sky-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Conteúdo do Cabeçalho & Textos</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Teste</label>
                    <input 
                      type="text" 
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl"
                      placeholder="Ex: CNT-A789"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Principal</label>
                    <input 
                      type="text" 
                      value={template.title}
                      onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtítulo secundário</label>
                    <input 
                      type="text" 
                      value={template.subtitle}
                      onChange={(e) => setTemplate(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações do rodapé</label>
                    <input 
                      type="text" 
                      value={template.footerNotesText}
                      onChange={(e) => setTemplate(prev => ({ ...prev, footerNotesText: e.target.value }))}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl"
                      disabled={!template.showFooterNotes}
                    />
                  </div>
                </div>
              </div>

              {/* Secção 2: Layout de Identificadores (QR vs Barcode) */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-teal-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Identificadores Digitais (Barcode / QR)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Estilo de Código</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTemplate(prev => ({ ...prev, useQrCode: true }))}
                        className={`flex-1 p-3 border rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          template.useQrCode 
                            ? 'border-blue-600 bg-blue-50/20 text-blue-600' 
                            : 'border-slate-200 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        QR Code (Ideal para Câmeras)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplate(prev => ({ ...prev, useQrCode: false }))}
                        className={`flex-1 p-3 border rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          !template.useQrCode 
                            ? 'border-blue-600 bg-blue-50/20 text-blue-600' 
                            : 'border-slate-200 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Barcode 1D (Leitores Físicos)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tamanho / Proporção do Código</label>
                    {template.useQrCode ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Escala do QR Code</span>
                          <span className="font-mono text-blue-600 font-bold">{(template.qrScale * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0.6"
                          max="1.5"
                          step="0.05"
                          value={template.qrScale}
                          onChange={(e) => setTemplate(prev => ({ ...prev, qrScale: parseFloat(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Escala do Código de Barras</span>
                          <span className="font-mono text-blue-600 font-bold">{(template.barcodeScale * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0.7"
                          max="1.4"
                          step="0.05"
                          value={template.barcodeScale}
                          onChange={(e) => setTemplate(prev => ({ ...prev, barcodeScale: parseFloat(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Secção 3: Cores, Molduras & Temas */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-amber-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Temas & Molde de Cores</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Paleta Primária</label>
                    <div className="flex flex-wrap gap-2.5">
                      {['#1e3a8a', '#0f172a', '#0284c7', '#0d9488', '#ea580c', '#ffffff', '#dc2626', '#000000'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setTemplate(prev => ({ ...prev, primaryColor: color, borderColor: color }))}
                          className={`w-8 h-8 rounded-full border transition-all cursor-pointer flex items-center justify-center relative ${
                            template.primaryColor === color ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'hover:scale-105 border-slate-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {template.primaryColor === color && (
                            <Check size={14} className={color === '#ffffff' ? 'text-black' : 'text-white'} />
                          )}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-2">
                        <input 
                          type="color" 
                          value={template.primaryColor}
                          onChange={(e) => setTemplate(prev => ({ ...prev, primaryColor: e.target.value, borderColor: e.target.value }))}
                          className="w-8 h-8 rounded-full cursor-pointer overflow-hidden border border-slate-300"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{template.primaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Estilo da Placa</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'plate', label: 'Placa Normal' },
                        { key: 'thermal', label: 'Térmica 100x150' },
                        { key: 'badge', label: 'Crachá de ID' }
                      ].map((sz) => (
                        <button
                          key={sz.key}
                          type="button"
                          onClick={() => setTemplate(prev => ({ ...prev, aspectRatio: sz.key as any }))}
                          className={`flex-1 p-2 border rounded-xl text-center text-[11px] font-bold transition-all cursor-pointer ${
                            template.aspectRatio === sz.key 
                              ? 'border-blue-600 bg-blue-50/20 text-blue-600' 
                              : 'border-slate-200 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secção 4: Ajustes Finos de Margens & Cantos */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-purple-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Ajustes Geométricos & Moldura</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Board Border Width */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Espessura da Borda</span>
                      <span className="font-mono text-blue-600 font-bold">{template.borderWidth}px</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={template.borderWidth}
                      onChange={(e) => setTemplate(prev => ({ ...prev, borderWidth: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Border Radius */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Arredondamento dos Cantos</span>
                      <span className="font-mono text-blue-600 font-bold">{template.borderRadius}px</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="32"
                      step="2"
                      value={template.borderRadius}
                      onChange={(e) => setTemplate(prev => ({ ...prev, borderRadius: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Padding */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Preenchimento Interno (Padding)</span>
                      <span className="font-mono text-blue-600 font-bold">{template.padding}px</span>
                    </div>
                    <input 
                      type="range"
                      min="12"
                      max="40"
                      step="2"
                      value={template.padding}
                      onChange={(e) => setTemplate(prev => ({ ...prev, padding: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Text Size Title */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Tamanho do Título</span>
                      <span className="font-mono text-blue-600 font-bold">{template.fontSizeTitle}pt</span>
                    </div>
                    <input 
                      type="range"
                      min="12"
                      max="24"
                      step="1"
                      value={template.fontSizeTitle}
                      onChange={(e) => setTemplate(prev => ({ ...prev, fontSizeTitle: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Secção 5: Toggles Visuais */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-emerald-500 shrink-0" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Filtros & Visibilidade de Dados</h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={template.showCategory}
                      onChange={(e) => setTemplate(prev => ({ ...prev, showCategory: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Mostrar Categoria</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={template.showContainer}
                      onChange={(e) => setTemplate(prev => ({ ...prev, showContainer: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Mostrar Container</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={template.showTimestamp}
                      onChange={(e) => setTemplate(prev => ({ ...prev, showTimestamp: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Mostrar Data</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={template.showFooterNotes}
                      onChange={(e) => setTemplate(prev => ({ ...prev, showFooterNotes: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Observação</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Blueprint Preview Rendering */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">
          <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-cyan-400" />
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Preview Técnico do Molde (Live Blueprint)</h3>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 rounded-full font-mono text-[9px] font-bold text-cyan-400">
                {activeSubTab === 'danfe' ? 'A4 - Layout DANFE (NF-e)' : (template.aspectRatio === 'thermal' ? '100x150mm - Térmica' : (template.aspectRatio === 'badge' ? '85x54mm - Crachá' : '140x90mm - Placa'))}
              </span>
            </div>

            {/* Simulated Printed Card Template Canvas with interactive guidelines */}
            <div className="flex items-center justify-center py-8 bg-slate-950 rounded-2xl relative border border-slate-800 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
              
              {activeSubTab === 'plate' ? (
                /* FULL SIZE A4 CONTAINER PLATE (ORIGINAL STANDARDS) */
                <div 
                  className="bg-white text-slate-950 relative shadow-2xl flex flex-col justify-between transition-all duration-305 select-none overflow-hidden"
                  style={{
                    width: '345px',
                    height: '488px', // Perfect height for an A4 sheet presentation in miniature
                    borderWidth: `${Math.max(1, template.borderWidth / 3.5)}px`,
                    borderRadius: `${template.borderRadius / 3.5}px`,
                    borderColor: template.primaryColor,
                    padding: '14px',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {/* Watermarks - "JOSÉ FELIPE A. BARROSO" slanted behind the content */}
                  <div className="absolute inset-0 flex flex-col justify-around items-center pointer-events-none opacity-[0.03] overflow-hidden">
                    <div className="text-[12px] font-black tracking-widest text-slate-900 uppercase transform -rotate-25 whitespace-nowrap">
                      JOSÉ FELIPE A. BARROSO
                    </div>
                    <div className="text-[12px] font-black tracking-widest text-slate-900 uppercase transform rotate-25 whitespace-nowrap">
                      JOSÉ FELIPE A. BARROSO
                    </div>
                    <div className="text-[12px] font-black tracking-widest text-slate-900 uppercase transform -rotate-12 whitespace-nowrap">
                      JOSÉ FELIPE A. BARROSO
                    </div>
                  </div>

                  {/* Header: Left is logo & dynamic texts, Right is Stamp */}
                  <div className="flex justify-between items-start z-10 w-full">
                    <div className="max-w-[200px]">
                      <h4 className="text-[9px] font-black uppercase tracking-widest" style={{ color: template.textColor }}>
                        JFAB ..::SISTEMAS::..
                      </h4>
                      <h3 className="text-[8px] font-extrabold leading-tight mt-0.5 uppercase tracking-tight" style={{ color: template.textColor }}>
                        {template.title || "TÍTULO VAZIO"}
                      </h3>
                      <p className="text-[6.5px] text-slate-400 font-semibold truncate">
                        {template.subtitle}
                      </p>
                    </div>

                    {/* Stamp "FINALIZADO" */}
                    <div 
                      className="border-2 p-1 text-center font-bold rotate-6 shrink-0 bg-white"
                      style={{ 
                        borderColor: template.primaryColor,
                        color: template.primaryColor,
                        borderRadius: '2px'
                      }}
                    >
                      <div className="text-[7px] font-black tracking-widest leading-none">FINALIZADO</div>
                      <div className="text-[5px] font-mono leading-none mt-0.5">SISTEMA OK</div>
                      <div className="text-[4.5px] font-mono tracking-tighter leading-none mt-0.5">
                        {new Date().toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {/* First divider */}
                  <div className="h-[1px] w-full mt-1.5 z-10" style={{ backgroundColor: template.primaryColor }} />

                  {/* Main Container Identicaton text/code */}
                  <div className="text-center py-2 z-10">
                    <span className="text-[6.5px] text-slate-400 block font-bold leading-none tracking-wider font-mono">CÓDIGO IDENTIFICADOR DO CONTÊINER</span>
                    <h2 className="text-[15px] font-black tracking-widest mt-1 uppercase" style={{ color: template.textColor }}>
                      {customKey}
                    </h2>
                  </div>

                  {/* Second divider */}
                  <div className="h-[1px] w-full z-10" style={{ backgroundColor: template.primaryColor }} />

                  {/* Left sub-details, right Barcode / QR Code */}
                  <div className="grid grid-cols-12 gap-2 mt-1.5 items-center z-10">
                    <div className="col-span-7 space-y-1">
                      <div>
                        <span className="text-[5.5px] text-slate-400 block leading-none font-bold">COLETA / LINHA:</span>
                        <span className="text-[8.5px] font-extrabold text-slate-800 leading-none uppercase" style={{ color: template.textColor }}>
                          METALURGIA PESADA
                        </span>
                      </div>
                      <div>
                        <span className="text-[5.5px] text-slate-400 block leading-none font-bold">DATA DE REGISTRO:</span>
                        <span className="text-[8.5px] font-extrabold text-slate-800 leading-none">
                          {new Date().toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[5.5px] text-slate-400 block leading-none font-bold">VOLUMES ESCANEADOS:</span>
                        <span className="text-[8px] font-black" style={{ color: template.primaryColor }}>
                          3 ITENS REGISTRADOS
                        </span>
                      </div>
                    </div>

                    <div className="col-span-5 flex justify-end shrink-0">
                      {template.useQrCode ? (
                        <div 
                          className="p-1 bg-white border border-slate-100 rounded shadow-sm"
                          style={{ transform: `scale(${template.qrScale})`, transformOrigin: 'right center' }}
                        >
                          <QRCodeSVG 
                            value={customKey}
                            size={40}
                            level="M"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-full flex items-center justify-end p-0.5 bg-white overflow-hidden"
                          style={{ transform: `scale(${template.barcodeScale})`, transformOrigin: 'right center' }}
                        >
                          <Barcode 
                            value={customKey}
                            width={0.7}
                            height={20}
                            displayValue={false}
                            background="transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Third divider */}
                  <div className="h-[1px] w-full mt-1.5 z-10" style={{ backgroundColor: template.primaryColor }} />

                  {/* Manifesto de Carga */}
                  <div className="flex-1 mt-1.5 z-10 text-[6px] flex flex-col justify-start">
                    <div className="font-bold text-slate-700 leading-none flex gap-1 uppercase mb-1" style={{ color: template.textColor }}>
                      <span>Manifesto de Carga</span>
                      <span className="text-slate-400">• Itens do Lote</span>
                    </div>
                    {/* Tiny styled table matching original print summary */}
                    <div className="border rounded overflow-hidden" style={{ borderColor: template.primaryColor }}>
                      <div className="bg-slate-50 p-1 flex justify-between font-black border-b" style={{ borderColor: template.primaryColor, color: template.textColor }}>
                        <span>PRODUTO / QR CODE</span>
                        <span>QTD</span>
                      </div>
                      <div className="p-1 space-y-1 bg-white">
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-0.5 text-slate-600">
                          <span className="truncate max-w-[200px]">01. PEÇA REFORÇADA DE AÇO INOX PL88</span>
                          <span className="font-bold">1</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-0.5 text-slate-600">
                          <span className="truncate max-w-[200px]">02. SUPORTE ADAPTADOR METALICO AUTO9</span>
                          <span className="font-bold">1</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="truncate max-w-[200px]">03. CABO CONDUTOR TRIFÁSICO BRUT COLEX</span>
                          <span className="font-bold">1</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom divider */}
                  <div className="h-[1px] w-full mt-1.5 z-10" style={{ backgroundColor: template.primaryColor }} />

                  {/* Footer */}
                  <div className="text-center mt-1 z-10 space-y-0.5">
                    {template.showFooterNotes ? (
                      <p className="text-[5.5px] text-slate-400 font-bold tracking-tight">
                        {template.footerNotesText}
                      </p>
                    ) : (
                      <div className="h-[6.5px]" />
                    )}
                    <p className="text-[4px] text-slate-300 font-extrabold uppercase">
                      QR Manager Cloud • Solução desenvolvida por JFAB Sistemas
                    </p>
                  </div>
                </div>
              ) : activeSubTab === 'danfe' ? (
                /* SIMULATED DANFE PDF MINIATURE (A4 PROPORTIONS) */
                <div 
                  className="bg-white text-slate-950 relative shadow-2xl flex flex-col justify-between transition-all duration-305 select-none overflow-hidden"
                  style={{
                    width: '345px',
                    height: '488px',
                    padding: `${templateDanfe.margins * 1.2}px`,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {/* Watermarks */}
                  {templateDanfe.showWatermark && (
                    <div className="absolute inset-0 flex flex-col justify-around items-center pointer-events-none opacity-[0.04] overflow-hidden">
                      <div className="text-[12px] font-black tracking-widest text-slate-900 uppercase transform -rotate-25 whitespace-nowrap">
                        {templateDanfe.watermarkText || "JOSÉ FELIPE A. BARROSO"}
                      </div>
                      <div className="text-[12px] font-black tracking-widest text-slate-900 uppercase transform -rotate-25 whitespace-nowrap">
                        {templateDanfe.watermarkText || "JOSÉ FELIPE A. BARROSO"}
                      </div>
                    </div>
                  )}

                  {/* Canhoto / Receipt Section */}
                  {templateDanfe.showReceipt && (
                    <div className="border border-dashed p-1 mb-1 text-[5px] space-y-0.5" style={{ borderColor: templateDanfe.themeColor }}>
                      <div className="flex justify-between font-bold" style={{ color: templateDanfe.themeColor }}>
                        <span>RECEBEMOS OS PRODUTOS DA NOTA FISCAL INDICADA ABAIXO</span>
                        <span>NF-e Nº 000.000.123</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-slate-500">
                        <div className="border-t pt-0.5">DATA DE RECEBIMENTO</div>
                        <div className="border-t pt-0.5 col-span-2">ASSINATURA DO RECEBEDOR</div>
                      </div>
                    </div>
                  )}

                  {/* Main Header of DANFE */}
                  <div className="grid grid-cols-12 gap-1 border p-1 text-[5px]" style={{ borderColor: templateDanfe.themeColor }}>
                    <div className="col-span-5 border-r pr-1 flex flex-col justify-center" style={{ borderColor: templateDanfe.themeColor }}>
                      <span className="font-mono text-[4px] text-slate-400 block uppercase">EMISSOR DIGITAL</span>
                      <h3 className="font-black leading-tight uppercase truncate" style={{ color: templateDanfe.themeColor, fontSize: `${templateDanfe.fontSizeHeader - 2}px` }}>
                        {templateDanfe.customLogoText || "EMITENTE AUTOMÁTICO S.A."}
                      </h3>
                      <span className="text-[4px] text-slate-400 truncate">AV. BRASIL, 1500 - DISTRITO INDUSTRIAL</span>
                    </div>

                    <div className="col-span-3 border-r px-1 text-center flex flex-col justify-center" style={{ borderColor: templateDanfe.themeColor }}>
                      <span className="font-bold block">DANFE</span>
                      <span className="text-[3.5px] text-slate-500 block leading-none">DOC. AUXILIAR DE NF-e</span>
                      <div className="mt-0.5 font-bold">Nº 000.000.123<br />SÉRIE 001</div>
                    </div>

                    <div className="col-span-4 pl-1 flex flex-col justify-center items-center">
                      <div className="w-full h-3 bg-slate-200 rounded flex items-center justify-center font-mono text-[4px] text-slate-500">
                        [ BARCODE ]
                      </div>
                      <div className="text-[3.5px] mt-0.5 text-slate-500 truncate w-full text-center">
                        KEY: 3526 0612 3456 7890 0112 5500 1000 0001
                      </div>
                    </div>
                  </div>

                  {/* Destinatário Section */}
                  <div className="mt-1 text-[5px]">
                    <div className="bg-slate-100 p-0.5 font-bold uppercase tracking-wide border-x border-t" style={{ borderColor: templateDanfe.themeColor, color: templateDanfe.themeColor }}>
                      DESTINATÁRIO / REMETENTE
                    </div>
                    <div className="border p-1 grid grid-cols-4 gap-1" style={{ borderColor: templateDanfe.themeColor }}>
                      <div className="col-span-2">
                        <span className="text-slate-400 block font-normal">NOME / RAZÃO SOCIAL</span>
                        <span className="font-bold truncate block">CLIENTE OPERACIONAL DE LOGÍSTICA S.A.</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">CNPJ / CPF</span>
                        <span className="font-bold">12.345.678/0001-90</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">EMISSÃO</span>
                        <span className="font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cálculo Imposto Section */}
                  <div className="mt-1 text-[5px]">
                    <div className="bg-slate-100 p-0.5 font-bold uppercase tracking-wide border-x border-t" style={{ borderColor: templateDanfe.themeColor, color: templateDanfe.themeColor }}>
                      CÁLCULO DO IMPOSTO
                    </div>
                    <div className="border p-1 grid grid-cols-4 gap-1 text-center" style={{ borderColor: templateDanfe.themeColor }}>
                      <div>
                        <span className="text-slate-400 block font-normal">BASE CÁLC. ICMS</span>
                        <span className="font-bold">R$ 0,00</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">VALOR DO ICMS</span>
                        <span className="font-bold">R$ 0,00</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">V. TOTAL PRODUTOS</span>
                        <span className="font-bold text-emerald-600">R$ 1.250,00</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">V. TOTAL DA NOTA</span>
                        <span className="font-bold text-emerald-600">R$ 1.250,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Produtos Table */}
                  <div className="mt-1 flex-1 flex flex-col justify-start text-[5px]">
                    <div className="bg-slate-100 p-0.5 font-bold uppercase tracking-wide border-x border-t" style={{ borderColor: templateDanfe.themeColor, color: templateDanfe.themeColor }}>
                      PRODUTOS E SERVIÇOS
                    </div>
                    <div className="border rounded-b overflow-hidden flex-1 flex flex-col" style={{ borderColor: templateDanfe.themeColor }}>
                      <div className="bg-slate-50 p-1 flex justify-between font-black border-b" style={{ borderColor: templateDanfe.themeColor, fontSize: `${templateDanfe.fontSizeItems}px` }}>
                        <span>CÓDIGO / DESCRIÇÃO DO PRODUTO</span>
                        <div className="flex gap-4">
                          <span>QTD</span>
                          <span>UN</span>
                          <span>VALOR</span>
                        </div>
                      </div>
                      <div className="p-1 bg-white flex-1 flex flex-col justify-around">
                        {[
                          { code: '001', name: 'PEÇA REFORÇADA DE AÇO INOX PL88', qty: 1, un: 'UN', val: 'R$ 450,00' },
                          { code: '002', name: 'SUPORTE ADAPTADOR METALICO AUTO9', qty: 2, un: 'UN', val: 'R$ 350,00' },
                          { code: '003', name: 'CABO CONDUTOR TRIFÁSICO BRUT COLEX', qty: 1, un: 'MT', val: 'R$ 100,00' }
                        ].map((p, idx) => (
                          <div 
                            key={idx} 
                            className="flex justify-between border-b border-dashed border-slate-100 pb-0.5 text-slate-600"
                            style={{ 
                              paddingTop: `${templateDanfe.rowSpacing - 5}px`, 
                              paddingBottom: `${templateDanfe.rowSpacing - 5}px`,
                              fontSize: `${templateDanfe.fontSizeItems}px`
                            }}
                          >
                            <span className="truncate max-w-[140px]">{p.code} - {p.name}</span>
                            <div className="flex gap-4 font-bold">
                              <span>{p.qty}</span>
                              <span>{p.un}</span>
                              <span>{p.val}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dados Adicionais & Autenticação Stamp Section */}
                  {(templateDanfe.showAdditionalNotes || templateDanfe.showSysAuthentication) && (
                    <div className="grid grid-cols-12 gap-1 mt-1 pt-1.5 border-t" style={{ borderColor: templateDanfe.themeColor }}>
                      <div className="col-span-7 text-[4px] text-slate-500 leading-tight">
                        {templateDanfe.showAdditionalNotes && (
                          <>
                            <span className="font-bold block uppercase" style={{ color: templateDanfe.themeColor }}>DADOS ADICIONAIS</span>
                            <p className="truncate">Série de Coleta Integrada. Resp. José Felipe.</p>
                            <p className="truncate">Chancelado por QR Manager Cloud.</p>
                          </>
                        )}
                      </div>

                      <div className="col-span-5">
                        {templateDanfe.showSysAuthentication && (
                          <div className="border p-0.5 text-center rounded relative overflow-hidden bg-slate-50/50 flex flex-col justify-center" style={{ borderColor: templateDanfe.themeColor }}>
                            <span className="font-black text-[3.5px] leading-tight text-emerald-600 block truncate max-w-full">
                              {templateDanfe.customStampText || "STATUS: APROVADA & CONSOLIDADA"}
                            </span>
                            <span className="text-[3px] text-slate-400 block font-mono leading-none">AUTENTICADO JFAB CLOUD</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Actual customizable layout container for standard labels */
                <div 
                  className="bg-white text-slate-950 relative shadow-2xl flex flex-col justify-between transition-all duration-300"
                  style={{
                    width: template.aspectRatio === 'thermal' ? '220px' : (template.aspectRatio === 'badge' ? '280px' : '320px'),
                    height: template.aspectRatio === 'thermal' ? '330px' : (template.aspectRatio === 'badge' ? '178px' : '205px'),
                    borderWidth: `${template.borderWidth}px`,
                    borderRadius: `${template.borderRadius}px`,
                    borderColor: template.primaryColor,
                    padding: `${template.padding}px`,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {/* Graphical Layout Watermark/Guides */}
                  <div className="absolute top-1 left-2 font-mono text-[8px] text-slate-400/45 dark:text-slate-500/35 pointer-events-none uppercase">
                    Estúdio Digital jfab
                  </div>

                  {/* Real-time Dynamic Header */}
                  <div className="text-center">
                    <h3 
                      className="font-bold tracking-tight uppercase"
                      style={{ fontSize: `${template.fontSizeTitle - 1}px`, color: template.textColor }}
                    >
                      {template.title || "TÍTULO VAZIO"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                      {template.subtitle}
                    </p>
                  </div>

                  {/* Digital Identifier Code */}
                  <div className="flex-1 flex flex-col items-center justify-center transition-all">
                    {template.useQrCode ? (
                      <div 
                        className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm"
                        style={{ transform: `scale(${template.qrScale})` }}
                      >
                        <QRCodeSVG 
                          value={customKey}
                          size={template.aspectRatio === 'badge' ? 52 : (template.aspectRatio === 'thermal' ? 95 : 75)}
                          level="M"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full flex items-center justify-center p-1 bg-white select-none overflow-hidden"
                        style={{ transform: `scale(${template.barcodeScale})` }}
                      >
                        <Barcode 
                          value={customKey}
                          width={template.aspectRatio === 'badge' ? 1.4 : 1.75}
                          height={template.aspectRatio === 'badge' ? 24 : 45}
                          displayValue={false}
                          background="transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dynamic details footer notes inside container preview */}
                  <div className="text-center space-y-1.5">
                    <p className="text-xs font-mono font-black" style={{ color: template.textColor }}>
                      ID: {customKey}
                    </p>
                    
                    {(template.showCategory || template.showContainer || template.showTimestamp) && (
                      <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-0.5 justify-center items-center">
                        {template.showContainer && (
                          <span className="text-[9px] font-bold text-slate-600 block uppercase">
                            Coleta: CONT-A
                          </span>
                        )}
                        {template.showCategory && (
                          <span className="text-[8px] font-bold bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full inline-block">
                            Metalurgia Pesada
                          </span>
                        )}
                        {template.showTimestamp && (
                          <span className="text-[8px] text-slate-400 block font-mono">
                            Lote: {new Date().toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {template.showFooterNotes && (
                      <p className="text-[7px] text-slate-400 font-bold tracking-wider pt-1">
                        {template.footerNotesText}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Graphical Blueprint overlays displaying sizes inside preview column */}
              {activeSubTab === 'danfe' ? (
                <>
                  <div className="absolute bottom-2 left-3 font-mono text-[9px] text-slate-500">
                    Margem: <span className="text-emerald-400">{templateDanfe.margins}mm</span>
                  </div>
                  <div className="absolute bottom-2 right-3 font-mono text-[9px] text-slate-500">
                    Linha: <span className="text-emerald-400">{templateDanfe.rowSpacing}mm</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute bottom-2 left-3 font-mono text-[9px] text-slate-500">
                    Canto: <span className="text-cyan-400">{template.borderRadius}mm</span>
                  </div>
                  <div className="absolute bottom-2 right-3 font-mono text-[9px] text-slate-500">
                    Borda: <span className="text-cyan-400">{template.borderWidth}px</span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Instruções de Produção</span>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {activeSubTab === 'danfe' ? (
                  <span>Ao selecionar <b>"Exportar PDF"</b>, um arquivo no formato de Nota Fiscal Eletrônica (A4) com margens e tamanhos de tabela customizados pelo painel lateral será gerado via motor jsPDF.</span>
                ) : (
                  <span>Ao selecionar <b>"Exportar PDF"</b>, um arquivo de dimensões calibradas especificamente para o formato escolhido (Placa de 140x90mm, etiqueta térmica de 100x150mm ou crachá compacto de 85x54mm) será gerado a partir do motor integrado canvas jsPDF.</span>
                )}
              </p>
            </div>
            
            <button
              onClick={handleDownloadSinglePDF}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95 duration-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={14} />
              {activeSubTab === 'danfe' ? 'Imprimir DANFE de Teste' : `Imprimir Placa de Teste (${customKey})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
