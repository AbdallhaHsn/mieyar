import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TafqeetService {

  private readonly ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  private readonly tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  private readonly hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  private readonly teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

  /**
   * Convert currency number to formal Arabic accounting words (Tafqeet)
   * Example: 1500.50 => "فقط ألف وخمسمائة ريال سعودي وخمسون هللة لا غير"
   */
  toArabicCurrency(amount: number, currency: string = 'ريال سعودي', subunit: string = 'هللة'): string {
    if (amount === 0 || isNaN(amount)) {
      return `فقط صفر ${currency} لا غير`;
    }

    const rounded = Math.round(amount * 100) / 100;
    const integerPart = Math.floor(Math.abs(rounded));
    const decimalPart = Math.round((Math.abs(rounded) - integerPart) * 100);

    let result = '';

    if (integerPart > 0) {
      result += this.convertIntegerToArabic(integerPart) + ' ' + this.getCurrencyPlural(integerPart, currency);
    }

    if (decimalPart > 0) {
      if (result) {
        result += ' و';
      }
      result += this.convertIntegerToArabic(decimalPart) + ' ' + subunit;
    }

    return `فقط ${result.trim()} لا غير`;
  }

  /**
   * Convert currency number to formal English accounting words
   */
  toEnglishCurrency(amount: number, currency: string = 'SAR', subunit: string = 'Halalas'): string {
    if (amount === 0 || isNaN(amount)) {
      return `Only Zero ${currency}`;
    }

    const rounded = Math.round(amount * 100) / 100;
    const integerPart = Math.floor(Math.abs(rounded));
    const decimalPart = Math.round((Math.abs(rounded) - integerPart) * 100);

    let result = this.convertIntegerToEnglish(integerPart) + ' ' + currency;

    if (decimalPart > 0) {
      result += ' and ' + this.convertIntegerToEnglish(decimalPart) + ' ' + subunit;
    }

    return `Only ${result.trim()}`;
  }

  private convertIntegerToArabic(num: number): string {
    if (num === 0) return '';
    if (num < 10) return this.ones[num];
    if (num >= 10 && num < 20) return this.teens[num - 10];
    if (num >= 20 && num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (one === 0) return this.tens[ten];
      return `${this.ones[one]} و${this.tens[ten]}`;
    }
    if (num >= 100 && num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      if (remainder === 0) return this.hundreds[hundred];
      return `${this.hundreds[hundred]} و${this.convertIntegerToArabic(remainder)}`;
    }
    if (num >= 1000 && num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      let thousandsText = '';
      if (thousands === 1) thousandsText = 'ألف';
      else if (thousands === 2) thousandsText = 'ألفان';
      else if (thousands >= 3 && thousands <= 10) thousandsText = `${this.ones[thousands]} آلاف`;
      else thousandsText = `${this.convertIntegerToArabic(thousands)} ألف`;

      if (remainder === 0) return thousandsText;
      return `${thousandsText} و${this.convertIntegerToArabic(remainder)}`;
    }
    if (num >= 1000000 && num < 1000000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      let millionsText = '';
      if (millions === 1) millionsText = 'مليون';
      else if (millions === 2) millionsText = 'مليونان';
      else if (millions >= 3 && millions <= 10) millionsText = `${this.ones[millions]} ملايين`;
      else millionsText = `${this.convertIntegerToArabic(millions)} مليون`;

      if (remainder === 0) return millionsText;
      return `${millionsText} و${this.convertIntegerToArabic(remainder)}`;
    }

    return num.toLocaleString('ar-SA');
  }

  private convertIntegerToEnglish(num: number): string {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return '';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' hundred' + (num % 100 !== 0 ? ' ' + this.convertIntegerToEnglish(num % 100) : '');
    if (num < 1000000) return this.convertIntegerToEnglish(Math.floor(num / 1000)) + ' thousand' + (num % 1000 !== 0 ? ' ' + this.convertIntegerToEnglish(num % 1000) : '');
    return this.convertIntegerToEnglish(Math.floor(num / 1000000)) + ' million' + (num % 1000000 !== 0 ? ' ' + this.convertIntegerToEnglish(num % 1000000) : '');
  }

  private getCurrencyPlural(num: number, currency: string): string {
    if (currency !== 'ريال سعودي') return currency;
    if (num === 1) return 'ريال سعودي';
    if (num === 2) return 'ريالان سعوديان';
    if (num >= 3 && num <= 10) return 'ريالات سعودية';
    return 'ريالاً سعودياً';
  }
}
