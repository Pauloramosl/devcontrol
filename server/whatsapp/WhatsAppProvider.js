export class WhatsAppProvider {
  connect() {
    throw new Error('connect() must be implemented by a WhatsApp provider.')
  }

  disconnect() {
    throw new Error('disconnect() must be implemented by a WhatsApp provider.')
  }

  getConnectionStatus() {
    throw new Error('getConnectionStatus() must be implemented by a WhatsApp provider.')
  }

  sendMessage() {
    throw new Error('sendMessage() must be implemented by a WhatsApp provider.')
  }

  onMessage() {
    throw new Error('onMessage() must be implemented by a WhatsApp provider.')
  }

  onQrCode() {
    throw new Error('onQrCode() must be implemented by a WhatsApp provider.')
  }
}
