/**
 * Which way an open menu faces. The panel and its 3D props (hero carousel, war
 * map, galaxy, armory) are placed in front of the player when a menu opens. They
 * must stay there through every selection: re-placing them toward wherever the
 * player happens to be looking made the whole menu slide away each time a button
 * near the panel's edge was pressed. Pure so it is unit-tested.
 */

/** Cosine of the widest turn (about 70 degrees) a player can make before an open menu is brought round to face them again. */
export const MENU_KEEP_COS = 0.34;

interface Flat {
  x: number;
  z: number;
}

/**
 * True while the player still faces roughly the way the menu was placed (their
 * heading and the menu's heading, ignoring up and down, within about 70 degrees).
 * Looking straight up or down gives no heading, so the menu is kept.
 */
export function menuStillFacing(menu: Flat, forward: Flat): boolean {
  const forwardLength = Math.hypot(forward.x, forward.z);
  if (forwardLength < 1e-4) return true;
  const menuLength = Math.hypot(menu.x, menu.z);
  if (menuLength < 1e-4) return false;
  return (menu.x * forward.x + menu.z * forward.z) / (menuLength * forwardLength) > MENU_KEEP_COS;
}
