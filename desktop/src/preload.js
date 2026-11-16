const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('inventarioTI', {
  executarColeta: () =>
    ipcRenderer.invoke('inventario:executar-coleta'),

  verificarApi: () =>
    ipcRenderer.invoke('inventario:verificar-api'),

  verificarCredencial: () =>
    ipcRenderer.invoke('inventario:status-credencial'),

  salvarCredencial: configuracao =>
    ipcRenderer.invoke('inventario:salvar-credencial', configuracao),
});
