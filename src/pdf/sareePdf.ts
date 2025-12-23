// import PdfPrinter from "pdfmake";
// import htmlToPdfmake from "html-to-pdfmake";
// import { JSDOM } from "jsdom";
// import path from "path";

// const fonts = {
//   Roboto: {
//     normal: path.resolve(process.cwd(), "src/fonts/Roboto-Regular.ttf"),
//     bold: path.resolve(process.cwd(), "src/fonts/Roboto-Medium.ttf"),
//   },
// };

// export const generateSareePdf = async (data: any): Promise<Buffer> => {
//   // ✅ REAL DOM
//   const { window } = new JSDOM("");
//   (global as any).window = window;
//   (global as any).document = window.document;

//   const printer = new PdfPrinter(fonts);

//   const html = `
//     <h2 style="text-align:center;">BAPA SITARAM INDUSTRIES</h2>
//     <table border="1" width="100%" cellpadding="5">
//       <tr><td>ORDER NO</td><td>${data.orderNo}</td></tr>
//       <tr><td>DATE</td><td>${data.date}</td></tr>
//     </table>
//   `;

//   const pdfContent = htmlToPdfmake(html);

//   const docDefinition = {
//     content: pdfContent,
//     defaultStyle: { font: "Roboto" },
//   };

//   const pdfDoc = printer.createPdfKitDocument(docDefinition);

//   return new Promise((resolve) => {
//     const chunks: Buffer[] = [];
//     pdfDoc.on("data", (c) => chunks.push(c));
//     pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
//     pdfDoc.end();
//   });
// };

// import PdfPrinter from "pdfmake";
// import htmlToPdfmake from "html-to-pdfmake";
// import { JSDOM } from "jsdom";

// const fonts = {
//   Roboto: {
//     normal: "src/fonts/Roboto-Regular.ttf",
//     bold: "src/fonts/Roboto-Medium.ttf",
//   },
// };

// export const generateSareePdf = async (data) => {
//   const printer = new PdfPrinter(fonts);

//   const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
//   global.window = dom.window;
//   global.document = dom.window.document;

//   const html = `
//   <div style="border:1px solid black; padding:10px;">
//     <h2 style="text-align:center;">|| BAPA SITARAM INDUSTRIES ||</h2>

//     <table width="100%" border="1" cellspacing="0" cellpadding="5">
//       <tr>
//         <td width="50%">
//         </td>
//         <td width="50%">
//           <table width="100%" border="1" cellspacing="0" cellpadding="5">
//             <tr><td>ORDER NO</td><td>${data.orderNo}</td></tr>
//             <tr><td>DATE</td><td>${data.date}</td></tr>
//             <tr><td>MACHINE NO</td><td>${data.machineNo}</td></tr>
//             <tr><td>SALER</td><td>${data.saler}</td></tr>
//             <tr><td>DESIGN NO</td><td>${data.designNo}</td></tr>
//             <tr><td>PICK</td><td>${data.pick}</td></tr>
//             <tr><td>QUALITY</td><td>${data.quality}</td></tr>
//             <tr><td>TOTAL MTR/REPEAT</td><td>${data.totalMeter}</td></tr>
//             <tr><td>TOTAL COLOUR</td><td>${data.totalColor}</td></tr>
//           </table>
//         </td>
//       </tr>
//     </table>

//     <br/>

//     <table width="100%" border="1" cellspacing="0" cellpadding="5">
//       <tr>
//         <th>NO</th>
//         <th>F1</th>
//         <th>F2</th>
//         <th>F3</th>
//         <th>F4</th>
//         <th>F5</th>
//         <th>REPEAT</th>
//         <th>TOTAL</th>
//       </tr>

//       ${data.rows.map((r, i) => `
//         <tr>
//           <td>${i + 1}</td>
//           <td>${r.f1}</td>
//           <td>${r.f2}</td>
//           <td>${r.f3}</td>
//           <td>${r.f4}</td>
//           <td>${r.f5}</td>
//           <td>${r.repeat}</td>
//           <td>${r.total}</td>
//         </tr>
//       `).join("")}

//       <tr>
//         <td colspan="7" align="right"><b>TOTAL SAREES</b></td>
//         <td><b>${data.totalSarees}</b></td>
//       </tr>
//     </table>
//   </div>
//   `;

//   const pdfContent = htmlToPdfmake(html);

//   const docDefinition = {
//     content: pdfContent,
//     defaultStyle: { font: "Roboto" },
//   };

//   const pdfDoc = printer.createPdfKitDocument(docDefinition);

//   return new Promise((resolve) => {
//     const chunks = [];
//     pdfDoc.on("data", (chunk) => chunks.push(chunk));
//     pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
//     pdfDoc.end();
//   });
// };

// import PdfPrinter from "pdfmake";
// import path from "path";
// import axios from "axios"


// export async function imageUrlToBase64(url: string): Promise<string> {
//   try {
//     const encodedUrl = encodeURI(url);

//     const res = await axios.get(encodedUrl, {
//       responseType: "arraybuffer",
//       timeout: 15000,
//       headers: {
//         "User-Agent": "Mozilla/5.0",
//         "Accept": "image/*",
//         "Referer": "https://google.com",
//       },
//       validateStatus: (status) => status >= 200 && status < 400,
//     });

//     const contentType =
//       res.headers["content-type"] || "image/jpeg";

//     const base64 = Buffer.from(res.data).toString("base64");

