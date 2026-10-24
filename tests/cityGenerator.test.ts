import {it,expect} from 'vitest';
import {getCityLayout} from '../apps/web/src/data/fixtures';
it('preserves the committed layout and six hero landmarks including bridge and Alcatraz drawn on static layer',()=>{const l=getCityLayout();expect(l.layoutHash).toBe('sf-diorama-4242-v1');expect(l.buildings.map(b=>b.kind)).toEqual(expect.arrayContaining(['pyramid','salesforce','coit','ferry']));expect(new Set(l.buildings.map(b=>b.id)).size).toBe(l.buildings.length);});
