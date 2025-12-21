import PdfPrinter from "pdfmake";
import htmlToPdfmake from "html-to-pdfmake";
import { JSDOM } from "jsdom";

const fonts = {
  Roboto: {
    normal: "node_modules/pdfmake/fonts/Roboto-Regular.ttf",
    bold: "node_modules/pdfmake/fonts/Roboto-Medium.ttf",
  },
};

export const generateSareePdf = async (data) => {
  const printer = new PdfPrinter(fonts);

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  global.window = dom.window;
  global.document = dom.window.document;

  const html = `
  <div style="border:1px solid black; padding:10px;">
    <h2 style="text-align:center;">|| BAPA SITARAM INDUSTRIES ||</h2>

    <table width="100%" border="1" cellspacing="0" cellpadding="5">
      <tr>
        <td width="50%">
          <img src="${data.designImage}" width="250"/>
        </td>
        <td width="50%">
          <table width="100%" border="1" cellspacing="0" cellpadding="5">
            <tr><td>ORDER NO</td><td>${data.orderNo}</td></tr>
            <tr><td>DATE</td><td>${data.date}</td></tr>
            <tr><td>MACHINE NO</td><td>${data.machineNo}</td></tr>
            <tr><td>SALER</td><td>${data.saler}</td></tr>
            <tr><td>DESIGN NO</td><td>${data.designNo}</td></tr>
            <tr><td>PICK</td><td>${data.pick}</td></tr>
            <tr><td>QUALITY</td><td>${data.quality}</td></tr>
            <tr><td>TOTAL MTR/REPEAT</td><td>${data.totalMeter}</td></tr>
            <tr><td>TOTAL COLOUR</td><td>${data.totalColor}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <br/>

    <table width="100%" border="1" cellspacing="0" cellpadding="5">
      <tr>
        <th>NO</th>
        <th>F1</th>
        <th>F2</th>
        <th>F3</th>
        <th>F4</th>
        <th>F5</th>
        <th>REPEAT</th>
        <th>TOTAL</th>
      </tr>

      ${data.rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.f1}</td>
          <td>${r.f2}</td>
          <td>${r.f3}</td>
          <td>${r.f4}</td>
          <td>${r.f5}</td>
          <td>${r.repeat}</td>
          <td>${r.total}</td>
        </tr>
      `).join("")}

      <tr>
        <td colspan="7" align="right"><b>TOTAL SAREES</b></td>
        <td><b>${data.totalSarees}</b></td>
      </tr>
    </table>
  </div>
  `;

  const pdfContent = htmlToPdfmake(html);

  const docDefinition = {
    content: pdfContent,
    defaultStyle: { font: "Roboto" },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.end();
  });
};