//     return `data:${contentType};base64,${base64}`;
//   } catch (err: any) {
//     console.error("IMAGE FETCH FAILED:", err.message);
//     throw new Error("Unable to load image for PDF");
//   }
// }
// const fonts = {
//     Roboto: {
//         normal: path.resolve(process.cwd(), "src/fonts/Roboto-Regular.ttf"),
//         bold: path.resolve(process.cwd(), "src/fonts/Roboto-Medium.ttf"),
//     },
// };

// export async function generateSareePdf(data: any): Promise<Buffer> {
//     const printer = new PdfPrinter(fonts);
//     const designImageBase64 = await imageUrlToBase64(data.designImage);
//     console.log("Generating PDF with data:", data,designImageBase64);
//     /* ---------------- HELPERS ---------------- */
//     const cell = (text: any, bold = false, fill?: string) => ({
//         text: String(text ?? ""),
//         bold,
//         fontSize: 9,
//         fillColor: fill,
//         margin: [4, 4, 4, 4],
//     });

//     const headerCell = (text: string) => ({
//         text,
//         bold: true,
//         fontSize: 9,
//         alignment: "center",
//         margin: [3, 3, 3, 3],
//     });

//     /* ---------------- RIGHT INFO TABLE ---------------- */
//     const infoTable = {
//         table: {
//             widths: ["*", "*"],
//             body: [
//                 [cell("ORDER NO.", true), cell(data.orderNo)],
//                 [cell("DATE", true), cell(data.date)],
//                 [cell("MACHINE NO.", true), cell(data.machineNo)],
//                 [cell("SALER", true), cell(data.saler)],
//                 [cell("DESIGN NO.", true), cell(data.designNo)],
//                 [cell("PICK", true, "#fff2cc"), cell(data.pick, true, "#fff2cc")],
//                 [cell("QUALITY", true), cell(data.quality)],
//                 [cell("TOTAL MTR / REPEAT", true), cell(data.totalMeter)],
//                 [cell("TOTAL COLOUR", true), cell(data.totalColor)],
//             ],
//         },
//         layout: "lightHorizontalLines",
//     };

//     /* ---------------- MAIN COLOR TABLE ---------------- */
//     const colorRows = data.rows.map((r: any, i: number) => [
//         cell(i + 1),
//         cell(r.f1),
//         cell(r.f2),
//         cell(r.f3),
//         cell(r.f4),
//         cell(r.f5),
//         cell(r.repeat),
//         cell(r.total),
//     ]);

//     const colorTable = {
//         table: {
//             headerRows: 1,
//             widths: [25, "*", "*", "*", "*", "*", 45, 45],
//             body: [
//                 [
//                     headerCell("NO"),
//                     headerCell("F1"),
//                     headerCell("F2"),
//                     headerCell("F3"),
//                     headerCell("F4"),
//                     headerCell("F5"),
//                     headerCell("REPEAT"),
//                     headerCell("TOTAL"),
//                 ],
//                 ...colorRows,
//                 [
//                     { text: "TOTAL SAREES", colSpan: 7, alignment: "right", bold: true },
//                     {},
//                     {},
//                     {},
//                     {},
//                     {},
//                     {},
//                     { text: data.totalSarees, bold: true },
//                 ],
//             ],
//         },
//         layout: "lightHorizontalLines",
//     };

//     /* ---------------- DOCUMENT ---------------- */
//     const docDefinition = {
//         pageSize: "A4",
//         pageMargins: [20, 20, 20, 20],

//         content: [
//             {
//                 text: "|| BAPA SITARAM INDUSTRIES ||",
//                 alignment: "center",
//                 bold: true,
//                 fontSize: 16,
//                 margin: [0, 0, 0, 10],
//             },

//             {
//                 columns: [
//                     {
//                         width: "50%",
//                         image: designImageBase64, // base64 or public URL
//                         fit: [250, 250],
//                         margin: [0, 0, 10, 0],
//                     },
//                     {
//                         width: "50%",
//                         stack: [infoTable],
//                     },
//                 ],
//             },

//             { text: "", margin: [0, 10] },

//             colorTable,
//         ],

//         defaultStyle: {
//             font: "Roboto",
//         },
//     };

//     const pdfDoc = printer.createPdfKitDocument(docDefinition);

//     return new Promise((resolve) => {
//         const chunks = [];
//         pdfDoc.on("data", (chunk) => chunks.push(chunk));
//         pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
//         pdfDoc.end();
//     });
// }


import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function generateSareePdf(data) {
  // Launch headless Chrome (Vercel-friendly)
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.NODE_ENV == "production" ? await chromium.executablePath() : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: (chromium as any).headless,
  });
  const page = await browser.newPage();

  // Build HTML dynamically
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Saree Order PDF</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { text-align: center; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .header img { max-height: 100px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: center; }
            th { background-color: #f0f0f0; }
        </style>
    </head>
    <body>
      <div style="border:1px solid black; padding:10px;">
    <h2 style="text-align:center;">|| BAPA SITARAM INDUSTRIES ||</h2>

    <table width="100%" border="1" cellspacing="0" cellpadding="5">
      <tr>
        <td width="50%">
          <img src="${data.designImage}" width="250"/>
        </td>
        <td width="50%">
          <table width="100%" border="1" cellspacing="0" cellpadding="5" width="250">
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
    </body>
    </html>
    `;

  // Set HTML content
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Generate PDF
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

  await browser.close();
  return pdfBuffer;
}
