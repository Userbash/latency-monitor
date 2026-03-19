"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    windowControl: (command) => electron_1.ipcRenderer.send('window-controls', command),
    startNetworkTest: (profile) => electron_1.ipcRenderer.send('start-network-test', profile),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    captureScreenshot: () => electron_1.ipcRenderer.invoke('capture-screenshot'),
    onTestProgress: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('test-progress', subscription);
        return () => electron_1.ipcRenderer.removeListener('test-progress', subscription);
    },
    onTestComplete: (callback) => {
        const subscription = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('test-complete', subscription);
        return () => electron_1.ipcRenderer.removeListener('test-complete', subscription);
    },
    onTestError: (callback) => {
        const subscription = (_event, message) => callback(message);
        electron_1.ipcRenderer.on('test-error', subscription);
        return () => electron_1.ipcRenderer.removeListener('test-error', subscription);
    },
});
