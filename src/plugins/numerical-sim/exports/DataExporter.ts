export class DataExporter {
  exportCSV(gridData: Float32Array, width: number, height: number, filename = 'sim_data.csv') {
    let csvContent = 'data:text/csv;charset=utf-8,';

    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        row.push(gridData[y * width + x].toExponential(6)); // 使用科学计数法，保留6位有效数字
      }
      csvContent += row.join(',') + '\r\n';
    }

    // 触发浏览器下载
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}