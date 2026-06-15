import { PDFDocument, rgb } from "pdf-lib";
import { DemoFile, SignatureSlot } from "./types";

type StampOptions = {
  displayName: string;
  signedAt: string;
  slot: SignatureSlot;
  signatureImage?: string;
};

const SLOT_PLACEHOLDER: Record<SignatureSlot, string> = {
  submitter: "{{SIGN_HRO}}",
  accountant: "{{SIGN_ACCOUNTANT}}",
  chief_accountant: "{{SIGN_CHIEF_ACCOUNTANT}}",
  cfo: "{{SIGN_CFO}}",
};

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh chữ ký."));
    image.src = src;
  });
}

async function createStamp(options: StampOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo chữ ký.");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.strokeStyle = "#1d4ed8";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(5, 5, 630, 290, 18);
  context.fill();
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#1d4ed8";
  context.font = "700 27px Arial";
  context.fillText("✓  ĐÃ KÝ SỐ", 320, 40);

  if (options.signatureImage) {
    const image = await loadImage(options.signatureImage);
    const ratio = Math.min(410 / image.width, 125 / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    context.drawImage(image, (640 - width) / 2, 48, width, height);
  } else {
    context.fillStyle = "#0f172a";
    context.font = "italic 700 46px Georgia";
    context.fillText(options.displayName, 320, 145);
  }

  context.fillStyle = "#0f172a";
  context.font = "700 27px Arial";
  context.fillText(options.displayName, 320, 218);
  context.fillStyle = "#334155";
  context.font = "21px Arial";
  context.fillText(`Ký ngày ${new Date(options.signedAt).toLocaleString("vi-VN")}`, 320, 258);

  return dataUrlToBytes(canvas.toDataURL("image/png"));
}

type TextFragment = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextBox = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

async function findTextBoxes(pdfBytes: Uint8Array, searchText: string): Promise<TextBox[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const source = new Uint8Array(pdfBytes);
  const document = await pdfjs.getDocument({ data: source }).promise;
  const boxes: TextBox[] = [];

  for (let pageIndex = 0; pageIndex < document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const fragments: TextFragment[] = content.items
      .filter((item): item is typeof item & { str: string; transform: number[]; width: number; height: number } => "str" in item)
      .map((item) => {
        const transform = pdfjs.Util.transform(viewport.transform, item.transform);
        return {
          text: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width,
          height: Math.max(item.height, Math.abs(transform[3]), 8),
        };
      });

    const lines = new Map<number, TextFragment[]>();
    for (const fragment of fragments) {
      const lineKey = Math.round(fragment.y / 3) * 3;
      lines.set(lineKey, [...(lines.get(lineKey) || []), fragment]);
    }

    for (const line of lines.values()) {
      const ordered = line.sort((left, right) => left.x - right.x);
      const joined = ordered.map((fragment) => fragment.text).join("");
      let markerStart = joined.indexOf(searchText);

      while (markerStart >= 0) {
        const markerEnd = markerStart + searchText.length;
        let cursor = 0;
        const matched = ordered.filter((fragment) => {
          const start = cursor;
          cursor += fragment.text.length;
          return cursor > markerStart && start < markerEnd;
        });

        if (matched.length > 0) {
          const left = Math.min(...matched.map((fragment) => fragment.x));
          const right = Math.max(...matched.map((fragment) => fragment.x + fragment.width));
          const top = Math.min(...matched.map((fragment) => fragment.y - fragment.height));
          const bottom = Math.max(...matched.map((fragment) => fragment.y));

          boxes.push({
            pageIndex,
            x: left,
            y: viewport.height - bottom,
            width: right - left,
            height: bottom - top,
          });
        }

        markerStart = joined.indexOf(searchText, markerEnd);
      }
    }
  }

  return boxes;
}

export async function stampPdf(file: DemoFile, options: StampOptions) {
  if (!file.dataUrl) throw new Error(`File ${file.name} không có dữ liệu.`);

  const pdfBytes = dataUrlToBytes(file.dataUrl);
  const placeholder = SLOT_PLACEHOLDER[options.slot];
  const [placeholderBox] = await findTextBoxes(pdfBytes, placeholder);
  if (!placeholderBox) {
    throw new Error(`Không tìm thấy trường ${placeholder} trong file ${file.name}.`);
  }
  const instructionBoxes = options.slot === "submitter"
    ? await findTextBoxes(pdfBytes, "(Ký và ghi rõ họ tên)")
    : [];

  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const page = pages[placeholderBox.pageIndex];
  if (!page) throw new Error(`Không tìm thấy trang chứa trường ${placeholder}.`);

  const erasePadding = 3;
  page.drawRectangle({
    x: placeholderBox.x - erasePadding,
    y: placeholderBox.y - erasePadding,
    width: placeholderBox.width + (erasePadding * 2),
    height: placeholderBox.height + (erasePadding * 2),
    color: rgb(1, 1, 1),
  });

  for (const instructionBox of instructionBoxes) {
    const instructionPage = pages[instructionBox.pageIndex];
    if (!instructionPage) continue;
    instructionPage.drawRectangle({
      x: instructionBox.x - 5,
      y: instructionBox.y - 4,
      width: instructionBox.width + 10,
      height: instructionBox.height + 8,
      color: rgb(1, 1, 1),
    });
  }

  const stamp = await pdf.embedPng(await createStamp(options));
  const stampWidth = Math.min(page.getWidth() * 0.19, 135);
  const stampHeight = stampWidth * (300 / 640);
  const centerX = placeholderBox.x + (placeholderBox.width / 2);
  const stampTop = placeholderBox.y + placeholderBox.height - 2;

  page.drawImage(stamp, {
    x: centerX - (stampWidth / 2),
    y: Math.max(8, stampTop - stampHeight),
    width: stampWidth,
    height: stampHeight,
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể lưu PDF đã ký."));
    reader.readAsDataURL(blob);
  });

  return {
    ...file,
    dataUrl,
    originalDataUrl: file.originalDataUrl || file.dataUrl,
    size: bytes.length,
  };
}
