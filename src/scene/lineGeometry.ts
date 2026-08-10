import { latLonToVec3 } from '@/scene/geo'

type LineCoords = Array<[number, number]> // [lon, lat] pairs (GeoJSON order)

/** GeoJSON MultiLineString coordinates → line-segment position buffer on the sphere. */
export function linesToSegmentPositions(lines: LineCoords[], radius: number): Float32Array {
  const out: number[] = []
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = latLonToVec3(line[i][1], line[i][0], radius)
      const b = latLonToVec3(line[i + 1][1], line[i + 1][0], radius)
      out.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
  return new Float32Array(out)
}

const SAMPLE_STEP = 2 // degrees between samples along each grid line

/** Lat/lon grid lines at the given spacing → segment position buffer. */
export function graticuleSegmentPositions(spacingDeg: number, radius: number): Float32Array {
  const lines: LineCoords[] = []
  for (let lat = -90 + spacingDeg; lat < 90; lat += spacingDeg) {
    const line: LineCoords = []
    for (let lon = -180; lon <= 180; lon += SAMPLE_STEP) line.push([lon, lat])
    lines.push(line)
  }
  for (let lon = -180; lon < 180; lon += spacingDeg) {
    const line: LineCoords = []
    for (let lat = -90; lat <= 90; lat += SAMPLE_STEP) line.push([lon, lat])
    lines.push(line)
  }
  return linesToSegmentPositions(lines, radius)
}
