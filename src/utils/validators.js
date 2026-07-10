export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  return /^\d{10}$/.test(String(phone).replace(/\D/g, ''));
}

export function sanitizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}