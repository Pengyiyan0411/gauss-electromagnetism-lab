import { Charge } from '../../types';

export const STATIC_CHARGES: Charge[] = [
  { pos: { x: -6, y: 2, z: -4 }, q: 2, label: "q₁ (+2)" },
  { pos: { x: 5, y: -3, z: 2 },  q: -1, label: "q₂ (-1)" },
  { pos: { x: -2, y: 5, z: 5 },  q: 3, label: "q₃ (+3)" },
  { pos: { x: 7, y: 4, z: -6 },  q: -2, label: "q₄ (-2)" },
  { pos: { x: 0, y: -6, z: -2 }, q: 1, label: "q₅ (+1)" }
];

export const SAMPLE_POINTS = 64;