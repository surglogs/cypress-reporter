const chalk = require('chalk')

module.exports = {
  debug: (...args: any[]) => {
    if (process.env.DEBUG) {
      console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
      console.log('\n', ...args, '\n')
    }
  },
  log: (...args: any[]) => {
    console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
    console.log('\n', ...args, '\n')
  },
  warn: (...args: any[]) => {
    console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'))
    console.warn('\n', ...args, '\n')
  },
}
