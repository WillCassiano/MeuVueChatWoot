// src/services/chatwoot-bridge.js
export default {
  init(onPayload) {
    if (this._initialized) return;
    this._initialized = true;

    // envia ready para o parent (Chatwoot)
    try {
      window.parent.postMessage({ event: 'chatwoot-dashboard-app:fetch-info' }, '*');
    } catch {
      //ignorado
    }

    window.addEventListener('message', (ev) => {
      if (!ev?.data) return;
      // Passa toda a payload ao callback para normalizar no Vue
      onPayload(ev.data);
    }, false);

    // tenta ajustar altura periodicamente
    const sendHeight = () => {
      try {
        const h = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.parent.postMessage({ event: 'sidebar.resize', height: h }, '*');
      } catch {
        // ignorado
      }
    };

    // envia altura inicial e a cada 500ms por alguns segundos
    sendHeight();
    let tries = 0;
    const iv = setInterval(() => {
      sendHeight();
      tries++;
      if (tries > 10) clearInterval(iv);
    }, 500);
  },

  // utilitário para download de JSON
  downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};
