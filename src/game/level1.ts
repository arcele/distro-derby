// src/game/level1.ts

export const TILE_SIZE = 40; // 20 x 15 tiles = 800 x 600

export const enum TileType {
  Floor = 0,
  Wall = 1,
  Spawn = 2,
  Goal = 3,
}

export interface Waypoint {
    x: number;
    y: number;
}

// # = wall, . = floor, S = spawn, G = goal/target
const raw = [
  "####################",
  "#S................##",
  "##############.....#",
  "#.............##...#",
  "#...######.....##..#",
  "#......####....##..#",
  "#....#######...##..#",
  "##...#######...#...#",
  "###...######...#...#",
  "###...######...#...#",
  "##....#####....#...#",
  "#....##G.......#...#",
  "#....##########....#",
  "#..................#",
  "####################",
];

const charToTile: Record<string, TileType> = {
  ".": TileType.Floor,
  "#": TileType.Wall,
  "S": TileType.Spawn,
  "G": TileType.Goal,
};

export const level1: TileType[][] = raw.map((row) =>
  row.split("").map((ch) => {
    const tile = charToTile[ch];
    if (tile === undefined) {
      throw new Error(`Unknown tile char "${ch}" in level data`);
    }
    return tile;
  })
);

// Rough waypoint path around your track.
// Tweak these numbers to make them follow your ideal racing line.
// x/y here are in WORLD coordinates (pixels).
export const npcWaypoints: Waypoint[] = [
    { x: 2.5 * TILE_SIZE, y: 1.5 * TILE_SIZE },  // near spawn, heading right
    { x: 14.5 * TILE_SIZE, y: 1.5 * TILE_SIZE }, // upper straight
    { x: 17.5 * TILE_SIZE, y: 3.5 * TILE_SIZE }, // approaching upper-right corner
    { x: 17.5 * TILE_SIZE, y: 9.5 * TILE_SIZE }, // down right corridor
    { x: 15.5 * TILE_SIZE, y: 13.5 * TILE_SIZE },// bottom-right bend
    { x: 11.5 * TILE_SIZE, y: 13.5 * TILE_SIZE },// bottom straight-ish
    { x: 3.5 * TILE_SIZE, y: 13.5 * TILE_SIZE }, // bottom-left
    { x: 4.5 * TILE_SIZE, y: 9.5 * TILE_SIZE },  // up left side
    { x: 2.5 * TILE_SIZE, y: 4.5 * TILE_SIZE },  // inner left
    { x: 12.5 * TILE_SIZE, y: 3.5 * TILE_SIZE },  // inner left
    { x: 13.5 * TILE_SIZE, y: 10.5 * TILE_SIZE },  // inner left
    { x: 7.5 * TILE_SIZE, y: 11.5 * TILE_SIZE },  // inner left

];