const JavaScriptObfuscator = require("javascript-obfuscator");
const options = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  renameGlobals: true,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: "base64",
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
};

const fs = require("fs");
const filePath = "./public/assets/js/pay.js";
const code = fs.readFileSync(filePath, "utf-8");

const obfuscatedCode = JavaScriptObfuscator.obfuscate(
  code,
  options
).getObfuscatedCode();

const obfuscatedFilePath = "p./public/assets/js/pay.js";
fs.writeFileSync(obfuscatedFilePath, obfuscatedCode);
