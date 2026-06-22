/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import bwipjs from 'bwip-js';

export async function generateBarcodeDataURL(text: string): Promise<string> {
  const isQR = !/^\d+$/.test(text);
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    try {
      bwipjs.toCanvas(canvas, {
        bcid: isQR ? 'qrcode' : 'code128',
        text: text,
        scale: 3,
        ...(isQR ? {} : { height: 10 }),
        includetext: !isQR,
        textxalign: 'center',
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      reject(e);
    }
  });
}

function computeCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(key: string, merchantName: string, merchantCity: string, amount?: string, reference: string = '***'): string {
  // Normalize strings and replace letters with accents/diacritics
  const sanitizedName = merchantName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const sanitizedCity = merchantCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  const parts = {
    payloadFormat: '000201',
    merchantAccount: `26${String(18 + 4 + key.length).padStart(2, '0')}0014br.gov.bcb.pix01${String(key.length).padStart(2, '0')}${key}`,
    merchantCategory: '52040000',
    currency: '5303986',
    ...(amount ? { amount: `54${String(amount.length).padStart(2, '0')}${amount}` } : {}),
    country: '5802BR',
    name: `59${String(sanitizedName.length).padStart(2, '0')}${sanitizedName}`,
    city: `60${String(sanitizedCity.length).padStart(2, '0')}${sanitizedCity}`,
    additionalData: `62${String(4 + 3 + reference.length).padStart(2, '0')}05${String(reference.length).padStart(2, '0')}${reference}`,
    crcHeader: '6304'
  };
  
  const payloadBeforeCrc = `${parts.payloadFormat}${parts.merchantAccount}${parts.merchantCategory}${parts.currency}${parts.amount || ''}${parts.country}${parts.name}${parts.city}${parts.additionalData}${parts.crcHeader}`;
  const crcValue = computeCRC16(payloadBeforeCrc);
  return `${payloadBeforeCrc}${crcValue}`;
}
