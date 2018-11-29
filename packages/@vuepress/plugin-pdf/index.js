module.exports = {
  registerCommand (cli) {
    cli
      .command('export-pdf [targetDir]', '')
      .option('--debug', 'eject in debug mode')
      .action((dir = '.') => {
        console.log('export-pdf')
      })
  }
}
