import "./toast.css";

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Muestra un mensaje toast temporal
 * @param {string} message - El mensaje a mostrar
 * @param {object} options - Opciones de configuración
 * @param {number} options.duration - Duración en ms (default: 3500)
 * @param {string} options.type - Tipo: 'info', 'warning', 'error', 'success' (default: 'info')
 */
export function showToast(message, { duration = 3500, type = 'info' } = {}) {
  const container = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = getIcon(type);
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("toast-show"), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getIcon(type) {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };
  return icons[type] || icons.info;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
