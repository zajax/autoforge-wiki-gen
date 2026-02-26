import { Mwn } from 'mwn';
import * as fs from 'fs';

const ITEMS_DIR = './out/items';
const ICONS_DIR = './out/icons';

async function checkWiki() {
  const bot = new Mwn({
    apiUrl: 'https://autoforge.wiki.gg/api.php',
    silent: true,
  });

  // Gather item page names from out/items/*.md
  const itemFiles = fs.readdirSync(ITEMS_DIR)
    .filter((f: string) => f.endsWith('.md'))
    .map((f: string) => f.replace(/\.md$/, ''));

  // Gather icon file names from out/icons/*.png
  const iconFiles = fs.readdirSync(ICONS_DIR)
    .filter((f: string) => f.endsWith('.png'))
    .map((f: string) => `File:${f}`);

  // Check item pages in batches of 50 (API limit for titles per query)
  console.log(`Checking ${itemFiles.length} item pages...`);
  const missingPages: string[] = [];

  for (let i = 0; i < itemFiles.length; i += 50) {
    const batch = itemFiles.slice(i, i + 50);
    const result = await bot.request({
      action: 'query',
      titles: batch.join('|'),
      format: 'json',
    });
    const pages = result.query?.pages;
    if (!pages) continue;
    for (const id of Object.keys(pages)) {
      if (pages[id].missing) {
        missingPages.push(pages[id].title);
      }
    }
  }

  if (missingPages.length > 0) {
    console.log(`\nMissing item pages (${missingPages.length}):`);
    for (const title of missingPages.sort()) {
      console.log(`  - ${title}`);
    }
  } else {
    console.log('All item pages exist on the wiki.');
  }

  // Check icon files in batches of 50
  console.log(`\nChecking ${iconFiles.length} icon files...`);
  const missingIcons: string[] = [];

  for (let i = 0; i < iconFiles.length; i += 50) {
    const batch = iconFiles.slice(i, i + 50);
    const result = await bot.request({
      action: 'query',
      titles: batch.join('|'),
      format: 'json',
    });

    const pages = result.query?.pages;
    if (!pages) continue;
    for (const id of Object.keys(pages)) {
      if (pages[id].missing) {
        missingIcons.push(pages[id].title);
      }
    }
  }

  if (missingIcons.length > 0) {
    console.log(`\nMissing icon files (${missingIcons.length}):`);
    for (const title of missingIcons.sort()) {
      console.log(`  - ${title}`);
    }
  } else {
    console.log('All icon files exist on the wiki.');
  }
}

checkWiki().catch(console.error);
