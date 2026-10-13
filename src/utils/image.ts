/** Görseli en fazla 1200px'e küçültüp JPEG data URL'e çevirir (IndexedDB ve canlı eşitleme hafif kalsın). */
export function compressImage(file: Blob, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel açılamadı'));
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas desteklenmiyor'));
          return;
        }
        // PNG saydamlığı JPEG'e çevrilince siyah kalmasın
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressImages(files: Blob[]): Promise<{ images: string[]; failed: number }> {
  const results = await Promise.allSettled(files.map((f) => compressImage(f)));
  const images = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  return { images, failed: files.length - images.length };
}

export function imageFilesFrom(list: FileList | DataTransferItemList | null | undefined): File[] {
  if (!list) return [];
  const files: File[] = [];
  Array.from(list as ArrayLike<File | DataTransferItem>).forEach((item) => {
    if (item instanceof File) {
      if (item.type.startsWith('image/')) files.push(item);
    } else if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  });
  return files;
}
