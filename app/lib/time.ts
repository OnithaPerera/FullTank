export function getRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "No data";
  
  const now = new Date();
  const updated = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - updated.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}