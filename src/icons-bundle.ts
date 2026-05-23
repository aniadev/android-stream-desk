// Auto-generated offline icons bundle using direct dataset imports.
// Do not modify manually.

import { addCollection } from '@iconify/vue';

// Import the ENTIRE offline icon collections directly from the packages
import mdiIcons from '@iconify-json/mdi/icons.json';
import lucideIcons from '@iconify-json/lucide/icons.json';
import materialIcons from '@iconify-json/material-symbols/icons.json';

export function initOfflineIcons() {
  try {
    addCollection(mdiIcons as any);
    addCollection(lucideIcons as any);
    addCollection(materialIcons as any);
    console.log(
      'Successfully registered all MDI, Lucide, and Material Symbols offline collections!',
    );
  } catch (e) {
    console.error('Failed to register offline icon collections:', e);
  }
}
