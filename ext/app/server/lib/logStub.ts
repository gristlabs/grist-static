const origLog = function(...args: any[]) {
}

export = {
  log() {},
  info(...args: any[]) { console.log(args); },
  warn(...args: any[]) { console.log(args); },
  error(...args: any[]) { console.log(args); },
  debug(...args: any[]) { console.log(args); },
  rawInfo(...args: any[]) { console.log(args); },
  rawWarn(...args: any[]) { console.log(args); },
  rawError(...args: any[]) { console.log(args); },
  rawDebug(...args: any[]) { console.log(args); },
  origLog,
};
