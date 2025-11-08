/**
 * Convert a number to Indian English words
 * Example: 12345 -> "Twelve Thousand Three Hundred Forty Five"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  let result = '';
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    result += teens[num - 10] + ' ';
    return result.trim();
  }
  
  if (num > 0) {
    result += ones[num] + ' ';
  }
  
  return result.trim();
}

/**
 * Convert a number to Indian words (supports up to crores)
 * @param num - The number to convert (integer, in paise or rupees)
 * @returns String representation in words
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  let numStr = Math.abs(Math.floor(num)).toString();
  let result = '';
  
  // Handle crores (10,000,000)
  if (numStr.length > 7) {
    const crores = parseInt(numStr.slice(0, numStr.length - 7));
    result += convertLessThanThousand(crores) + ' Crore ';
    numStr = numStr.slice(numStr.length - 7);
  }
  
  // Handle lakhs (100,000)
  if (numStr.length > 5) {
    const lakhs = parseInt(numStr.slice(0, numStr.length - 5));
    result += convertLessThanThousand(lakhs) + ' Lakh ';
    numStr = numStr.slice(numStr.length - 5);
  }
  
  // Handle thousands (1,000)
  if (numStr.length > 3) {
    const thousands = parseInt(numStr.slice(0, numStr.length - 3));
    result += convertLessThanThousand(thousands) + ' Thousand ';
    numStr = numStr.slice(numStr.length - 3);
  }
  
  // Handle remaining (< 1000)
  if (numStr.length > 0) {
    const remainder = parseInt(numStr);
    result += convertLessThanThousand(remainder);
  }
  
  return result.trim();
}

/**
 * Convert amount in paise to words with "Rupees" and "Paise" labels
 * Example: 523450 paise -> "Rupees Five Thousand Two Hundred Thirty Four and Fifty Paise Only"
 */
export function amountToWords(amountInPaise: number): string {
  const rupees = Math.floor(amountInPaise / 100);
  const paise = amountInPaise % 100;
  
  let result = 'Rupees ' + numberToWords(rupees);
  
  if (paise > 0) {
    result += ' and ' + numberToWords(paise) + ' Paise';
  }
  
  result += ' Only';
  
  return result;
}
