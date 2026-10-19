// Every room on the two floor plans (Riddhi Resorts, B Block). Room numbers come straight from the plans.
// To add or change a room, edit these lists and redeploy.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const GROUND = [...range(101, 112), 114, 115, ...range(116, 125), 126, 127].map(String)
export const FIRST = [...range(201, 210), 212, ...range(214, 220), ...range(221, 229), ...range(231, 234)].map(String)
export const EXECUTIVE = new Set(['126', '127', '232', '233', '234'])

export const ROOMS = [
  ...GROUND.map((n) => ({ no: n, floor: 'ground', exec: EXECUTIVE.has(n) })),
  ...FIRST.map((n) => ({ no: n, floor: 'first', exec: EXECUTIVE.has(n) })),
]