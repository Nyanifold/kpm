import { Command } from 'commander'
import { registerPack } from './commands/pack.js'
import { registerInit } from './commands/init.js'
import { registerAdd } from './commands/add.js'
import { registerRemove } from './commands/remove.js'
import { registerList } from './commands/list.js'
import { registerPaths } from './commands/paths.js'
import { registerSync } from './commands/sync.js'
import { registerUpdate } from './commands/update.js'
import { registerInfo } from './commands/info.js'
import { registerSearch } from './commands/search.js'

const program = new Command()
program.name('kpm').description('Knowledge Package Manager').version('0.1.0')

registerPack(program)
registerInit(program)
registerAdd(program)
registerRemove(program)
registerList(program)
registerPaths(program)
registerSync(program)
registerUpdate(program)
registerInfo(program)
registerSearch(program)

program.parseAsync(process.argv)
