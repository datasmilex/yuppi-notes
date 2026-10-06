export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Bilinmiyor';
  
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 30) {
    return 'Az önce';
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sn önce`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dk önce`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    const d = new Date(timestamp);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `Dün ${hours}:${mins}`;
  }
  if (diffInDays < 7) {
    return `${diffInDays} gün önce`;
  }

  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
