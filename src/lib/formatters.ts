export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(price);
};

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'agora';
  } else if (diffMinutes < 60) {
    return `Há ${diffMinutes}min`;
  } else if (diffHours < 24) {
    return `Há ${diffHours}h`;
  } else if (diffDays < 7) {
    return `Há ${diffDays}d`;
  } else {
    return date.toLocaleDateString('pt-BR');
  }
};
