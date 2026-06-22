import type { Stad } from './types'
import eindhoven from './eindhoven'
import rotterdam from './rotterdam'
import utrecht from './utrecht'

const steden: Stad[] = [
  { id: 'eindhoven', naam: 'Eindhoven', gebieden: eindhoven },
  { id: 'rotterdam', naam: 'Rotterdam', gebieden: rotterdam },
  { id: 'utrecht', naam: 'Utrecht', gebieden: utrecht },
]

export default steden
