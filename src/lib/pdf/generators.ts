
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { generateBarcodeDataURL, generateQRCodeDataURL } from '../barcodeUtils';
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
  addCustomAuditLog: (action: string, details: string) => Promise<boolean>;
  storage: any;
  currentUser: any;

}

export const generateDanfe = async (ctx: PDFContext, targetItems?: QRItem[]) => {
  const { items, selectedContainer, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;
    
    const nfeItems = targetItems || items.filter(i => i.nfeData);
    if (nfeItems.length === 0) {
      addNotification('error', 'Sem Dados de NF-e', 'Nenhuma Nota Fiscal Eletrônica com dados recuperados foi encontrada para gerar o DANFE.');
      return;
    }

    addNotification('info', 'Gerando DANFE(s)', `Preparando layout de Nota Fiscal para ${nfeItems.length} documento(s)...`);

    // Load custom template danfe
    let dTemplate = {
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
      margins: 8,
      allowMultiPage: true
    };
    try {
      const saved = localStorage.getItem('jfab_custom_template_danfe');
      if (saved) {
        const parsed = JSON.parse(saved);
        dTemplate = { ...dTemplate, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load custom template danfe", e);
    }

    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
      const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
      const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
      return { r, g, b };
    };
    const themeRgb = hexToRgb(dTemplate.themeColor);

    const m = dTemplate.margins;
    const delta = m - 8;

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const parseNfeKey = (key: string) => {
        if (key && key.length === 44) {
          const series = parseInt(key.substring(22, 25), 10) || 1;
          const number = parseInt(key.substring(25, 34), 10) || 123456;
          const cnpj = key.substring(6, 20).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
          return { series, number, cnpj };
        }
        return { series: 1, number: 123456, cnpj: "12.345.678/0001-90" };
      };

      for (let i = 0; i < nfeItems.length; i++) {
        if (i > 0) {
          doc.addPage();
        }
        
        const item = nfeItems[i];
        const nfe = item.nfeData || {};
        const key = item.t;
        const { series, number, cnpj: emitCnpj } = parseNfeKey(key);
        
        const formattedKey = key.replace(/(.{4})/g, '$1 ').trim();
        
        const emitName = nfe.emitente?.nome || nfe.emitente?.xNome || nfe.infNFe?.emit?.xNome || "";
        const emitCnpjReal = nfe.emitente?.cnpj || nfe.emitente?.CNPJ || emitCnpj;
        const emitIeReal = nfe.emitente?.ie || nfe.emitente?.IE || "";
        
        let emitAddress = "";
        let emitCityState = "";
        if (nfe.emitente?.logradouro) {
          const lgr = nfe.emitente.logradouro;
          const nro = nfe.emitente.numero || "S/N";
          const bairro = nfe.emitente.bairro || "";
          emitAddress = `${lgr}, ${nro}${bairro ? ` - ${bairro}` : ""}`;
          
          const mun = nfe.emitente.municipio || "";
          const uf = nfe.emitente.uf || "";
          const cep = nfe.emitente.cep ? `CEP: ${nfe.emitente.cep}` : "";
          emitCityState = `${mun} - ${uf}${cep ? ` • ${cep}` : ""}`;
        }

        const hasRealEmit = !!(nfe.emitente?.nome || nfe.emitente?.xNome || nfe.infNFe?.emit?.xNome);
        const finalEmitName = hasRealEmit ? emitName : "";

        const destName = nfe.destinatario?.nome || nfe.destinatario?.xNome || nfe.infNFe?.dest?.xNome || "";
        const destCnpjReal = nfe.destinatario?.cnpj || nfe.destinatario?.CNPJ || "";
        const transpName = nfe.transportadora?.nome || nfe.infNFe?.transp?.transporta?.xNome || "";
        const vols = nfe.volumes || "";
        const pesoB = nfe.pesoB || "";
        const formattedWeight = pesoB 
          ? `${parseFloat(pesoB).toFixed(3)}` 
          : ``;
        
        const prods = nfe.produtos || [];

        // Calculate prices
        let totalProdValue = 0;
        const detailedProds = prods.map((p: any, idx: number) => {
          const qty = parseFloat(p.qtd) || 0;
          const code = p.code || "";
          const name = p.nome || "";
          const unit = p.unit || "";
          
          let unitPrice = parseFloat(p.unitPrice);
          let totalVal = parseFloat(p.totalVal);
          
          if (isNaN(unitPrice)) unitPrice = 0;
          if (isNaN(totalVal)) totalVal = unitPrice * qty;
          
          totalProdValue += totalVal;
          return {
            code,
            name,
            qty,
            unit,
            unitPrice,
            totalVal
          };
        });

        const realTotalNF = nfe.total?.vNF ? parseFloat(nfe.total.vNF) : null;
        const formattedTotalProd = realTotalNF 
          ? realTotalNF.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : totalProdValue > 0 ? totalProdValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";

        let infCplText = nfe.infCpl || "";
        const infCplLines: string[] = [];
        if (infCplText) {
          const cleanedText = infCplText.replace(/[\r\n]+/g, " ");
          for (let idx = 0; idx < cleanedText.length; idx += 90) {
            infCplLines.push(cleanedText.substring(idx, idx + 90));
          }
        }

        const showBottomSection = dTemplate.showAdditionalNotes || dTemplate.showSysAuthentication;
        const bottomSectionHeight = showBottomSection ? 42 : 0;
        
        // Calculate pagination parameters
        const rowSpacingVal = dTemplate.rowSpacing;
        const receiptHeight = dTemplate.showReceipt ? 20 : 0;
        const headerHeight = 40; // 32 main box + 6 ie/cnpj row + 2 spacing
        const destHeight = 24; // 4 title bar + 18 box + 2 spacing
        const faturaHeight = 10; // 4 title bar + 4 box + 2 spacing
        const impostoHeight = 18; // 4 title bar + 12 box + 2 spacing
        const transpHeight = 24; // 4 title bar + 18 box + 2 spacing
        const tableTitleAndHeaderHeight = 10; // 4 bar + 6 header
        const p1StartY = m + receiptHeight + headerHeight + destHeight + faturaHeight + impostoHeight + transpHeight + tableTitleAndHeaderHeight;
        const p1MaxRowY = 297 - m - 2; // Maximum row Y on page 1 (without bottom section)
        const p1MaxRowYIfLast = 297 - m - bottomSectionHeight - 2; // Maximum row Y on page 1 if it is the only/last page
        
        const p1MaxRowsIfLast = Math.floor((p1MaxRowYIfLast - p1StartY) / rowSpacingVal);
        const p1MaxRowsIfMulti = Math.floor((p1MaxRowY - p1StartY) / rowSpacingVal);
        
        let totalPages = 1;
        let p1RowsToDraw = p1MaxRowsIfLast;
        let isMultiPage = false;
        
        if (detailedProds.length > p1MaxRowsIfLast && (dTemplate.allowMultiPage !== false)) {
          isMultiPage = true;
          p1RowsToDraw = p1MaxRowsIfMulti;
          
          let remainingCount = detailedProds.length - p1MaxRowsIfMulti;
          const subPageStartY = m + 22; // simplified products start Y on subsequent pages
          const subPageMaxRowY = 297 - m - 2; // without bottom section
          const subPageMaxRowYIfLast = 297 - m - bottomSectionHeight - 2; // with bottom section
          
          const subPageMaxRowsIfLast = Math.floor((subPageMaxRowYIfLast - (subPageStartY + 10)) / rowSpacingVal);
          const subPageMaxRowsIfMulti = Math.floor((subPageMaxRowY - (subPageStartY + 10)) / rowSpacingVal);
          
          while (remainingCount > 0) {
            totalPages++;
            if (remainingCount <= subPageMaxRowsIfLast) {
              break;
            } else {
              remainingCount -= subPageMaxRowsIfMulti;
            }
          }
        }
        
        // Watermark if enabled (drawn first so background)
        if (dTemplate.showWatermark) {
          doc.setTextColor(242, 242, 242);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 100, { angle: 335 });
          doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 180, { angle: 335 });
        }

        // Draw general border / frame using custom theme color
        doc.setDrawColor(themeRgb.r, themeRgb.g, themeRgb.b);
        doc.setLineWidth(0.3);
        doc.rect(m, m, 210 - 2 * m, 297 - 2 * m);

        let currentY = m;

        // Canhoto (Receipt)
        if (dTemplate.showReceipt) {
          doc.rect(m, currentY, 210 - 2 * m, 18);
          // Vertical divider
          doc.line(160 + delta, currentY, 160 + delta, currentY + 18);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(80, 80, 80);
          doc.text("RECEBEMOS DE " + String(finalEmitName).toUpperCase().substring(0, 50) + " OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO", m + 2, currentY + 3.5);
          
          // Row inside left column for date/signature
          doc.line(m, currentY + 9, 160 + delta, currentY + 9);
          // Vertical divider for date and signature
          doc.line(40 + delta, currentY + 9, 40 + delta, currentY + 18);
          
          doc.text("DATA DE RECEBIMENTO", m + 2, currentY + 12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(0);
          doc.text(format(new Date(item.ts), 'dd/MM/yyyy'), m + 2, currentY + 16.5);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(80, 80, 80);
          doc.text("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", 42 + delta, currentY + 12);
          
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text("NF-e", 181 + delta, currentY + 5, { align: 'center' });
          doc.setFontSize(7.5);
          doc.text(`Nº ${String(number).padStart(9, '0')}`, 181 + delta, currentY + 10, { align: 'center' });
          doc.text(`SÉRIE ${series}`, 181 + delta, currentY + 15, { align: 'center' });

          currentY += 18 + 2;
        }

        // --- PORTAL FISCAL OFFICIAL HEADER BLOCK ---
        // Unified Header box of height 32
        doc.rect(m, currentY, 210 - 2 * m, 32);
        
        // Vertical dividers:
        // Divider 1: Emitente section ends at W * 0.40
        const div1X = m + (210 - 2 * m) * 0.40;
        doc.line(div1X, currentY, div1X, currentY + 32);
        
        // Divider 2: DANFE section ends at W * 0.58
        const div2X = m + (210 - 2 * m) * 0.58;
        doc.line(div2X, currentY, div2X, currentY + 32);

        // 1. Emitente Details (Left Column)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(dTemplate.fontSizeHeader);
        doc.setTextColor(0);
        doc.text(String(finalEmitName).toUpperCase().substring(0, 36), m + 3, currentY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(60, 60, 60);
        doc.text(emitAddress.toUpperCase().substring(0, 52), m + 3, currentY + 11.5);
        doc.text(emitCityState.toUpperCase(), m + 3, currentY + 16);
        const fone = nfe.emitente?.fone || nfe.emitente?.telefone || "";
        const email = nfe.emitente?.email || "";
        const contactText = [fone ? `FONE: ${fone}` : "", email ? `EMAIL: ${email}` : ""].filter(Boolean).join("  |  ");
        if (contactText) doc.text(contactText, m + 3, currentY + 20.5);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text("IDENTIFICAÇÃO DO EMITENTE", m + 3, currentY + 29);

        // 2. DANFE & Folha Block (Middle Column)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DANFE", (div1X + div2X) / 2, currentY + 6.5, { align: 'center' });
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text("DOCUMENTO AUXILIAR DA\nNOTA FISCAL ELETRÔNICA", (div1X + div2X) / 2, currentY + 10.5, { align: 'center' });
        
        // Entrada / Saída indicators:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.text("0 - ENTRADA\n1 - SAÍDA", (div1X + div2X) / 2 - 8, currentY + 18);
        
        // Draw tiny indicator box
        doc.rect((div1X + div2X) / 2 + 5, currentY + 15, 4, 4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.text("1", (div1X + div2X) / 2 + 7, currentY + 18, { align: 'center' });
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(`Nº ${String(number).padStart(9, '0')}`, (div1X + div2X) / 2, currentY + 23.5, { align: 'center' });
        doc.text(`SÉRIE ${series}`, (div1X + div2X) / 2, currentY + 27, { align: 'center' });
        doc.setFontSize(6);
        doc.text(`FOLHA 01/${String(totalPages).padStart(2, '0')}`, (div1X + div2X) / 2, currentY + 30.5, { align: 'center' });

        // 3. Barcode & Chave de Acesso (Right Column)
        try {
          const dataUrl = await generateBarcodeDataURL(key);
          doc.addImage(dataUrl, 'PNG', div2X + 3, currentY + 2.5, (210 - m - div2X) - 6, 9.5);
        } catch (err) {
          console.error("Error generating DANFE barcode", err);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(80, 80, 80);
        doc.text("CHAVE DE ACESSO", div2X + 3, currentY + 14.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedKey, div2X + 3, currentY + 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("Consulta de autenticidade no portal nacional da NF-e", div2X + 3, currentY + 21);
        doc.text("www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora", div2X + 3, currentY + 23.5);
        
        // Protocolo de Autorização Divider inside Right Column:
        doc.line(div2X, currentY + 25, 210 - m, currentY + 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.text("PROTOCOLO DE AUTORIZAÇÃO DE USO", div2X + 3, currentY + 27.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        const nProt = nfe.protocolo || nfe.protNFe?.infProt?.nProt || nfe.infNFe?.ide?.nNF || "";
        const dhRecbto = nfe.dhRecbto || nfe.protNFe?.infProt?.dhRecbto;
        const protocolDate = dhRecbto ? format(new Date(dhRecbto), 'dd/MM/yyyy HH:mm:ss') : "";
        const protocolText = nProt ? `${nProt} - ${protocolDate}` : "";
        doc.text(protocolText, div2X + 3, currentY + 30.5);

        // --- INSCRICÕES ROW ---
        doc.rect(m, currentY + 32, 210 - 2 * m, 6);
        const ieDiv1 = m + (210 - 2 * m) * 0.35;
        const ieDiv2 = m + (210 - 2 * m) * 0.65;
        doc.line(ieDiv1, currentY + 32, ieDiv1, currentY + 38);
        doc.line(ieDiv2, currentY + 32, ieDiv2, currentY + 38);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", m + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(emitIeReal, m + 2, currentY + 37);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO", ieDiv1 + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("-", ieDiv1 + 2, currentY + 37);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ", ieDiv2 + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(emitCnpjReal, ieDiv2 + 2, currentY + 37);

        currentY += 38 + 2;

        // --- DESTINATÁRIO / REMETENTE BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("DESTINATÁRIO / REMETENTE", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 18);
        // Horizontal lines:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        doc.line(m, currentY + 16, 210 - m, currentY + 16);
        
        // Vertical dividers:
        const destW = 210 - 2 * m;
        const r1Div1 = m + destW * 0.62;
        const r1Div2 = m + destW * 0.82;
        doc.line(r1Div1, currentY + 4, r1Div1, currentY + 10);
        doc.line(r1Div2, currentY + 4, r1Div2, currentY + 10);

        const r2Div1 = m + destW * 0.48;
        const r2Div2 = m + destW * 0.68;
        const r2Div3 = m + destW * 0.82;
        doc.line(r2Div1, currentY + 10, r2Div1, currentY + 16);
        doc.line(r2Div2, currentY + 10, r2Div2, currentY + 16);
        doc.line(r2Div3, currentY + 10, r2Div3, currentY + 16);

        const r3Div1 = m + destW * 0.42;
        const r3Div2 = m + destW * 0.54;
        const r3Div3 = m + destW * 0.58;
        const r3Div4 = m + destW * 0.78;
        const r3Div5 = m + destW * 0.88;
        doc.line(r3Div1, currentY + 16, r3Div1, currentY + 22);
        doc.line(r3Div2, currentY + 16, r3Div2, currentY + 22);
        doc.line(r3Div3, currentY + 16, r3Div3, currentY + 22);
        doc.line(r3Div4, currentY + 16, r3Div4, currentY + 22);
        doc.line(r3Div5, currentY + 16, r3Div5, currentY + 22);

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("NOME / RAZÃO SOCIAL", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(destName).toUpperCase().substring(0, 60), m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ / CPF", r1Div1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(destCnpjReal, r1Div1 + 2, currentY + 9);

        const dataEmissao = nfe.dhEmi || nfe.infNFe?.ide?.dhEmi ? format(new Date(nfe.dhEmi || nfe.infNFe?.ide?.dhEmi), 'dd/MM/yyyy') : "";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DATA DA EMISSÃO", r1Div2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(dataEmissao, r1Div2 + 2, currentY + 9);

        // Row 2 Populate:
        const r2Address = nfe.destinatario?.logradouro 
          ? `${nfe.destinatario.logradouro}, ${nfe.destinatario.numero || "S/N"}` 
          : "";
        const r2Bairro = nfe.destinatario?.bairro || "";
        const r2Cep = nfe.destinatario?.cep || "";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ENDEREÇO", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r2Address).toUpperCase().substring(0, 50), m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BAIRRO / DISTRITO", r2Div1 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r2Bairro).toUpperCase().substring(0, 24), r2Div1 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CEP", r2Div2 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r2Cep, r2Div2 + 2, currentY + 15);

        const dataSaida = nfe.dhSaiEnt || nfe.infNFe?.ide?.dhSaiEnt ? format(new Date(nfe.dhSaiEnt || nfe.infNFe?.ide?.dhSaiEnt), 'dd/MM/yyyy') : "";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DATA SAÍDA / ENTRADA", r2Div3 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(dataSaida, r2Div3 + 2, currentY + 15);

        // Row 3 Populate:
        const r3Mun = nfe.destinatario?.municipio || "";
        const r3Fone = nfe.destinatario?.fone || nfe.destinatario?.telefone || "";
        const r3Uf = nfe.destinatario?.uf || "";
        const r3Ie = nfe.destinatario?.ie || "";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MUNICÍPIO", m + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r3Mun).toUpperCase().substring(0, 40), m + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("FONE / FAX", r3Div1 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Fone, r3Div1 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", r3Div2 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Uf, r3Div2 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", r3Div3 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Ie, r3Div3 + 2, currentY + 21);

        const horaSaida = nfe.dhSaiEnt || nfe.infNFe?.ide?.dhSaiEnt ? format(new Date(nfe.dhSaiEnt || nfe.infNFe?.ide?.dhSaiEnt), 'HH:mm:ss') : "";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("HORA DA SAÍDA", r3Div4 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(horaSaida, r3Div4 + 2, currentY + 21);

        currentY += 22 + 2;

        // --- FATURA / DUPLICATAS BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("FATURA / DUPLICATAS", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        
        let duplicataInfo = "DÉBITO DIRETO AUTORIZADO";
        if (nfe.cobr && nfe.cobr.dup) {
          const dup = Array.isArray(nfe.cobr.dup) ? nfe.cobr.dup[0] : nfe.cobr.dup;
          if (dup) {
            const vDup = dup.vDup ? parseFloat(dup.vDup).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : formattedTotalProd;
            const dVenc = dup.dVenc ? format(new Date(dup.dVenc + "T00:00:00"), 'dd/MM/yyyy') : "";
            const nDup = dup.nDup || "001";
            duplicataInfo = `DUPLICATA Nº ${nDup}  |  VENCIMENTO: ${dVenc}  |  VALOR LÍQUIDO: ${vDup}`;
          }
        }
        
        doc.text(duplicataInfo, m + 2, currentY + 7);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);

        currentY += 8 + 2;

        // --- CÁLCULO DO IMPOSTO BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("CÁLCULO DO IMPOSTO", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 12);
        // Horizontal line:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        
        // Row 1 Dividers:
        const impW = 210 - 2 * m;
        const impDiv1 = m + impW * 0.18;
        const impDiv2 = m + impW * 0.36;
        const impDiv3 = m + impW * 0.54;
        const impDiv4 = m + impW * 0.72;
        doc.line(impDiv1, currentY + 4, impDiv1, currentY + 10);
        doc.line(impDiv2, currentY + 4, impDiv2, currentY + 10);
        doc.line(impDiv3, currentY + 4, impDiv3, currentY + 10);
        doc.line(impDiv4, currentY + 4, impDiv4, currentY + 10);

        // Row 2 Dividers:
        const impDiv5 = m + impW * 0.15;
        const impDiv6 = m + impW * 0.30;
        const impDiv7 = m + impW * 0.45;
        const impDiv8 = m + impW * 0.60;
        const impDiv9 = m + impW * 0.75;
        doc.line(impDiv5, currentY + 10, impDiv5, currentY + 16);
        doc.line(impDiv6, currentY + 10, impDiv6, currentY + 16);
        doc.line(impDiv7, currentY + 10, impDiv7, currentY + 16);
        doc.line(impDiv8, currentY + 10, impDiv8, currentY + 16);
        doc.line(impDiv9, currentY + 10, impDiv9, currentY + 16);

        const getCurrencyStr = (val: any) => val ? parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";
        const vBC = getCurrencyStr(nfe.total?.vBC || nfe.total?.ICMSTot?.vBC);
        const vICMS = getCurrencyStr(nfe.total?.vICMS || nfe.total?.ICMSTot?.vICMS);
        const vBCST = getCurrencyStr(nfe.total?.vBCST || nfe.total?.ICMSTot?.vBCST);
        const vST = getCurrencyStr(nfe.total?.vST || nfe.total?.ICMSTot?.vST);
        const vFrete = getCurrencyStr(nfe.total?.vFrete || nfe.total?.ICMSTot?.vFrete);
        const vSeg = getCurrencyStr(nfe.total?.vSeg || nfe.total?.ICMSTot?.vSeg);
        const vDesc = getCurrencyStr(nfe.total?.vDesc || nfe.total?.ICMSTot?.vDesc);
        const vOutro = getCurrencyStr(nfe.total?.vOutro || nfe.total?.ICMSTot?.vOutro);
        const vIPI = getCurrencyStr(nfe.total?.vIPI || nfe.total?.ICMSTot?.vIPI);
        const vNF = getCurrencyStr(nfe.total?.vNF || nfe.total?.ICMSTot?.vNF) || formattedTotalProd;

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BASE DE CÁLCULO DO ICMS", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vBC, m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO ICMS", impDiv1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vICMS, impDiv1 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BASE DE CÁLCULO DO ICMS S.T.", impDiv2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vBCST, impDiv2 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO ICMS SUBSTITUIÇÃO", impDiv3 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vST, impDiv3 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR TOTAL DOS PRODUTOS", impDiv4 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedTotalProd, impDiv4 + 2, currentY + 9);

        // Row 2 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO FRETE", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vFrete, m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO SEGURO", impDiv5 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vSeg, impDiv5 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DESCONTO", impDiv6 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vDesc, impDiv6 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("OUTRAS DESPESAS", impDiv7 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vOutro, impDiv7 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO IPI", impDiv8 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vIPI, impDiv8 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR TOTAL DA NOTA", impDiv9 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vNF, impDiv9 + 2, currentY + 15);

        currentY += 16 + 2;

        // --- TRANSPORTADOR / VOLUMES TRANSPORTADOS BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("TRANSPORTADOR / VOLUMES TRANSPORTADOS", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 18);
        // Horizontal lines:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        doc.line(m, currentY + 16, 210 - m, currentY + 16);
        
        // Row 1 Dividers:
        const transpW = 210 - 2 * m;
        const trDiv1 = m + transpW * 0.45;
        const trDiv2 = m + transpW * 0.58;
        const trDiv3 = m + transpW * 0.70;
        const trDiv4 = m + transpW * 0.78;
        const trDiv5 = m + transpW * 0.85;
        doc.line(trDiv1, currentY + 4, trDiv1, currentY + 10);
        doc.line(trDiv2, currentY + 4, trDiv2, currentY + 10);
        doc.line(trDiv3, currentY + 4, trDiv3, currentY + 10);
        doc.line(trDiv4, currentY + 4, trDiv4, currentY + 10);
        doc.line(trDiv5, currentY + 4, trDiv5, currentY + 10);

        // Row 2 Dividers:
        const trDiv6 = m + transpW * 0.45;
        const trDiv7 = m + transpW * 0.70;
        const trDiv8 = m + transpW * 0.78;
        doc.line(trDiv6, currentY + 10, trDiv6, currentY + 16);
        doc.line(trDiv7, currentY + 10, trDiv7, currentY + 16);
        doc.line(trDiv8, currentY + 10, trDiv8, currentY + 16);

        // Row 3 Dividers:
        const trDiv9 = m + transpW * 0.15;
        const trDiv10 = m + transpW * 0.35;
        const trDiv11 = m + transpW * 0.55;
        const trDiv12 = m + transpW * 0.70;
        const trDiv13 = m + transpW * 0.85;
        doc.line(trDiv9, currentY + 16, trDiv9, currentY + 22);
        doc.line(trDiv10, currentY + 16, trDiv10, currentY + 22);
        doc.line(trDiv11, currentY + 16, trDiv11, currentY + 22);
        doc.line(trDiv12, currentY + 16, trDiv12, currentY + 22);
        doc.line(trDiv13, currentY + 16, trDiv13, currentY + 22);

        const transpCNPJ = nfe.transportadora?.cnpj || nfe.infNFe?.transp?.transporta?.CNPJ || nfe.infNFe?.transp?.transporta?.CPF || "";
        const transpIE = nfe.transportadora?.ie || nfe.infNFe?.transp?.transporta?.IE || "";
        const transpEnd = nfe.transportadora?.logradouro || nfe.infNFe?.transp?.transporta?.xEnder || "";
        const transpMun = nfe.transportadora?.municipio || nfe.infNFe?.transp?.transporta?.xMun || "";
        const transpUF = nfe.transportadora?.uf || nfe.infNFe?.transp?.transporta?.UF || "";
        
        let modFreteDesc = "0 - REMETENTE";
        const modF = nfe.infNFe?.transp?.modFrete;
        if (modF === "1") modFreteDesc = "1 - DESTINATÁRIO";
        else if (modF === "2") modFreteDesc = "2 - TERCEIROS";
        else if (modF === "3") modFreteDesc = "3 - PRÓPRIO/REMETENTE";
        else if (modF === "4") modFreteDesc = "4 - PRÓPRIO/DESTINATÁRIO";
        else if (modF === "9") modFreteDesc = "9 - SEM FRETE";

        const placa = nfe.infNFe?.transp?.veicTransp?.placa || "";
        const ufVeic = nfe.infNFe?.transp?.veicTransp?.UF || "";
        const rntc = nfe.infNFe?.transp?.veicTransp?.RNTC || "";

        const volEsp = nfe.infNFe?.transp?.vol?.esp || "";
        const volMarca = nfe.infNFe?.transp?.vol?.marca || "";
        const volNum = nfe.infNFe?.transp?.vol?.nVol || "";
        const pesoL = nfe.pesoL || nfe.infNFe?.transp?.vol?.pesoL || "";
        const formattedWeightL = pesoL ? `${parseFloat(pesoL).toFixed(3)}` : "";

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("RAZÃO SOCIAL", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(transpName).toUpperCase().substring(0, 40), m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("FRETE POR CONTA", trDiv1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(modFreteDesc, trDiv1 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CÓDIGO ANTT", trDiv2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(rntc, trDiv2 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PLACA DO VEÍCULO", trDiv3 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(placa, trDiv3 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", trDiv4 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(ufVeic, trDiv4 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ / CPF", trDiv5 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(transpCNPJ, trDiv5 + 2, currentY + 9);

        // Row 2 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ENDEREÇO", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(transpEnd).toUpperCase().substring(0, 45), m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MUNICÍPIO", trDiv6 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(transpMun).toUpperCase().substring(0, 20), trDiv6 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", trDiv7 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(transpUF, trDiv7 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", trDiv8 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(transpIE, trDiv8 + 2, currentY + 15);

        // Row 3 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("QUANTIDADE", m + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vols, m + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ESPÉCIE", trDiv9 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(volEsp, trDiv9 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MARCA", trDiv10 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(volMarca, trDiv10 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("NÚMERO", trDiv11 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(volNum, trDiv11 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PESO BRUTO", trDiv12 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedWeight, trDiv12 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PESO LÍQUIDO", trDiv13 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedWeightL, trDiv13 + 2, currentY + 21);

        currentY += 22 + 2;

        // --- PRODUCTS TABLE TITLE & HEADERS ---
        doc.setFillColor(245, 245, 245);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text("DADOS DO PRODUTO / SERVIÇO (CONTEÚDO IDENTIFICADO)", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 6);
        doc.line(22 + delta, currentY + 4, 22 + delta, currentY + 10);
        doc.line(114 + delta, currentY + 4, 114 + delta, currentY + 10);
        doc.line(126 + delta, currentY + 4, 126 + delta, currentY + 10);
        doc.line(134 + delta, currentY + 4, 134 + delta, currentY + 10);
        doc.line(144 + delta, currentY + 4, 144 + delta, currentY + 10);
        doc.line(152 + delta, currentY + 4, 152 + delta, currentY + 10);
        doc.line(164 + delta, currentY + 4, 164 + delta, currentY + 10);
        doc.line(178 + delta, currentY + 4, 178 + delta, currentY + 10);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(80, 80, 80);
        doc.text("CÓDIGO", m + 2, currentY + 8);
        doc.text("DESCRIÇÃO DO PRODUTO / SERVIÇO", 24 + delta, currentY + 8);
        doc.text("NCM/SH", 115.5 + delta, currentY + 8);
        doc.text("CST", 127.5 + delta, currentY + 8);
        doc.text("CFOP", 135.5 + delta, currentY + 8);
        doc.text("UNID", 145.5 + delta, currentY + 8);
        doc.text("QTD", 153.5 + delta, currentY + 8);
        doc.text("V. UNITÁRIO", 165.5 + delta, currentY + 8);
        doc.text("V. TOTAL", 180 + delta, currentY + 8);

        // Draw Page 1 Products
        const p1Displayed = detailedProds.slice(0, p1RowsToDraw);
        let rowY = p1StartY;

        p1Displayed.forEach((prod, pIdx) => {
          doc.line(m, rowY + rowSpacingVal, 210 - m, rowY + rowSpacingVal);
          doc.line(22 + delta, rowY, 22 + delta, rowY + rowSpacingVal);
          doc.line(114 + delta, rowY, 114 + delta, rowY + rowSpacingVal);
          doc.line(126 + delta, rowY, 126 + delta, rowY + rowSpacingVal);
          doc.line(134 + delta, rowY, 134 + delta, rowY + rowSpacingVal);
          doc.line(144 + delta, rowY, 144 + delta, rowY + rowSpacingVal);
          doc.line(152 + delta, rowY, 152 + delta, rowY + rowSpacingVal);
          doc.line(164 + delta, rowY, 164 + delta, rowY + rowSpacingVal);
          doc.line(178 + delta, rowY, 178 + delta, rowY + rowSpacingVal);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(dTemplate.fontSizeItems);
          doc.setTextColor(0);
          
          const textOffset = rowY + (rowSpacingVal / 2) + (dTemplate.fontSizeItems / 5);

          doc.text(prod.code, m + 2, textOffset);
          doc.text(String(prod.name).substring(0, 58), 24 + delta, textOffset);
          doc.text("84713012", 115.5 + delta, textOffset);
          doc.text("000", 127.5 + delta, textOffset);
          doc.text("5102", 135.5 + delta, textOffset);
          doc.text(String(prod.unit || "UN"), 145.5 + delta, textOffset);
          doc.text(String(prod.qty), 153.5 + delta, textOffset);
          doc.text(prod.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165.5 + delta, textOffset);
          doc.text(prod.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 180 + delta, textOffset);

          rowY += rowSpacingVal;
        });

        // Fill remaining space on page 1 if single page
        if (!isMultiPage) {
          const remaining = p1RowsToDraw - p1Displayed.length;
          for (let r = 0; r < remaining; r++) {
            doc.line(m, rowY + rowSpacingVal, 210 - m, rowY + rowSpacingVal);
            doc.line(22 + delta, rowY, 22 + delta, rowY + rowSpacingVal);
            doc.line(114 + delta, rowY, 114 + delta, rowY + rowSpacingVal);
            doc.line(126 + delta, rowY, 126 + delta, rowY + rowSpacingVal);
            doc.line(134 + delta, rowY, 134 + delta, rowY + rowSpacingVal);
            doc.line(144 + delta, rowY, 144 + delta, rowY + rowSpacingVal);
            doc.line(152 + delta, rowY, 152 + delta, rowY + rowSpacingVal);
            doc.line(164 + delta, rowY, 164 + delta, rowY + rowSpacingVal);
            doc.line(178 + delta, rowY, 178 + delta, rowY + rowSpacingVal);
            rowY += rowSpacingVal;
          }
        }

        doc.line(m, currentY + 10, m, rowY);
        doc.line(210 - m, currentY + 10, 210 - m, rowY);

        if (!isMultiPage && detailedProds.length > p1RowsToDraw) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(dTemplate.fontSizeItems - 0.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`* Mostrando ${p1RowsToDraw} de ${detailedProds.length} produtos. Restante omitido para economia de espaço.`, m + 2, rowY + rowSpacingVal - 1.5);
        }

        // Dados adicionais (Page 1 footer if single page)
        if (!isMultiPage && showBottomSection) {
          const bottomBlockY = 297 - m - 42;
          
          doc.setFillColor(245, 245, 245);
          doc.rect(m, bottomBlockY, 210 - 2 * m, 4, 'FD');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(0);
          doc.text("DADOS ADICIONAIS", m + 2, bottomBlockY + 3);

          doc.rect(m, bottomBlockY + 4, 210 - 2 * m, 38);

          if (dTemplate.showAdditionalNotes) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.5);
            doc.setTextColor(50, 50, 50);
            
            const additional: string[] = [];
            if (infCplLines.length > 0) {
              additional.push("INFORMAÇÕES COMPLEMENTARES:");
              additional.push(...infCplLines.slice(0, 6));
            }
            
            additional.forEach((note, nIdx) => {
              doc.text(note, m + 3, bottomBlockY + 8 + (nIdx * 4.2));
            });
          }

          // Generate and draw QR Code of the key at the bottom block (next to stamp)
          try {
            const qrDataUrl = await generateQRCodeDataURL(key);
            const qrBoxX = 112 + delta;
            const qrBoxY = bottomBlockY + 6;
            doc.rect(qrBoxX, qrBoxY, 30, 34);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(4.5);
            doc.setTextColor(0);
            doc.text("QR-CODE DA CHAVE", qrBoxX + 15, qrBoxY + 4, { align: 'center' });
            doc.addImage(qrDataUrl, 'PNG', qrBoxX + 3, qrBoxY + 6, 24, 24);
            doc.setFont("helvetica", "normal");
            doc.text("CONSULTA SEFAZ", qrBoxX + 15, qrBoxY + 32, { align: 'center' });
          } catch (qrErr) {
            console.error("Error rendering footer QR code", qrErr);
          }

          // Stamp
          if (dTemplate.showSysAuthentication) {
            doc.rect(144 + delta, bottomBlockY + 6, 54, 34);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(0);
            doc.text("AUTENTICAÇÃO DO SISTEMA", 171 + delta, bottomBlockY + 12, { align: 'center' });
            
            doc.setLineWidth(0.2);
            doc.rect(146 + delta, bottomBlockY + 15, 50, 22);
            doc.setFontSize(5);
            doc.setFont("helvetica", "bold");
            doc.text("SISTEMA DE GESTÃO JFAB", 171 + delta, bottomBlockY + 19, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.text("REGISTRO OPERACIONAL DE FLUXO", 171 + delta, bottomBlockY + 23, { align: 'center' });
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5.5);
            doc.text(dTemplate.customStampText || "STATUS: APROVADA & CONSOLIDADA", 171 + delta, bottomBlockY + 28, { align: 'center' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(4.5);
            doc.text("CHAVE SINCRONIZADA EM NUVEM", 171 + delta, bottomBlockY + 33, { align: 'center' });
          }
        }

        // Subsequent Pages (if multi-page)
        if (isMultiPage) {
          let currentProdIdx = p1RowsToDraw;
          let currentPageNum = 1;
          
          while (currentProdIdx < detailedProds.length) {
            doc.addPage();
            currentPageNum++;
            
            // Draw Watermark if enabled
            if (dTemplate.showWatermark) {
              doc.setTextColor(242, 242, 242);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(14);
              doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 100, { angle: 335 });
              doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 180, { angle: 335 });
            }
            
            // Border
            doc.setDrawColor(themeRgb.r, themeRgb.g, themeRgb.b);
            doc.setLineWidth(0.3);
            doc.rect(m, m, 210 - 2 * m, 297 - 2 * m);
            
            // Simplified Header Box
            const headerBoxY = m;
            const headerBoxH = 18;
            doc.rect(m, headerBoxY, 210 - 2 * m, headerBoxH);
            doc.line(124 + delta, headerBoxY, 124 + delta, headerBoxY + headerBoxH);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(0);
            doc.text("EMITENTE: " + String(finalEmitName).toUpperCase().substring(0, 36), m + 3, headerBoxY + 5);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(80, 80, 80);
            doc.text(`CNPJ: ${emitCnpjReal}  |  ${emitAddress.toUpperCase().substring(0, 48)}, ${emitCityState.toUpperCase().substring(0, 30)}`, m + 3, headerBoxY + 10);
            doc.text(`CHAVE: ${formattedKey.substring(0, 32)}...`, m + 3, headerBoxY + 14);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(0);
            doc.text("DANFE - CONTINUAÇÃO", 162 + delta, headerBoxY + 6, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text(`FOLHA ${String(currentPageNum).padStart(2, '0')}/${String(totalPages).padStart(2, '0')}`, 162 + delta, headerBoxY + 11, { align: 'center' });
            doc.text(`NF-e: ${String(number).padStart(9, '0')}  SÉRIE: ${series}`, 162 + delta, headerBoxY + 15, { align: 'center' });

            // Table headers
            const subPageStartY = m + 22;
            doc.setFillColor(245, 245, 245);
            doc.rect(m, subPageStartY, 210 - 2 * m, 4, 'FD');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(0);
            doc.text("DADOS DO PRODUTO / SERVIÇO (CONTEÚDO CONTINUAÇÃO)", m + 2, subPageStartY + 3);
            
            doc.rect(m, subPageStartY + 4, 210 - 2 * m, 6);
            doc.line(22 + delta, subPageStartY + 4, 22 + delta, subPageStartY + 10);
            doc.line(114 + delta, subPageStartY + 4, 114 + delta, subPageStartY + 10);
            doc.line(126 + delta, subPageStartY + 4, 126 + delta, subPageStartY + 10);
            doc.line(134 + delta, subPageStartY + 4, 134 + delta, subPageStartY + 10);
            doc.line(144 + delta, subPageStartY + 4, 144 + delta, subPageStartY + 10);
            doc.line(152 + delta, subPageStartY + 4, 152 + delta, subPageStartY + 10);
            doc.line(164 + delta, subPageStartY + 4, 164 + delta, subPageStartY + 10);
            doc.line(178 + delta, subPageStartY + 4, 178 + delta, subPageStartY + 10);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5);
            doc.setTextColor(80, 80, 80);
            doc.text("CÓDIGO", m + 2, subPageStartY + 8);
            doc.text("DESCRIÇÃO DO PRODUTO / SERVIÇO", 24 + delta, subPageStartY + 8);
            doc.text("NCM/SH", 115.5 + delta, subPageStartY + 8);
            doc.text("CST", 127.5 + delta, subPageStartY + 8);
            doc.text("CFOP", 135.5 + delta, subPageStartY + 8);
            doc.text("UNID", 145.5 + delta, subPageStartY + 8);
            doc.text("QTD", 153.5 + delta, subPageStartY + 8);
            doc.text("V. UNITÁRIO", 165.5 + delta, subPageStartY + 8);
            doc.text("V. TOTAL", 180 + delta, subPageStartY + 8);
            
            const remainingCount = detailedProds.length - currentProdIdx;
            const subPageMaxRowY = 297 - m - 2;
            const subPageMaxRowYIfLast = 297 - m - bottomSectionHeight - 2;
            
            const subPageMaxRowsIfLast = Math.floor((subPageMaxRowYIfLast - (subPageStartY + 10)) / rowSpacingVal);
            const subPageMaxRowsIfMulti = Math.floor((subPageMaxRowY - (subPageStartY + 10)) / rowSpacingVal);
            
            let isCurrentPageLast = remainingCount <= subPageMaxRowsIfLast;
            let rowsToDraw = isCurrentPageLast ? subPageMaxRowsIfLast : subPageMaxRowsIfMulti;
            
            const pageDisplayed = detailedProds.slice(currentProdIdx, currentProdIdx + rowsToDraw);
            let subRowY = subPageStartY + 10;
            
            pageDisplayed.forEach((prod, pIdx) => {
              doc.line(m, subRowY + rowSpacingVal, 210 - m, subRowY + rowSpacingVal);
              doc.line(22 + delta, subRowY, 22 + delta, subRowY + rowSpacingVal);
              doc.line(114 + delta, subRowY, 114 + delta, subRowY + rowSpacingVal);
              doc.line(126 + delta, subRowY, 126 + delta, subRowY + rowSpacingVal);
              doc.line(134 + delta, subRowY, 134 + delta, subRowY + rowSpacingVal);
              doc.line(144 + delta, subRowY, 144 + delta, subRowY + rowSpacingVal);
              doc.line(152 + delta, subRowY, 152 + delta, subRowY + rowSpacingVal);
              doc.line(164 + delta, subRowY, 164 + delta, subRowY + rowSpacingVal);
              doc.line(178 + delta, subRowY, 178 + delta, subRowY + rowSpacingVal);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(dTemplate.fontSizeItems);
              doc.setTextColor(0);
              
              const textOffset = subRowY + (rowSpacingVal / 2) + (dTemplate.fontSizeItems / 5);

              doc.text(prod.code, m + 2, textOffset);
              doc.text(String(prod.name).substring(0, 58), 24 + delta, textOffset);
              doc.text("84713012", 115.5 + delta, textOffset);
              doc.text("000", 127.5 + delta, textOffset);
              doc.text("5102", 135.5 + delta, textOffset);
              doc.text(String(prod.unit || "UN"), 145.5 + delta, textOffset);
              doc.text(String(prod.qty), 153.5 + delta, textOffset);
              doc.text(prod.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165.5 + delta, textOffset);
              doc.text(prod.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 180 + delta, textOffset);

              subRowY += rowSpacingVal;
            });
            
            if (isCurrentPageLast) {
              const remaining = rowsToDraw - pageDisplayed.length;
              for (let r = 0; r < remaining; r++) {
                doc.line(m, subRowY + rowSpacingVal, 210 - m, subRowY + rowSpacingVal);
                doc.line(22 + delta, subRowY, 22 + delta, subRowY + rowSpacingVal);
                doc.line(114 + delta, subRowY, 114 + delta, subRowY + rowSpacingVal);
                doc.line(126 + delta, subRowY, 126 + delta, subRowY + rowSpacingVal);
                doc.line(134 + delta, subRowY, 134 + delta, subRowY + rowSpacingVal);
                doc.line(144 + delta, subRowY, 144 + delta, subRowY + rowSpacingVal);
                doc.line(152 + delta, subRowY, 152 + delta, subRowY + rowSpacingVal);
                doc.line(164 + delta, subRowY, 164 + delta, subRowY + rowSpacingVal);
                doc.line(178 + delta, subRowY, 178 + delta, subRowY + rowSpacingVal);
                subRowY += rowSpacingVal;
              }
            }
            
            doc.line(m, subPageStartY + 10, m, subRowY);
            doc.line(210 - m, subPageStartY + 10, 210 - m, subRowY);
            
            if (isCurrentPageLast && showBottomSection) {
              const bottomBlockY = 297 - m - 42;
              
              doc.setFillColor(245, 245, 245);
              doc.rect(m, bottomBlockY, 210 - 2 * m, 4, 'FD');
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              doc.setTextColor(0);
              doc.text("DADOS ADICIONAIS", m + 2, bottomBlockY + 3);

              doc.rect(m, bottomBlockY + 4, 210 - 2 * m, 38);

              if (dTemplate.showAdditionalNotes) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(5.5);
                doc.setTextColor(50, 50, 50);
                
                const additional: string[] = [];
                if (infCplLines.length > 0) {
                  additional.push("INFORMAÇÕES COMPLEMENTARES:");
                  additional.push(...infCplLines.slice(0, 6));
                }
                
                additional.forEach((note, nIdx) => {
                  doc.text(note, m + 3, bottomBlockY + 8 + (nIdx * 4.2));
                });
              }

              // Generate and draw QR Code of the key at the bottom block (next to stamp)
              try {
                const qrDataUrl = await generateQRCodeDataURL(key);
                const qrBoxX = 112 + delta;
                const qrBoxY = bottomBlockY + 6;
                doc.rect(qrBoxX, qrBoxY, 30, 34);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(4.5);
                doc.setTextColor(0);
                doc.text("QR-CODE DA CHAVE", qrBoxX + 15, qrBoxY + 4, { align: 'center' });
                doc.addImage(qrDataUrl, 'PNG', qrBoxX + 3, qrBoxY + 6, 24, 24);
                doc.setFont("helvetica", "normal");
                doc.text("CONSULTA SEFAZ", qrBoxX + 15, qrBoxY + 32, { align: 'center' });
              } catch (qrErr) {
                console.error("Error rendering subsequent footer QR code", qrErr);
              }

              if (dTemplate.showSysAuthentication) {
                doc.rect(144 + delta, bottomBlockY + 6, 54, 34);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(0);
                doc.text("AUTENTICAÇÃO DO SISTEMA", 171 + delta, bottomBlockY + 12, { align: 'center' });
                
                doc.setLineWidth(0.2);
                doc.rect(146 + delta, bottomBlockY + 15, 50, 22);
                doc.setFontSize(5);
                doc.setFont("helvetica", "bold");
                doc.text("SISTEMA DE GESTÃO JFAB", 171 + delta, bottomBlockY + 19, { align: 'center' });
                doc.setFont("helvetica", "normal");
                doc.text("REGISTRO OPERACIONAL DE FLUXO", 171 + delta, bottomBlockY + 23, { align: 'center' });
                doc.setFont("helvetica", "bold");
                doc.setFontSize(5.5);
                doc.text(dTemplate.customStampText || "STATUS: APROVADA & CONSOLIDADA", 171 + delta, bottomBlockY + 28, { align: 'center' });
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(4.5);
                doc.text("CHAVE SINCRONIZADA EM NUVEM", 171 + delta, bottomBlockY + 33, { align: 'center' });
              }
            }
            
            currentProdIdx += rowsToDraw;
          }
        }
      }

      if (nfeItems.length === 1) {
        doc.save(`DANFE-${nfeItems[0].nfeData?.chave || nfeItems[0].t}.pdf`);
      } else {
        doc.save(`DANFE-Lote-${selectedContainer.toUpperCase()}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      }

      const logMsg = nfeItems.length === 1 
        ? `DANFE exportado em PDF para a Nota Fiscal Chave: ${nfeItems[0].t.substring(0, 10)}... com layout personalizado.`
        : `DANFE em Lote consolidado exportado em PDF para ${nfeItems.length} Nota(s) Fiscal(is) do contêiner "${selectedContainer.toUpperCase()}" com layout personalizado.`;
      
      await addCustomAuditLog('Impressão DANFE PDF', logMsg);

      addNotification('success', 'DANFE Gerado', `${nfeItems.length} Nota(s) Fiscal(is) exportada(s) com layout DANFE oficial.`);
    } catch (err) {
      console.error(err);
      addNotification('error', 'Erro', 'Falha ao processar e exportar o DANFE.');
    }
  };

export const generateContainerReport = async (ctx: PDFContext) => {
  const { items, selectedContainer, selectedCategory, selectedDate, isFinalized, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;
    
    if (items.length === 0 || !isFinalized) return;
    
    setPdfProgress({ current: 0, total: items.length, isOpen: true });
    
    // Load custom item template configuration from Estúdio de Layout
    let itemTemplate: any = null;
    try {
      const saved = localStorage.getItem('jfab_custom_template_item') || localStorage.getItem('jfab_custom_template');
      if (saved) {
        itemTemplate = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    if (!itemTemplate) {
      itemTemplate = {
        name: "Industrial Padrão",
        title: "CONTROLE DE ATIVOS",
        subtitle: "LOGÍSTICA & ESTOQUE",
        showCategory: true,
        showContainer: true,
        showTimestamp: true,
        showFooterNotes: true,
        footerNotesText: "PROPRIEDADE REGISTRADA - NÃO ALTERAR",
        primaryColor: "#1e3a8a",
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
        padding: 24
      };
    }

    const isThermal = itemTemplate.aspectRatio === 'thermal';
    const isBadge = itemTemplate.aspectRatio === 'badge';
    const w = isThermal ? 100 : (isBadge ? 85 : 140);
    const h = isThermal ? 150 : (isBadge ? 54 : 90);
    const isLandscape = w > h;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [w, h]
    });
    
    for (let i = 0; i < items.length; i++) {
        setPdfProgress(prev => ({ ...prev, current: i + 1 }));
        const item = items[i];
        if (i > 0) doc.addPage([w, h], isLandscape ? 'landscape' : 'portrait');
        
        try {
            const dataUrl = await generateBarcodeDataURL(item.t);
            const primaryColorHex = itemTemplate.primaryColor;
            const borderW = itemTemplate.borderWidth / 2.5; 
            const p = itemTemplate.padding / 4; 

            // 1. Draw Background
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, w, h, 'F');

            // 2. Draw Customizable Border
            if (borderW > 0) {
              doc.setDrawColor(primaryColorHex);
              doc.setLineWidth(borderW);
              const r = itemTemplate.borderRadius / 3;
              if (r > 0) {
                doc.roundedRect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, r, r, 'D');
              } else {
                doc.rect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, 'D');
              }
            }

            // 3. Draw Header text
            doc.setTextColor(itemTemplate.textColor);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(itemTemplate.fontSizeTitle);
            doc.text(itemTemplate.title, w / 2, borderW + p + 6, { align: 'center' });

            // Subtitle
            doc.setFont("helvetica", "normal");
            doc.setFontSize(itemTemplate.fontSizeDetails + 1);
            doc.setTextColor(100, 116, 139); // slate-400
            doc.text(itemTemplate.subtitle, w / 2, borderW + p + 11, { align: 'center' });

            // 4. Render QR or Barcode
            const isQR = itemTemplate.useQrCode;
            if (isQR) {
              const qrSize = (isThermal ? 50 : (isBadge ? 22 : 36)) * itemTemplate.qrScale;
              const qrX = (w - qrSize) / 2;
              const qrY = isThermal ? 42 : (isBadge ? 18 : 28);
              doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
            } else {
              const bW = (isThermal ? 70 : (isBadge ? 60 : 80)) * itemTemplate.barcodeScale;
              const bH = (isThermal ? 35 : (isBadge ? 12 : 20)) * itemTemplate.barcodeScale;
              const bX = (w - bW) / 2;
              const bY = isThermal ? 50 : (isBadge ? 20 : 32);
              doc.addImage(dataUrl, 'PNG', bX, bY, bW, bH);
            }

            // 5. Draw Bottom details
            let metaY = h - borderW - p - 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(itemTemplate.fontSizeDetails);
            doc.setTextColor(itemTemplate.textColor);
            doc.text(`CÓDIGO: ${item.t}`, w / 2, metaY, { align: 'center' });

            if (itemTemplate.showContainer) {
              metaY -= 5;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(itemTemplate.fontSizeDetails - 1);
              doc.setTextColor(71, 85, 105); // slate-600
              doc.text(`COLETA: ${selectedContainer}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showCategory) {
              metaY -= 4;
              doc.setFont("helvetica", "italic");
              doc.setFontSize(itemTemplate.fontSizeDetails - 2);
              doc.text(`Categoria: ${selectedCategory}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showTimestamp) {
              metaY -= 4;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(itemTemplate.fontSizeDetails - 2);
              doc.text(`Data: ${format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showFooterNotes) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184); // slate-300
              doc.text(itemTemplate.footerNotesText, w / 2, h - borderW - 2, { align: 'center' });
            }
            
        } catch (err) {
            console.error("PDF item error:", err);
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(`Erro ao gerar imagem para: ${item.t}`, 16, 30);
        }
        
        // Brief pause to allow UI update
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    doc.save(`relatorio-${selectedContainer}-${format(new Date(), 'yyyyMMdd')}.pdf`);
    
    if (pdfSettings.downloadJsonWithPdf) {
        try {
            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
            const dlElem = document.createElement('a');
            dlElem.setAttribute("href", jsonStr);
            dlElem.setAttribute("download", `dados-${selectedContainer}-${format(new Date(), 'yyyyMMdd')}.json`);
            document.body.appendChild(dlElem);
            dlElem.click();
            dlElem.remove();
        } catch (err) {
            console.error("Failed to download JSON", err);
        }
    }

    setPdfProgress({ current: 0, total: 0, isOpen: false });
    addNotification('success', 'PDF Concluído', 'O arquivo foi baixado com sucesso.');
  };

export const printContainerPlate = async (ctx: PDFContext) => {
  const { items, selectedContainer, selectedCategory, selectedDate, isFinalized, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog, storage, currentUser } = ctx;
    
    if (!selectedContainer || !isFinalized) return;
    
    addNotification('info', 'Gerando Placa', `Preparando identificação para ${selectedContainer}...`);
    
    let plateTemplate: any = null;
    try {
      const saved = localStorage.getItem('jfab_custom_template_plate');
      if (saved) {
        plateTemplate = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    const doc = new jsPDF();
    const pageWidth = 210;
    const pageHeight = 297;
    const operatorName = currentUser?.name ? currentUser.name.toUpperCase() : "JOSÉ FELIPE A. BARROSO";

    try {
      const dataUrl = await generateBarcodeDataURL(selectedContainer);
      
      const primaryColor = plateTemplate ? plateTemplate.primaryColor : '#2563eb';
      const textColor = plateTemplate ? plateTemplate.textColor : '#0f172a';
      const mainBorderWidth = plateTemplate ? plateTemplate.borderWidth / 3.5 : 0.4;
      const mainBorderRadius = plateTemplate ? plateTemplate.borderRadius / 3.5 : 4;
      
      // 1. WATERMARKS - Super Light Gray for Ink Saving
      doc.setTextColor(243, 244, 246);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
      doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
      doc.text(operatorName, 105, 230, { align: 'center', angle: 25 });

      // 2. MAIN BORDER - Thin Slate Outline Instead of solid dark block
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(mainBorderWidth > 0 ? mainBorderWidth : 0.4);
      doc.roundedRect(10, 10, 190, 277, mainBorderRadius, mainBorderRadius, 'D');

      // 3. HEADER SECTION (Left branding, Right Seal)
      // Branding text (Left)
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("JFAB ..::SISTEMAS::..", 16, 21);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(plateTemplate && plateTemplate.title ? plateTemplate.title : "EXTRATO E IDENTIFICAÇÃO DE FLUXO DE PRODUÇÃO", 16, 26);
      doc.text(plateTemplate && plateTemplate.subtitle ? plateTemplate.subtitle : "QR MANAGER CLOUD • RELATÓRIO DO LOTE", 16, 31);

      // PRODUCTION SEAL / STAMP (Right) - Elegant Ink-Efficient Production-Seal
      const stampX = 134;
      const stampY = 14;
      const stampW = 58;
      const stampH = 22;
      
      // Outer border of stamp
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.8);
      doc.rect(stampX, stampY, stampW, stampH, 'D');
      
      // Inner border of stamp (dashed/thin)
      doc.setLineWidth(0.3);
      doc.rect(stampX + 1.2, stampY + 1.2, stampW - 2.4, stampH - 2.4, 'D');

      // Stamp text
      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FINALIZADO", stampX + (stampW / 2), stampY + 6, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("APROVADO & CHANCELADO", stampX + (stampW / 2), stampY + 11, { align: 'center' });
      
      const currentFullDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(currentFullDate, stampX + (stampW / 2), stampY + 16, { align: 'center' });

      // First Divider line
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 40, 195, 40);

      // 4. LARGE CONTAINER IDENTIFIER (Clean Box with outline, no solid fill)
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(1);
      doc.rect(15, 44, 180, 42, 'D');

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CÓDIGO IDENTIFICADOR DO CONTÊINER", 105, 52, { align: 'center' });

      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      
      const contId = selectedContainer.toUpperCase();
      // Adjust font size dynamically if container text is extremely long
      if (contId.length > 12) {
        doc.setFontSize(36);
        doc.text(contId, 105, 71, { align: 'center' });
      } else {
        doc.setFontSize(50);
        doc.text(contId, 105, 74, { align: 'center' });
      }

      // Second Divider
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 91, 195, 91);

      // 5. METADATA GRID (Left) & QR/BARCODE IDENTIFIER (Right)
      // Left Pane - Operational stats
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("DADOS DA OPERAÇÃO:", 16, 100);

      const labelX = 16;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      
      doc.text("COLETA / LINHA:", labelX, 111);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.text(selectedCategory.toUpperCase(), labelX, 117);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("DATA DE REGISTRO:", labelX, 128);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.text(selectedDate, labelX, 134);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("VOLUMES ESCANEADOS:", labelX, 145);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor);
      doc.setFontSize(12);
      
      const keyCounts: Record<string, number> = {};
      items.forEach(item => {
        keyCounts[item.t] = (keyCounts[item.t] || 0) + 1;
      });
      const totalUniqueKeys = Object.keys(keyCounts).length;
      const duplicateKeysCount = items.length - totalUniqueKeys;
      const hasDuplicates = duplicateKeysCount > 0;

      const nfeItems = items.filter(i => i.nfeData);
      const isNFe = nfeItems.length > 0;
      
      if (isNFe) {
        if (hasDuplicates) {
          const uniqueNfeItems = nfeItems.filter((ni, idx, self) => self.findIndex(x => x.t === ni.t) === idx);
          let uniqueVols = 0;
          uniqueNfeItems.forEach(ni => {
            uniqueVols += parseInt(ni.nfeData?.volumes || "1", 10) || 1;
          });
          doc.setTextColor(220, 38, 38); // RED
          doc.text(`${uniqueVols} VOLS. ÚNICOS (DETEC. ${duplicateKeysCount} DUPL.)`, labelX, 151);
          doc.setTextColor(textColor);
        } else {
          let totalVols = 0;
          nfeItems.forEach(ni => {
            totalVols += parseInt(ni.nfeData?.volumes || "1", 10) || 1;
          });
          doc.text(`${totalVols} VOLUMES DE ${nfeItems.length} NF${nfeItems.length > 1 ? 's' : ''}`, labelX, 151);
        }
      } else {
        if (hasDuplicates) {
          doc.setTextColor(220, 38, 38); // RED
          doc.text(`${totalUniqueKeys} ÚNICOS (DETEC. ${duplicateKeysCount} DUPL.)`, labelX, 151);
          doc.setTextColor(textColor);
        } else {
          doc.text(`${items.length} ITENS CADASTRADOS`, labelX, 151);
        }
      }

      // Right Pane - QR/Barcode image placement
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("CHAVE DIGITALIZÁVEL:", 116, 100);

      const isForcedQR = plateTemplate ? plateTemplate.useQrCode : !/^\d+$/.test(selectedContainer);
      if (isForcedQR) {
        doc.addImage(dataUrl, 'PNG', 122, 104, 52, 52);
      } else {
        doc.addImage(dataUrl, 'PNG', 116, 112, 70, 36);
      }

      // Third Divider
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 162, 195, 162);

      let manifestoY = 170;
      let tableY = 175;
      let listLimit = 10;
      
      if (isNFe) {
        if (nfeItems.length === 1) {
          const mainNfe = nfeItems[0].nfeData;
          doc.setTextColor(textColor);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("DADOS DA NOTA FISCAL ELETRÔNICA:", 16, 170);

          doc.setFontSize(7.5);
          doc.text("CHAVE:", 16, 176);
          doc.setFont("helvetica", "normal");
          doc.text(mainNfe.chave || nfeItems[0].t, 30, 176);
          
          doc.setFont("helvetica", "bold");
          doc.text("EMITENTE:", 16, 181);
          doc.setFont("helvetica", "normal");
          const emitenteStr = mainNfe.emitente?.nome || mainNfe.emitente?.xNome || mainNfe.infNFe?.emit?.xNome || "N/A";
          doc.text(String(emitenteStr).substring(0, 90), 34, 181);

          doc.setFont("helvetica", "bold");
          doc.text("DESTINATÁRIO:", 16, 186);
          doc.setFont("helvetica", "normal");
          const destStr = mainNfe.destinatario?.nome || mainNfe.destinatario?.xNome || mainNfe.infNFe?.dest?.xNome || "N/A";
          doc.text(String(destStr).substring(0, 90), 40, 186);

          doc.setFont("helvetica", "bold");
          doc.text("TRANSPORTE:", 16, 191);
          doc.setFont("helvetica", "normal");
          const transpStr = mainNfe.transportadora?.nome || mainNfe.infNFe?.transp?.transporta?.xNome || "N/A";
          doc.text(String(transpStr).substring(0, 70), 40, 191);

          doc.setFont("helvetica", "bold");
          doc.text("VOLUME(S):", 150, 191);
          doc.setFont("helvetica", "normal");
          const volsStr = mainNfe.volumes || "N/A";
          doc.text(String(volsStr), 172, 191);

          doc.setDrawColor(primaryColor);
          doc.line(15, 195, 195, 195);
          
          manifestoY = 202;
          tableY = 207;
          listLimit = 5;
        } else {
          doc.setTextColor(textColor);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text(`NOTAS FISCAIS ELETRÔNICAS INTEGRADAS (LOTE DE ${nfeItems.length} NFs):`, 16, 170);

          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text("CHAVE / NF-e", 16, 175);
          doc.text("EMITENTE", 82, 175);
          doc.text("DESTINATÁRIO", 138, 175);
          doc.text("VOLS", 188, 175);

          doc.setDrawColor(primaryColor);
          doc.setLineWidth(0.3);
          doc.line(15, 177, 195, 177);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(textColor);
          
          const displayNfes = nfeItems.slice(0, 3);
          displayNfes.forEach((nItem, index) => {
            const nY = 181 + (index * 4.8);
            const dataNfe = nItem.nfeData;
            
            doc.text(nItem.t.substring(0, 4) + "..." + nItem.t.substring(40), 16, nY);
            
            const emitName = dataNfe.emitente?.nome || dataNfe.emitente?.xNome || "N/A";
            doc.text(String(emitName).substring(0, 24), 82, nY);
            
            const destName = dataNfe.destinatario?.nome || dataNfe.destinatario?.xNome || "N/A";
            doc.text(String(destName).substring(0, 24), 138, nY);
            
            const vols = dataNfe.volumes || "1";
            doc.text(String(vols), 188, nY);
          });

          if (nfeItems.length > 3) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`+ ${nfeItems.length - 3} outras notas fiscais vinculadas ao mesmo contêiner.`, 16, 196);
          }

          doc.setDrawColor(primaryColor);
          doc.line(15, 198, 195, 198);

          manifestoY = 202;
          tableY = 207;
          listLimit = 5;
        }
      }

      // 6. DETAILED SUMMARY OF REGISTERED ITEMS (Content Manifesto)
      if (hasDuplicates) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, manifestoY, 180, 6, 1, 1, 'FD');
        
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text("ATENÇÃO: DETECTADA DUPLICIDADE DE LEITURA NESTE CONTÊINER. VERIFIQUE OS ITENS DESTACADOS EM VERMELHO.", 105, manifestoY + 4, { align: 'center' });
        
        manifestoY += 8;
        tableY += 8;
      }

      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA (ITENS ESCANEADOS LOTE):", 16, manifestoY);

      // Draw table headers
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("#", 16, tableY);
      doc.text(isNFe ? "DESCRIÇÃO DO PRODUTO" : "VALOR CADASTRADO DO QR CODE / ETIQUETA", 26, tableY);
      doc.text(isNFe ? "QTD" : "DATA E HORÁRIO DE SCANEAMENTO", 142, tableY);

      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, tableY + 2, 195, tableY + 2);

      // Render the items
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textColor);

      let currentPage = 1;
      const allowMultiPage = plateTemplate ? (plateTemplate.allowMultiPage ?? true) : true;

      if (isNFe) {
        const allNfeProducts: any[] = [];
        nfeItems.forEach(ni => {
          if (ni.nfeData && Array.isArray(ni.nfeData.produtos)) {
            allNfeProducts.push(...ni.nfeData.produtos);
          }
        });

        if (allNfeProducts.length > 0) {
          const displayItems = allNfeProducts.slice(0, listLimit);
          displayItems.forEach((prod: any, index: number) => {
            const itemY = tableY + 7 + (index * 7.2);
            
            doc.setDrawColor(241, 245, 250);
            doc.setLineWidth(0.2);
            doc.line(15, itemY + 1.8, 195, itemY + 1.8);

            doc.setFont("helvetica", "bold");
            doc.text(String(index + 1), 16, itemY);
            
            doc.setFont("helvetica", "bold");
            let labelText = prod.nome || "N/A";
            if (labelText.length > 56) {
              labelText = labelText.substring(0, 53) + "...";
            }
            doc.text(labelText, 26, itemY);

            doc.setFont("helvetica", "normal");
            doc.text((prod.qtd || "1") + " UN", 142, itemY);
          });

          if (allNfeProducts.length > listLimit) {
            if (allowMultiPage) {
              const remainingProducts = allNfeProducts.slice(listLimit);
              const itemsPerPage = 32;
              const totalPages = 1 + Math.ceil(remainingProducts.length / itemsPerPage);
              
              for (let rIdx = 0; rIdx < remainingProducts.length; rIdx += itemsPerPage) {
                doc.addPage();
                currentPage++;
                
                // Draw Watermarks on subsequent pages
                doc.setTextColor(243, 244, 246);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
                doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
                
                // Draw Border
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(mainBorderWidth);
                doc.rect(10, 10, 190, 277);
                
                // Header
                doc.setTextColor(primaryColor);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA - CONTINUAÇÃO", 16, 20);
                
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`CONTÊINER: ${selectedContainer.toUpperCase()} | DATA: ${selectedDate} | OPERADOR: ${operatorName}`, 16, 25);
                
                // Page indicator top right
                doc.setFont("helvetica", "bold");
                doc.text(`PÁGINA ${currentPage} DE ${totalPages}`, 194, 20, { align: 'right' });
                
                // Line below header
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.4);
                doc.line(15, 28, 195, 28);
                
                // Table headers
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.text("#", 16, 34);
                doc.text("DESCRIÇÃO DO PRODUTO", 26, 34);
                doc.text("QTD", 142, 34);
                
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.3);
                doc.line(15, 36, 195, 36);
                
                const pageProducts = remainingProducts.slice(rIdx, rIdx + itemsPerPage);
                pageProducts.forEach((prod, pIdx) => {
                  const globalIndex = listLimit + rIdx + pIdx;
                  const itemY = 42 + (pIdx * 6.8);
                  
                  doc.setDrawColor(241, 245, 250);
                  doc.setLineWidth(0.2);
                  doc.line(15, itemY + 1.8, 195, itemY + 1.8);
                  
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(textColor);
                  doc.text(String(globalIndex + 1), 16, itemY);
                  
                  let labelText = prod.nome || "N/A";
                  if (labelText.length > 56) {
                    labelText = labelText.substring(0, 53) + "...";
                  }
                  doc.text(labelText, 26, itemY);
                  
                  doc.setFont("helvetica", "normal");
                  doc.text((prod.qtd || "1") + " UN", 142, itemY);
                });
                
                // Footer
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.4);
                doc.line(15, 266, 195, 266);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(148, 163, 184);
                doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
                
                doc.setFont("helvetica", "bold");
                doc.setTextColor(100, 116, 139);
                doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });
              }
            } else {
              const diff = allNfeProducts.length - listLimit;
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(`+ ${diff} outros produtos estão listados nas notas fiscais originais.`, 16, tableY + 7 + (listLimit * 7.2) + 2);
            }
          }
        } else {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(148, 163, 184);
          doc.text("Nenhum produto encontrado nas notas.", 16, tableY + 7);
        }
      } else {
        const displayItems = items.slice(0, listLimit);
        displayItems.forEach((item, index) => {
          const itemY = tableY + 7 + (index * 7.2);
          
          doc.setDrawColor(241, 245, 250);
          doc.setLineWidth(0.2);
          doc.line(15, itemY + 1.8, 195, itemY + 1.8);

          doc.setFont("helvetica", "bold");
          doc.text(String(index + 1), 16, itemY);
          
          doc.setFont("helvetica", "bold");
          let labelText = item.t;
          if (labelText.length > 56) {
            labelText = labelText.substring(0, 53) + "...";
          }
          
          const isDup = keyCounts[item.t] > 1;
          if (isDup) {
            doc.setTextColor(220, 38, 38);
            doc.text(`${labelText} (DUPLICADO - VERIFICAR!)`, 26, itemY);
            doc.setTextColor(textColor);
          } else {
            doc.text(labelText, 26, itemY);
          }

          doc.setFont("helvetica", "normal");
          const scanTime = format(item.ts, 'dd/MM/yyyy HH:mm:ss');
          doc.text(scanTime, 142, itemY);
        });

        if (items.length > listLimit) {
          if (allowMultiPage) {
            const remainingItems = items.slice(listLimit);
            const itemsPerPage = 32;
            const totalPages = 1 + Math.ceil(remainingItems.length / itemsPerPage);
            
            for (let rIdx = 0; rIdx < remainingItems.length; rIdx += itemsPerPage) {
              doc.addPage();
              currentPage++;
              
              // Draw Watermarks on subsequent pages
              doc.setTextColor(243, 244, 246);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(24);
              doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
              doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
              
              // Draw Border
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(mainBorderWidth);
              doc.rect(10, 10, 190, 277);
              
              // Header
              doc.setTextColor(primaryColor);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA - CONTINUAÇÃO", 16, 20);
              
              doc.setTextColor(100, 116, 139);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.text(`CONTÊINER: ${selectedContainer.toUpperCase()} | DATA: ${selectedDate} | OPERADOR: ${operatorName}`, 16, 25);
              
              // Page indicator top right
              doc.setFont("helvetica", "bold");
              doc.text(`PÁGINA ${currentPage} DE ${totalPages}`, 194, 20, { align: 'right' });
              
              // Line below header
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.4);
              doc.line(15, 28, 195, 28);
              
              // Table headers
              doc.setTextColor(100, 116, 139);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.text("#", 16, 34);
              doc.text("VALOR CADASTRADO DO QR CODE / ETIQUETA", 26, 34);
              doc.text("DATA E HORÁRIO DE ESCANEAMENTO", 142, 34);
              
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.3);
              doc.line(15, 36, 195, 36);
              
              const pageItems = remainingItems.slice(rIdx, rIdx + itemsPerPage);
              pageItems.forEach((item, pIdx) => {
                const globalIndex = listLimit + rIdx + pIdx;
                const itemY = 42 + (pIdx * 6.8);
                
                doc.setDrawColor(241, 245, 250);
                doc.setLineWidth(0.2);
                doc.line(15, itemY + 1.8, 195, itemY + 1.8);
                
                doc.setFont("helvetica", "bold");
                doc.setTextColor(textColor);
                doc.text(String(globalIndex + 1), 16, itemY);
                
                let labelText = item.t;
                if (labelText.length > 56) {
                  labelText = labelText.substring(0, 53) + "...";
                }
                
                const isDup = keyCounts[item.t] > 1;
                if (isDup) {
                  doc.setTextColor(220, 38, 38);
                  doc.text(`${labelText} (DUPLICADO - VERIFICAR!)`, 26, itemY);
                  doc.setTextColor(textColor);
                } else {
                  doc.text(labelText, 26, itemY);
                }
                
                doc.setFont("helvetica", "normal");
                const scanTime = format(item.ts, 'dd/MM/yyyy HH:mm:ss');
                doc.text(scanTime, 142, itemY);
              });
              
              // Footer
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.4);
              doc.line(15, 266, 195, 266);
              
              doc.setFont("helvetica", "normal");
              doc.setFontSize(6.5);
              doc.setTextColor(148, 163, 184);
              doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
              
              doc.setFont("helvetica", "bold");
              doc.setTextColor(100, 116, 139);
              doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });
            }
          } else {
            const diff = items.length - listLimit;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`+ ${diff} outros itens cadastrados estão presentes neste contêiner e salvos no sistema.`, 16, tableY + 84);
          }
        } else if (items.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(148, 163, 184);
          doc.text("Nenhum item digitalizado registrado para este contêiner.", 16, tableY + 12);
        }
      }

      // Divider for footer
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 266, 195, 266);

      // 7. FOOTER CHANCELLOR (Signature & legal text)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });

      // Build & Print
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      } else {
        doc.save(`PLACA-${selectedContainer}.pdf`);
      }
      
      addNotification('success', 'Impressão Iniciada', 'Layout otimizado para economia de tinta gerado com sucesso!');
    } catch (e) {
      console.error(e);
      addNotification('error', 'Erro', 'Falha ao gerar o arquivo de placa.');
    }
  };
