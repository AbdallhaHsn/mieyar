/**
 * Tafqeet Utility for Arabic Currency Formatting (SAR)
 * تفقيط المبالغ المالية بالريال السعودي والهللات
 */

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  let str = '';

  const h = Math.floor(n / 100);
  const rem = n % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;

  if (h > 0) {
    str += hundreds[h];
  }

  if (rem > 0) {
    if (str !== '') str += ' و ';

    if (rem < 10) {
      str += ones[rem];
    } else if (rem >= 10 && rem < 20) {
      str += teens[rem - 10];
    } else {
      if (o > 0) {
        str += ones[o] + ' و ' + tens[t];
      } else {
        str += tens[t];
      }
    }
  }

  return str;
}

export function tafqeet(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'صفر ريال سعودي';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const fractionPart = Math.round((absAmount - integerPart) * 100);

  let result = '';

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(convertChunk(billions) + ' مليارات');
    else parts.push(convertChunk(billions) + ' مليار');
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertChunk(millions) + ' ملايين');
    else parts.push(convertChunk(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertChunk(thousands) + ' آلاف');
    else parts.push(convertChunk(thousands) + ' ألف');
  }

  if (remainder > 0) {
    parts.push(convertChunk(remainder));
  }

  if (parts.length > 0) {
    result = parts.join(' و ');
    if (integerPart === 1) result += ' ريال سعودي';
    else if (integerPart === 2) result += ' ريالان سعوديان';
    else if (integerPart >= 3 && integerPart <= 10) result += ' ريالات سعودية';
    else result += ' ريالاً سعودياً';
  }

  if (fractionPart > 0) {
    const fractionText = convertChunk(fractionPart);
    if (result !== '') result += ' و ';
    result += fractionText + (fractionPart >= 3 && fractionPart <= 10 ? ' هللات' : ' هللة');
  }

  result = (isNegative ? 'سالب ' : '') + 'فقط ' + result + ' لا غير';
  return result;
}
