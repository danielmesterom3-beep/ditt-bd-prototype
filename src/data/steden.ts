import type { Stad } from './types'
import eindhoven from './eindhoven'
import rotterdam from './rotterdam'

const steden: Stad[] = [
  { id: 'eindhoven', naam: 'Eindhoven', gebieden: eindhoven },
  { id: 'rotterdam', naam: 'Rotterdam', gebieden: rotterdam },
]

export default steden
