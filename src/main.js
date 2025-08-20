import WebViewer from '@pdftron/webviewer';
import jsonTestData from '../jsonTestData.json';
const app = document.getElementById('app');


const initialDoc = 'https://apryse.s3.us-west-1.amazonaws.com/public/files/samples/pdf_text_editing_walkthrough.pdf';

const disabledElements = [
  'toolbarGroup-View',
  'toolbarGroup-Shapes',
  'toolbarGroup-Redact',
  'toolbarGroup-Insert',
  'toolbarGroup-FillAndSign',
  'toolbarGroup-Forms',
  'toolbarGroup-Measure',
  'cropToolGroupButton',
];

const EnabledElements = [
  'toolbarGroup-EditText',
  'addParagraphToolGroupButton',
  'addImageContentToolGroupButton',
  'searchAndReplace',
];


const customizeUI = (instance) => {
  const { UI } = instance;

  UI.enableFeatures([UI.Feature.ContentEdit]);

  UI.disableElements(disabledElements);
  UI.enableElements(EnabledElements);

  UI.setToolbarGroup('toolbarGroup-EditText');



  const resetButton = new UI.Components.CustomButton({
    dataElement: 'resetButton',
    className: 'custom-button-class',
    label: 'Reset Walkthrough',
    onClick: () => UI.loadDocument(initialDoc),
    style: {
      backgroundColor: 'white',
      color: 'blue',
      border: '1px solid blue',
    }
  });

  const downloadButton = new UI.Components.CustomButton({
    dataElement: 'downloadPdfButton',
    className: 'custom-button-class',
    label: 'Download as PDF',
    onClick: () => downloadPdf(instance),
    style: {
      backgroundColor: 'blue',
      color: 'white',
    }
  });

  const defaultHeader = UI.getModularHeader('default-top-header');
  defaultHeader.setItems([...defaultHeader.items, resetButton, downloadButton]);
};

const downloadPdf = async (instance) => {
  const options = {
    flags: instance.Core.SaveOptions.LINEARIZED,
    downloadType: 'pdf'
  };

  instance.UI.downloadPdf(options);
};



WebViewer({
  path: '/webviewer',
  initialDoc: '/pdf_text_editing_walkthrough.pdf',
  enableFilePicker: true,
  licenseKey: import.meta.env.VITE_PDFTRONKEY,
  fullAPI: true
}, app)
  .then(instance => {
    customizeUI(instance);
    const { documentViewer, PDFNet } = instance.Core;

    documentViewer.addEventListener('documentLoaded', async () => {
      await PDFNet.runWithCleanup(async () => {
        const doc = await documentViewer.getDocument().getPDFDoc();
        doc.lock();
        const page = await doc.getPage(2);
        const toHighlight = [];
        const headers = Object.keys(jsonTestData[0]);
        const startX = 50, startY = 200, cellWidth = 100, cellHeight = 30;
        const builder = await PDFNet.ElementBuilder.create();
        const writer = await PDFNet.ElementWriter.create();
        await writer.beginOnPage(page);
        const font = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica);
        const fontBold = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica_bold);
        for (let col = 0; col < headers.length; col++) {
          const x = startX + col * cellWidth;
          const y = startY;
          const rect = await builder.createRect(x, y, cellWidth, -cellHeight);
          rect.setPathFill(false);
          rect.setPathStroke(true);
          writer.writeElement(rect);
          const text = await builder.createTextBegin(fontBold, 12);
          writer.writeElement(text);
          const textElement = await builder.createTextRun(headers[col], fontBold, 12);
          textElement.setTextMatrixEntries(1, 0, 0, 1, x + 5, y - cellHeight + 20);
          writer.writeElement(textElement);
          writer.writeElement(await builder.createTextEnd());
        }
        for (let row = 0; row < jsonTestData.length; row++) {
          for (let col = 0; col < headers.length; col++) {
            const key = headers[col];
            const value = typeof jsonTestData[row][key] === "string" ? jsonTestData[row][key] : jsonTestData[row][key].toString();
            const x = startX + col * cellWidth;
            const y = startY - row * cellHeight - 30;
            writer.beginOnPage(page);
            const rect = await builder.createRect(x, y, cellWidth, -cellHeight);
            rect.setPathFill(false);
            rect.setPathStroke(true);
            writer.writeElement(rect);
            const font = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica);
            const text = await builder.createTextBegin(font, 12);
            writer.writeElement(text);
            const textElement = await builder.createTextRun(value, font, 12);
            if (key === "Value1" && jsonTestData[row][key] > 20) {
              console.log(jsonTestData[row]["Name"]);
              toHighlight.push([x,y])
            }
            textElement.setTextMatrixEntries(1, 0, 0, 1, x + 5, y - cellHeight + 20);
            writer.writeElement(textElement);
            writer.writeElement(await builder.createTextEnd());
            writer.end();
          }
        }
        await doc.unlock();
        
        const highlightItem = (startX, startY) => {
          documentViewer.refreshAll();
          documentViewer.updateView();
          const pageHeight = documentViewer.getPageHeight(2);
          const highlightX = startX;
          const highlightY = pageHeight - startY + cellHeight;
          const highlightWidth = cellWidth;
          const highlightHeight = cellHeight;
          const highlightAnnot = new instance.Core.Annotations.RectangleAnnotation();
          highlightAnnot.PageNumber = 2; 
          highlightAnnot.X = highlightX;
          highlightAnnot.Y = highlightY - highlightHeight;
          highlightAnnot.Width = highlightWidth;
          highlightAnnot.Height = highlightHeight;
          highlightAnnot.StrokeColor = new instance.Core.Annotations.Color(255, 255, 0);
          highlightAnnot.FillColor = new instance.Core.Annotations.Color(255, 255, 0);
          highlightAnnot.Opacity = 0.3;
          instance.Core.annotationManager.addAnnotation(highlightAnnot);
          instance.Core.annotationManager.redrawAnnotation(highlightAnnot);
        } 
        toHighlight.forEach(i => {
          highlightItem(i[0], i[1]);
        });
      });
    });
  });