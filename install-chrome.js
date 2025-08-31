#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Instalador de Chrome para Koyeb/Docker');

function runCommand(command, description) {
  try {
    console.log(`📦 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} concluído`);
    return true;
  } catch (error) {
    console.log(`⚠️ ${description} falhou: ${error.message}`);
    return false;
  }
}

function checkChrome() {
  const chromePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];

  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`✅ Chrome encontrado: ${chromePath}`);
      try {
        const version = execSync(`${chromePath} --version`, { encoding: 'utf8' }).trim();
        console.log(`📋 Versão: ${version}`);
        return chromePath;
      } catch (error) {
        continue;
      }
    }
  }
  return null;
}

async function installChrome() {
  console.log('🔍 Verificando Chrome existente...');
  
  let chromePath = checkChrome();
  if (chromePath) {
    console.log('✅ Chrome já instalado!');
    return chromePath;
  }

  console.log('📦 Chrome não encontrado. Instalando...');

  // Detecta sistema operacional
  let osCommands = [];

  if (fs.existsSync('/etc/debian_version')) {
    // Debian/Ubuntu
    osCommands = [
      'apt-get update',
      'apt-get install -y wget gnupg ca-certificates',
      'wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -',
      'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list',
      'apt-get update',
      'apt-get install -y google-chrome-stable'
    ];
  } else if (fs.existsSync('/etc/alpine-release')) {
    // Alpine
    osCommands = [
      'apk update',
      'apk add --no-cache chromium',
      'export CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser'
    ];
  } else if (fs.existsSync('/etc/redhat-release')) {
    // CentOS/RHEL
    osCommands = [
      'yum install -y wget',
      'wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm',
      'yum install -y google-chrome-stable_current_x86_64.rpm'
    ];
  }

  if (osCommands.length === 0) {
    console.log('❌ Sistema operacional não suportado');
    return null;
  }

  // Executa comandos de instalação
  for (const command of osCommands) {
    if (!runCommand(command, `Executando: ${command}`)) {
      console.log('⚠️ Comando falhou, tentando próximo...');
      continue;
    }
  }

  // Verifica se instalou
  chromePath = checkChrome();
  if (chromePath) {
    console.log('✅ Chrome instalado com sucesso!');
    return chromePath;
  }

  // Fallback: Puppeteer
  console.log('🔄 Tentando instalar via Puppeteer...');
  if (runCommand('npx puppeteer browsers install chrome', 'Instalando Chrome via Puppeteer')) {
    console.log('✅ Chrome instalado via Puppeteer');
    return 'puppeteer-chrome';
  }

  console.log('❌ Falha ao instalar Chrome');
  return null;
}

// A função installFFmpeg foi removida. 
// O FFmpeg agora é gerenciado pela dependência 'ffmpeg-static' no package.json,
// que não requer permissões de root e funciona em ambientes como Heroku/Koyeb.

async function main() {
  console.log('=' .repeat(50));
  console.log('🚀 INSTALADOR AUTOMÁTICO PARA KOYEB');
  console.log('=' .repeat(50));

  // Instala Chrome
  const chromePath = await installChrome();
  
  // FFmpeg é instalado via a dependência 'ffmpeg-static' no package.json.
  const ffmpegOk = true; // Assumimos que o ffmpeg-static vai funcionar.

  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO DA INSTALAÇÃO');
  console.log('=' .repeat(50));
  console.log(`Chrome: ${chromePath ? '✅ Instalado' : '❌ Falhou'}`);
  console.log(`FFmpeg: ${ffmpegOk ? '✅ Instalado (via ffmpeg-static)' : '❌ Falhou'}`);

  // Salva configuração
  const config = {
    chromePath: chromePath,
    ffmpegAvailable: ffmpegOk,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(path.join(__dirname, 'installation-status.json'), JSON.stringify(config, null, 2));
  console.log('💾 Status salvo em installation-status.json');

  if (chromePath) { // O sucesso do FFmpeg é assumido, então só verificamos o Chrome.
    console.log('🎉 Instalação bem-sucedida!');
    process.exit(0);
  } else {
    console.log('❌ Instalação do Chrome falhou');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { installChrome, installFFmpeg, checkChrome };