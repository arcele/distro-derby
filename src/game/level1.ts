// src/game/level1.ts

export const TILE_SIZE = 40; // 20 x 15 tiles = 800 x 600

export const enum TileType {
  Floor = 0,
  Wall = 1,
  Spawn = 2,
  Goal = 3,
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