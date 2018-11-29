const { chalk } = require('@vuepress/shared-utils')
const semver = require('semver')

try {
  require.resolve('@vuepress/core')
} catch (err) {
  console.log(chalk.red(
    `\n[vuepress] @vuepress/cli ` +
    `requires @vuepress/core to be installed.\n`
  ))
  process.exit(1)
}

const pkg = require('@vuepress/core/package.json')
const requiredVersion = pkg.engines.node

if (!semver.satisfies(process.version, requiredVersion)) {
  console.log(chalk.red(
    `\n[vuepress] minimum Node version not met:` +
    `\nYou are using Node ${process.version}, but VuePress ` +
    `requires Node ${requiredVersion}.\nPlease upgrade your Node version.\n`
  ))
  process.exit(1)
}

const cli = require('cac')()

exports.cli = cli
exports.bootstrap = async function ({
  plugins,
  theme
} = {}) {
  const { path, logger, env } = require('@vuepress/shared-utils')
  const { dev, build, eject, unknownCommand } = require('@vuepress/core')

  cli
    .command('dev [targetDir]', 'start development server')
    .option('-p, --port <port>', 'use specified port (default: 8080)')
    .option('-t, --temp <temp>', 'set the directory of the temporary file')
    .option('-c, --cache [cache]', 'set the directory of cache')
    .option('--host <host>', 'use specified host (default: 0.0.0.0)')
    .option('--no-cache', 'clean the cache before build')
    .option('--debug', 'start development server in debug mode')
    .option('--silent', 'start development server in silent mode')
    .action((sourceDir = '.', options) => {
      const {
        host,
        port,
        debug,
        temp,
        cache,
        silent
      } = options
      logger.setOptions({ logLevel: silent ? 1 : debug ? 4 : 3 })
      logger.debug('cli_options', options)
      env.setOptions({ isDebug: debug, isTest: process.env.NODE_ENV === 'test' })

      wrapCommand(dev)(path.resolve(sourceDir), {
        host,
        port,
        temp,
        cache,
        plugins,
        theme
      })
    })

  cli
    .command('build [targetDir]', 'build dir as static site')
    .option('-d, --dest <dest>', 'specify build output dir (default: .vuepress/dist)')
    .option('-t, --temp <temp>', 'set the directory of the temporary file')
    .option('-c, --cache [cache]', 'set the directory of cache')
    .option('--no-cache', 'clean the cache before build')
    .option('--debug', 'build in development mode for debugging')
    .option('--silent', 'build static site in silent mode')
    .action((sourceDir = '.', options) => {
      const {
        debug,
        dest,
        temp,
        cache,
        silent
      } = options
      logger.setOptions({ logLevel: silent ? 1 : debug ? 4 : 3 })
      logger.debug('cli_options', options)
      env.setOptions({ isDebug: debug, isTest: process.env.NODE_ENV === 'test' })

      wrapCommand(build)(path.resolve(sourceDir), {
        debug,
        dest,
        plugins,
        theme,
        temp,
        cache,
        silent
      })
    })

  cli
    .command('eject [targetDir]', 'copy the default theme into .vuepress/theme for customization.')
    .option('--debug', 'eject in debug mode')
    .action((dir = '.') => {
      wrapCommand(eject)(path.resolve(dir))
    })

  // output help information on unknown commands
  cli.on('command:*', async () => {
    const { args, options } = cli

    logger.debug('cli_args', args)
    logger.debug('cli_options', options)
    logger.setOptions({ logLevel: 1 })
    const [commandName, sourceDir = '.'] = args
    const subCli = await unknownCommand(commandName, sourceDir, options)
    if (!subCli.matchedCommand) {
      console.error('Unknown command: %s', cli.args.join(' '))
      console.log()
    }
  })

  const prepare = require('@vuepress/core/lib/prepare')
  const argv = process.argv.slice(2)

  function isHelpFlag (v) {
    return v === '--help' || v === '-h'
  }

  function nonExistedCommandHelp (argv) {
    return ['dev', 'build', 'eject'].indexOf(argv[0]) === -1 && isHelpFlag(argv[1])
  }

  if (isHelpFlag(argv[0]) || nonExistedCommandHelp(argv)) {
    let ctx
    let [, sourceDir] = argv

    if (!sourceDir || sourceDir.startsWith('-')) {
      sourceDir = path.resolve('.', 'docs')
    }

    if (!require('fs').existsSync(sourceDir)) {
      sourceDir = path.resolve('.')
    }

    logger.setOptions({ logLevel: 1 })

    if (sourceDir) {
      ctx = await prepare(sourceDir, { theme, plugins })
      ctx.pluginAPI.options.registerCommand.apply(cli)
    }

    logger.setOptions({ logLevel: 3 })
  }

  cli
    .version(pkg.version)
    .help()

  function wrapCommand (fn) {
    return (...args) => {
      return fn(...args).catch(err => {
        console.error(chalk.red(err.stack))
        process.exitCode = 1
      })
    }
  }

  cli.parse(process.argv)
  if (!process.argv.slice(2).length) {
    cli.outputHelp()
  }
}
