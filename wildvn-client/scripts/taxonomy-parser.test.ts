import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveGenus, parseTaxonomyFromMarkdown } from './taxonomy-parser';

test('parses the ordered taxonomy hierarchy from a crawled species page', () => {
  const markdown = `
    * [Giới:Thực vật Plantae](https://vncreatures.net/taxa/thuc-vat/ "Thực vật Plantae")
      * [Ngành:Hạt kín Magnoliophyta](https://vncreatures.net/taxa/hat-kin/ "Hạt kín Magnoliophyta")
        * [Lớp:Hai lá mầm Magnoliopsida](https://vncreatures.net/taxa/hai-la-mam/ "Hai lá mầm Magnoliopsida")
          * [Bộ:Sơ ri Malpighiales](https://vncreatures.net/taxa/so-ri/ "Sơ ri Malpighiales")
            * [Họ:Chùm bao Passifloraceae](https://vncreatures.net/taxa/chum-bao/ "Chùm bao Passifloraceae")
  `;

  assert.deepEqual(parseTaxonomyFromMarkdown(markdown), [
    { rank: 'KINGDOM', nameVn: 'Thực vật', scientificName: 'Plantae' },
    { rank: 'PHYLUM', nameVn: 'Hạt kín', scientificName: 'Magnoliophyta' },
    { rank: 'CLASS', nameVn: 'Hai lá mầm', scientificName: 'Magnoliopsida' },
    { rank: 'ORDER', nameVn: 'Sơ ri', scientificName: 'Malpighiales' },
    { rank: 'FAMILY', nameVn: 'Chùm bao', scientificName: 'Passifloraceae' },
  ]);
});

test('rejects partial taxonomy blocks and derives only a valid genus', () => {
  assert.equal(parseTaxonomyFromMarkdown('[Giới:Động vật Animalia]'), null);
  assert.equal(deriveGenus('Passiflora foetida'), 'Passiflora');
  assert.equal(deriveGenus(''), null);
  assert.equal(deriveGenus('sp.'), null);
});
