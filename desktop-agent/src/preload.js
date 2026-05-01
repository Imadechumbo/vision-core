/**
 * Vision Agent Desktop — Preload (Context Bridge)
 * Expõe API segura para o renderer sem nodeIntegration
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('visionAgent', {
  // Config
  getConfig:        ()           => ipcRenderer.invoke('get-config'),
  saveConfig:       (cfg)        => ipcRenderer.invoke('save-config', cfg),

  // Mission
  startMission:     (text)       => ipcRenderer.invoke('start-mission', text),
  stopMission:      ()           => ipcRenderer.invoke('stop-mission'),

  // Fetch (via main process — sem CORS)
  fetchApi:         (opts)       => ipcRenderer.invoke('fetch-api', opts),

  // Utils
  openExternal:     (url)        => ipcRenderer.invoke('open-external', url),
  showNotification: (opts)       => ipcRenderer.invoke('show-notification', opts),

  // Events (renderer recebe do main)
  onSseEvent:       (cb)         => ipcRenderer.on('sse-event', (_, data) => cb(data)),
  onMissionDone:    (cb)         => ipcRenderer.on('mission-done', (_, data) => cb(data)),
  onUpdateAvailable:(cb)         => ipcRenderer.on('update-available', (_, data) => cb(data)),
  onNavigate:       (cb)         => ipcRenderer.on('navigate', (_, page) => cb(page)),

  // Remove listeners
  removeAllListeners: (channel)  => ipcRenderer.removeAllListeners(channel),
});
