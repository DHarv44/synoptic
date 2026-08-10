import { createTheme, type MantineColorsTuple } from '@mantine/core'

// Near-achromatic chrome: hue belongs to data (PLAN.md §4.1).
const steel: MantineColorsTuple = [
  '#f2f4f6',
  '#e2e6ea',
  '#c3cad2',
  '#a2adb9',
  '#8694a4',
  '#748496',
  '#6b7c90',
  '#5a6a7d',
  '#4f5e70',
  '#415064',
]

export const theme = createTheme({
  primaryColor: 'steel',
  colors: { steel },
  fontFamily:
    'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
  defaultRadius: 'sm',
  headings: { fontWeight: '600' },
})
