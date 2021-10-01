const chalk = require('chalk')

const TestRailLogger = {
  debug: (...args: any[]) => {
    if (process.env.DEBUG) {
      console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
      console.log('\n', ...args, '\n')
    }
  },
  log: (text) => {
    console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
    console.log('\n', ' - ' + text, '\n')
  },
  warn: (text) => {
    console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
    console.warn('\n', ' - ' + text, '\n')
  },
}

module.exports = TestRailLogger
