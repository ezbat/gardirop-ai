// lib/removeBackground.ts
// Mediapipe'ı dynamic import ile yükle (SSR bypass)

export async function removeBackground(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Browser check
      if (typeof window === 'undefined') {
        return reject(new Error('Bu fonksiyon sadece browser\'da çalışır'));
      }

      // Mediapipe'ı dynamic import ile yükle
      const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation');

      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = async () => {
        try {
          // Canvas boyutunu ayarla (performans için max 512px)
          const canvas = document.createElement('canvas');
          const maxSize = 512;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context alınamadı'));
          }
          
          // Orijinal resmi çiz
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Mediapipe SelfieSegmentation başlat
          const segmentation = new SelfieSegmentation({
            locateFile: (file) => 
              `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
          });
          
          // Yüksek kalite mod (1 = daha iyi, 0 = daha hızlı)
          segmentation.setOptions({ 
            modelSelection: 1,
            selfieMode: false // Ayna efekti kapalı
          });
          
          // Model yüklenene kadar bekle
          await segmentation.initialize();
          
          // Segmentasyon için callback tanımla
          let segmentationComplete = false;
          
          segmentation.onResults((results: any) => {
            if (segmentationComplete) return;
            segmentationComplete = true;
            
            try {
              // Mask yoksa orijinal resmi dön
              if (!results || !results.segmentationMask) {
                console.warn('Segmentasyon maskesi alınamadı, orijinal resim döndürülüyor');
                segmentation.close();
                return resolve(canvas.toDataURL('image/png'));
              }
              
              // Yeni bir canvas oluştur (output için)
              const outputCanvas = document.createElement('canvas');
              outputCanvas.width = canvas.width;
              outputCanvas.height = canvas.height;
              const outputCtx = outputCanvas.getContext('2d');
              
              if (!outputCtx) {
                segmentation.close();
                return reject(new Error('Output context alınamadı'));
              }
              
              // Orijinal resmi al
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const pixels = imageData.data;
              
              // Mask'ı canvas'a çiz ve pixel verilerini al
              const maskCanvas = document.createElement('canvas');
              maskCanvas.width = canvas.width;
              maskCanvas.height = canvas.height;
              const maskCtx = maskCanvas.getContext('2d');
              
              if (!maskCtx) {
                segmentation.close();
                return reject(new Error('Mask context alınamadı'));
              }
              
              // Mask'ı canvas'a çiz
              maskCtx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
              const maskImageData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
              const maskPixels = maskImageData.data;
              
              // Arka planı transparent yap (alpha kanalını ayarla)
             // Arka planı transparent yap (alpha kanalını ayarla)
for (let i = 0; i < pixels.length; i += 4) {
  const maskValue = maskPixels[i]; // 0-255 arası
  
  // Daha yumuşak threshold: 100 yerine 50 kullan
  if (maskValue < 50) {
    // Kesinlikle arka plan
    pixels[i + 3] = 0; 
  } else if (maskValue < 150) {
    // Belirsiz bölge - hafif transparan yap
    pixels[i + 3] = Math.min(255, maskValue * 1.7);
  } else {
    // Kesinlikle ön plan - tut
    pixels[i + 3] = 255;
  }
}
              
              // Düzenlenmiş image data'yı output canvas'a çiz
              outputCtx.putImageData(imageData, 0, 0);
              
              // Temizlik
              segmentation.close();
              URL.revokeObjectURL(img.src);
              
              // Base64 olarak döndür
              resolve(outputCanvas.toDataURL('image/png'));
              
            } catch (error) {
              segmentation.close();
              reject(error);
            }
          });
          
          // Görüntüyü Mediapipe'a gönder
          await segmentation.send({ image: canvas });
          
        } catch (error) {
          console.error('Background removal error:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Görüntü yüklenemedi'));
      };

    } catch (error) {
      console.error('Mediapipe import error:', error);
      reject(error);
    }
  });
}

// Yardımcı fonksiyon: Resim boyutunu kontrol et
export function validateImageSize(file: File): boolean {
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSizeInBytes;
}

// Yardımcı fonksiyon: Resim tipini kontrol et
export function validateImageType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowedTypes.includes(file.type);
}