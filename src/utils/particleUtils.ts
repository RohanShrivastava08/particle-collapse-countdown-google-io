export const getNumberPoints = (content: string | number, count: number, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = 512;
  canvas.height = 512;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'white';
  const text = content.toString();
  const fontSize = text.length > 2 ? 180 : 380;
  ctx.font = `900 ${fontSize}px "Inter", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.lineWidth = 15;
  ctx.strokeStyle = 'white';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const points: { x: number, y: number }[] = [];

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const idx = (y * canvas.width + x) * 4;
      if (data[idx] > 180) {
        points.push({
          x: (x / canvas.width - 0.5) * width,
          y: (0.5 - y / canvas.height) * height
        });
      }
    }
  }

  if (points.length === 0) {
    for (let i = 0; i < count; i++) {
      points.push({ x: (Math.random() - 0.5) * width, y: (Math.random() - 0.5) * height });
    }
  }

  const finalPoints = [];
  for (let i = 0; i < count; i++) {
    finalPoints.push(points[Math.floor(Math.random() * points.length)]);
  }

  return finalPoints;
};
