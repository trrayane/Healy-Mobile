// ─────────────────────────────────────────────────────────────────────────────
// src/config.js — Configuration de l'environnement
//
// ⚠️  SEUL FICHIER À MODIFIER quand tu changes de WiFi !
//
// Comment trouver ton IP locale :
//   Windows  →  ipconfig        (cherche "Adresse IPv4")
//   Mac/Linux →  ifconfig | grep inet
//
// Exemple :  API_IP = '192.168.1.42'   (juste l'IP, sans http ni port)
// ─────────────────────────────────────────────────────────────────────────────

export const API_IP   = '172.20.10.7';    // ← Change cette valeur uniquement
export const API_PORT = '8000';

export const API_BASE_URL = `http://${API_IP}:${API_PORT}/api`;
