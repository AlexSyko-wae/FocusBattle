export function validateLogin(email: string, password: string, register = false): string | null {
  if (!email.trim()) return 'Escribe el correo de tu cuenta de Android.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (!password) return 'Escribe tu contraseña.';
  if (register && password.length < 8) return 'Para registrarte usa una contraseña de al menos 8 caracteres.';
  return null;
}
