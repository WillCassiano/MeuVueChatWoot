<template>
  <div class="sidebar">
    <header class="header">
      <div>
        <h3>Integração • ControleWeb</h3>
        <div class="meta">
          Conversa: <strong>{{ conversationId || '—' }}</strong> • Status:
          {{ conversationStatus || '—' }}
        </div>
      </div>
      <div class="actions">
        <button @click="exportConversation" :disabled="!hasMessages">Exportar (.json)</button>
        <button @click="linkToTicket" :disabled="!hasMessages">Vincular a chamado</button>
      </div>
    </header>

    <section class="contact-card" v-if="contact">
      <div class="contact-name">{{ contact.name || 'Contato desconhecido' }}</div>
      <div class="contact-info">
        {{ contact.email || contact.phone || contact.identifier || '' }}
      </div>
    </section>

    <section class="messages">
      <div v-if="!hasMessages" class="empty">Nenhuma mensagem recebida</div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="['message', m.from === 'Cliente' ? 'from-contact' : 'from-agent']"
      >
        <div class="msg-header">
          <strong>{{ m.from }}</strong> • <small>{{ m.time }}</small>
        </div>
        <div class="msg-body" v-html="escapeAndNl(m.text)"></div>
      </div>
    </section>

    <footer class="preview">
      <div><strong>Preview JSON (modelo B)</strong></div>
      <pre class="json">{{ previewJson }}</pre>
    </footer>
  </div>
</template>

<script>
import ChatwootBridge from '@/services/chatwoot-bridge'

export default {
  name: 'ChatwootSidebar',
  data() {
    return {
      conversationId: null,
      conversationStatus: null,
      contact: null,
      messages: [],
    }
  },
  computed: {
    hasMessages() {
      return this.messages && this.messages.length > 0
    },
    previewJson() {
      return JSON.stringify(this.buildModelB(), null, 2)
    },
  },
  methods: {
    escapeAndNl(text) {
      if (!text) return ''
      const esc = text
        .toString()
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      return esc.replace(/\n/g, '<br>')
    },

    normalizePayload(payload) {
      // tenta extrair dados em diferentes formatos
      const data = payload?.data || payload?.payload || payload
      const conv = data?.conversation || data?.meta?.conversation || null
      const cid = conv?.id || data?.id || data?.conversation_id || null
      const status = conv?.status || data?.status || null
      const contactInfo = data?.contact || data?.contact_inbox || data?.customer || null
      const msgs =
        data?.messages ||
        data?.messages_payload ||
        data?.payload?.messages ||
        data?.conversation?.messages ||
        []

      return { cid, status, contactInfo, msgs }
    },

    applyPayload(payload) {
      const { cid, status, contactInfo, msgs } = this.normalizePayload(payload)

      if (cid) this.conversationId = cid
      if (status) this.conversationStatus = status
      if (contactInfo) {
        this.contact = {
          name: contactInfo.name || contactInfo.identifier || contactInfo.email || 'Desconhecido',
          email: contactInfo.email,
          phone: contactInfo.phone,
          identifier: contactInfo.identifier,
        }
      }

      if (Array.isArray(msgs) && msgs.length) {
        // Converte mensagens para formato B: {from, text, time}
        this.messages = msgs.map((m) => {
          const text =
            m.content ?? m.message ?? m.body ?? (m.payload ? JSON.stringify(m.payload) : '')
          const from =
            m.sender_type && m.sender_type.toLowerCase() === 'contact'
              ? 'Cliente'
              : m.sender_type && m.sender_type.toLowerCase() === 'agent'
                ? 'Atendente'
                : m.from
                  ? m.from
                  : 'Atendente'
          const time = m.created_at ?? m.sent_at ?? m.time ?? ''
          return { from, text, time }
        })
      } else if (payload?.message) {
        // Evento de nova mensagem (adiciona)
        const m = payload.message
        const text = m.content ?? m.message ?? m.body ?? ''
        const from = m.sender_type === 'contact' ? 'Cliente' : 'Atendente'
        const time = m.created_at ?? m.sent_at ?? m.time ?? ''
        this.messages.push({ from, text, time })
      }
    },

    buildModelB() {
      return {
        id: this.conversationId,
        customer: this.contact?.name ?? 'Desconhecido',
        messages: this.messages.map((m) => ({ from: m.from, text: m.text, time: m.time })),
      }
    },

    exportConversation() {
      const filename = `chatwoot_conversation_${this.conversationId || 'unknown'}.json`
      ChatwootBridge.downloadJson(filename, this.buildModelB())
    },

    async linkToTicket() {
      // Exemplo: chamar sua API para criar/atualizar um chamado
      // const resp = await fetch('https://sua.api/chamados', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
      //   body: JSON.stringify(this.buildModelB())
      // });
      // trata resp...
      alert('Aqui você chamaria sua API para vincular ao chamado (exemplo comentado).')
    },
  },
  mounted() {
    ChatwootBridge.init((payload) => {
      // Chatwoot envia vários eventos, nós aceitamos todos e tentamos normalizar
      this.applyPayload(payload)
    })

    // Envia um "ready" também pelo parent (dupla camada)
    try {
      window.parent.postMessage({ event: 'sidebar.ready' }, '*')
    } catch {
      // ignorado
    }
  },
}
</script>

<style scoped>
.sidebar {
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: Arial, sans-serif;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.header .meta {
  font-size: 12px;
  color: #666;
}
.actions button {
  margin-left: 8px;
}
.contact-card {
  border: 1px solid #eee;
  padding: 8px;
  border-radius: 6px;
  margin: 10px 0;
  background: #fafafa;
}
.messages {
  overflow: auto;
  flex: 1;
  padding-right: 6px;
}
.message {
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 8px;
  max-width: 95%;
}
.from-contact {
  background: #f5f5f5;
  align-self: flex-start;
}
.from-agent {
  background: #e8f5ff;
  align-self: flex-end;
}
.msg-header {
  font-size: 12px;
  color: #333;
  margin-bottom: 6px;
}
.preview {
  margin-top: 8px;
  font-size: 13px;
  color: #333;
}
.json {
  max-height: 200px;
  overflow: auto;
  background: #fff;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #eee;
}
.empty {
  color: #777;
  padding: 10px;
}
</style>
