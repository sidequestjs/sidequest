import path from 'path';

const configPath = `${path.resolve('./')}/sidequest-config.json`;

let config: any;

export default async function loadConfig() {
  config ||= await import(configPath);
  return config.default;
}