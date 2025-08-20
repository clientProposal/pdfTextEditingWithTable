import WebViewer from '@pdftron/webviewer';
import jsonTestData from '../jsonTestData.json';
const app = document.getElementById('app');


const initialDoc = 'https://apryse.s3.us-west-1.amazonaws.com/public/files/samples/pdf_text_editing_walkthrough.pdf';

const disabledElements = [
  'toolbarGroup-View',
  'toolbarGroup-Annotate',
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
        const data = [
          ['Name', 'Value1', 'Value2', 'Value3', 'Value4'],
          ['Alice', '10', '20', '39', '1'],
          ['Bob', '30', '40', '34', '2'],
          ['Jim', '10', '20', '23', '3'],
          ['David', '30', '40', '22', '3']
        ];
        const headers = Object.keys(jsonTestData[0]);
        const startX = 50, startY = 200, cellWidth = 100, cellHeight = 30;
          for (let row = 0; row < jsonTestData.length; row++) {
          for (let col = 0; col < headers.length; col++) {
            const key = headers[col];
            const value = typeof jsonTestData[row][key] === "string" ? jsonTestData[row][key] : jsonTestData[row][key].toString();
            const x = startX + col * cellWidth;
            const y = startY - row * cellHeight;
            const builder = await PDFNet.ElementBuilder.create();
            const writer = await PDFNet.ElementWriter.create();
            writer.beginOnPage(page);
            const rect = await builder.createRect(x, y, cellWidth, -cellHeight);
            rect.setPathFill(false);
            rect.setPathStroke(true);
            writer.writeElement(rect);
            const font = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica);
            const text = await builder.createTextBegin(font, 12);
            writer.writeElement(text);
            const textElement = await builder.createTextRun(value,font, 12);
            textElement.setTextMatrixEntries(1, 0, 0, 1, x + 5, y - cellHeight + 20);
            writer.writeElement(textElement);
            writer.writeElement(await builder.createTextEnd());
            writer.end();
          }}
        await doc.unlock();
        documentViewer.refreshAll();
        documentViewer.updateView();
      });
    });
  });