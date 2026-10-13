export function readinessCsv(rows:Array<Record<string,unknown>>) {
 const columns=['id','name','phone','cohort','pathway','targetBand','timeframe','state','listening','reading','extension','completionSeconds','decision','listeningMaximum','readingMaximum','extensionListening','extensionListeningMaximum','extensionReading','extensionReadingMaximum'];
 const cell=(value:unknown)=>{let text=value==null?'':String(value);if(/^[\s\uFEFF]*[=+@-]/u.test(text)||/^[\t\r\n]/u.test(text))text=`'${text}`;return `"${text.replace(/"/gu,'""')}"`;};
 return '\uFEFF'+[columns.map(cell).join(','),...rows.map(row=>columns.map(c=>cell(row[c])).join(','))].join('\r\n');
}
