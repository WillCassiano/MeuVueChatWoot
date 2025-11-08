<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const logs = ref([])
const currentConversation = ref(null)

function addLog(msg) {
  logs.value.push({
    timestamp: new Date().toLocaleTimeString(),
    msg,
  })
}

// Valida se o conteúdo é JSON
function isJSONValid(str) {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

// Escutar eventos do Chatwoot
function handleMessage(event) {
  if (!isJSONValid(event.data)) return

  const data = JSON.parse(event.data)

  addLog(`Evento recebido: ${data.event || 'sem event'} → ${JSON.stringify(data)}`)

  // Detecta evento de conversa aberta/alterada
  if (data.event === 'conversation_opened' || data.event === 'conversation_changed') {
    currentConversation.value = data.data
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)

  // Avisar ao Chatwoot que o sidebar está pronto
  window.parent.postMessage({ event: 'sidebar.ready' }, '*')

  // Solicita informações do Chatwoot (evento novo)
  window.parent.postMessage('chatwoot-dashboard-app:fetch-info', '*')

  addLog('Sidebar carregado e aguardando eventos...')
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div style="padding: 12px; font-family: sans-serif">
    <h3>📨 Eventos do Chatwoot</h3>
    <div v-if="currentConversation">
      <p><strong>Conversa Atual:</strong></p>
      <pre>{{ currentConversation }}</pre>
    </div>

    <h4>Logs:</h4>
    <pre style="height: 200px; overflow: auto; padding: 8px; font-size: 12px"
      >{{ logs.map((l) => `${l.timestamp} - ${l.msg}`).join('\n') }}
</pre
    >
  </div>
</template>
