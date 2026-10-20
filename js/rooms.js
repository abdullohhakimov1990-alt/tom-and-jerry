// 12 ta xonaning jihozlanishi. Koordinatalar xona ichida: x 0..26 (g'arbdan sharqqa), z 0..26 (shimoldan janubga).
// Eshiklar har bir ichki devor o'rtasida (13 ± 3.3), sichqon teshiklari 8, 13 yoki 18 da — bu joylar bo'sh qoldiriladi.
import * as FN from './furniture.js';
import * as TX from './textures.js';
import { M } from './builder.js';

const hide = (R, type, x, z, face) => FN.hide(R.f(x, z, 0), type, 0, 0, face);
const mouseN = (R, x) => FN.hide(R.f(x, .05, 0), 'mouse', 0, 0, 0);
const mouseS = (R, x) => FN.hide(R.f(x, 25.95, 2), 'mouse', 0, 0, 0);
const mouseW = (R, z) => FN.hide(R.f(.05, z, 1), 'mouse', 0, 0, 0);
const mouseE = (R, z) => FN.hide(R.f(25.95, z, 3), 'mouse', 0, 0, 0);

export const DESIGNS = {
  living(R) {
    FN.rug(R.f(13, 13), 18, 13, TX.carpet('#7a1f1f', '#d8b26a', '#2a1208'));
    FN.sofa(R.f(13, 19, 2), { c: '#2f4f8f', p: '#e8c56a' });
    FN.coffeeTable(R.f(13, 12.5));
    FN.tvStand(R.f(13, 5.6, 0));
    FN.armchair(R.f(4.6, 6, 1), { c: '#2f4f8f', p: '#e8c56a' });
    FN.armchair(R.f(21.4, 6, 3), { c: '#2f4f8f', p: '#e8c56a' });
    FN.floorLamp(R.f(2.2, 2.2)); FN.floorLamp(R.f(23.8, 2.2));
    FN.plant(R.f(2.5, 23.5), { palm: true }); FN.plant(R.f(23.5, 23.5), { pot: '#2e6b8a' });
    FN.bookStack(R.f(5.4, 20.5));
    R.painting('W', 4.5, 8.5, 5, 3.5, 1); R.painting('E', 21.5, 8.5, 5, 3.5, 2); R.painting('S', 21, 8.5, 6, 4, 3);
    hide(R, 'box', 2.6, 19.2, 1); hide(R, 'pot', 23.4, 19.2, 3); hide(R, 'slipper', 20.2, 11, 3); mouseS(R, 6.2);
  },
  library(R) {
    FN.fireplace(R.f(1.4, 13, 1));
    FN.rug(R.f(8.5, 13), 9, 11, TX.carpet('#1f3a2a', '#c9a24a', '#0e1d14'));
    FN.armchair(R.f(8.8, 8.8, 3), { c: '#6b2b1f', p: '#c9a24a' });
    FN.armchair(R.f(8.8, 17.2, 3), { c: '#6b2b1f', p: '#c9a24a' });
    FN.bookshelf(R.f(3, 1.35, 0), { seed: 1 }); FN.bookshelf(R.f(23, 1.35, 0), { seed: 2 });
    FN.bookshelf(R.f(3, 24.65, 2), { seed: 3 }); FN.bookshelf(R.f(23, 24.65, 2), { seed: 4 });
    FN.desk(R.f(19, 13, 3)); FN.officeChair(R.f(15.6, 13, 1));
    FN.globe(R.f(13, 4)); FN.floorLamp(R.f(12, 21.5));
    R.painting('W', 13, 11.2, 5, 3.2, 5);
    hide(R, 'vase', 6.5, 4.6, 1); hide(R, 'chest', 16.6, 22.8, 2); hide(R, 'bin', 13.5, 8, 0); mouseE(R, 21);
  },
  bedroom(R) {
    FN.bed(R.f(6.2, 13, 1), { c: '#5b7bd5', c2: '#f0d27a' });
    FN.nightstand(R.f(1.7, 5.8, 1)); FN.nightstand(R.f(1.7, 20.2, 1));
    FN.wardrobe(R.f(21.5, 1.95, 0));
    FN.dresser(R.f(22.8, 24.4, 2));
    FN.rug(R.f(15.5, 13), 7, 10, TX.carpet('#f2e6d8', '#c9a2b8', '#8e5a7a'));
    FN.bookStack(R.f(13.4, 16.6));
    FN.plant(R.f(3, 23.6), { pot: '#e9e2d6', s: .9 });
    R.painting('N', 4.8, 8.8, 4, 3, 6); R.painting('E', 21, 8.5, 5, 3.5, 7);
    hide(R, 'slipper', 14.4, 20.6, 0); hide(R, 'basket', 23.8, 6.6, 3); hide(R, 'box', 18, 21, 3); mouseN(R, 5);
  },
  kids(R) {
    FN.rug(R.f(13, 14), 12, 10, TX.carpet('#4fc3f7', '#ffeb3b', '#ef5350'));
    FN.bed(R.f(5.2, 5, 0), { w: 7, l: 9, c: '#ff8a65', c2: '#fff176', wood: '#e0e0e0' });
    FN.toyBlocks(R.f(18.2, 9.4));
    FN.teddy(R.f(22.5, 22.5, 3));
    FN.ball(R.f(6, 19.5), '#ff7043');
    FN.trainTrack(R.f(13, 14));
    FN.desk(R.f(22.6, 5, 3), { c: '#81c784', pc: false }); FN.chair(R.f(19.4, 5, 1), { c: '#fff176', cu: '#42a5f5' });
    R.painting('W', 21, 8.5, 4, 3, 8); R.painting('N', 22.5, 9, 4, 3, 9);
    hide(R, 'chest', 13, 2.4, 0); hide(R, 'box', 3, 22.5, 1); hide(R, 'pillows', 17.6, 22.8, 2); mouseS(R, 8);
  },
  bath(R) {
    FN.bathtub(R.f(6.5, 3.6, 0));
    FN.toilet(R.f(22.5, 2.3, 0));
    FN.sinkPedestal(R.f(17.2, 1.7, 0));
    FN.rug(R.f(6.5, 9), 6, 3, TX.carpet('#80cbc4', '#ffffff', '#4db6ac'));
    FN.shelfUnit(R.f(3.3, 23.8, 2), { w: 5, h: 8 });
    FN.plant(R.f(14, 23.6), { s: .8, pot: '#ffffff' });
    hide(R, 'basket', 23.4, 20.5, 3); hide(R, 'bin', 13.5, 4.5, 0); hide(R, 'pot', 8.2, 22.4, 2); mouseE(R, 6.4);
  },
  laundry(R) {
    FN.washer(R.f(3, 2.6, 0)); FN.washer(R.f(7.8, 2.6, 0), { k: '#ef5350' });
    FN.shelfUnit(R.f(17, 1.6, 0), { w: 6, h: 9 });
    FN.ironingBoard(R.f(13, 15, 1));
    FN.barrel(R.f(23.5, 23.5));
    FN.crate(R.f(4, 9.8), { s: 2.4 });
    hide(R, 'basket', 23, 4.6, 3); hide(R, 'box', 3, 22.5, 1); hide(R, 'bin', 17.5, 22.8, 2); mouseE(R, 20);
  },
  dining(R) {
    FN.rug(R.f(13, 13), 17, 12, TX.carpet('#4a2c6b', '#e0c27a', '#21122f'));
    FN.diningTable(R.f(13, 13), { len: 12, d: 7, c: '#5c3520', cu: '#7b1f3a' });
    FN.chinaCabinet(R.f(3, 1.5, 0)); FN.sideboard(R.f(23, 1.5, 0));
    FN.plant(R.f(2.4, 23.6), { palm: true }); FN.plant(R.f(24, 24), { pot: '#8d6e63' });
    R.painting('S', 4, 9, 4, 3, 10); R.painting('S', 22, 9, 4, 3, 11);
    hide(R, 'vase', 2.6, 5.2, 1); hide(R, 'jar', 20.6, 23.8, 2); hide(R, 'box', 5.6, 22.4, 1);
  },
  kitchen(R) {
    FN.fridge(R.f(23.9, 2.7, 3));
    FN.counter(R.f(24.1, 14.5, 3), { len: 18, sink: -1.5, stove: 6 });
    FN.counter(R.f(3.8, 2.1, 0), { len: 6 }); FN.upperCabinet(R.f(3.8, 2.1, 0), { len: 6 });
    FN.diningTable(R.f(11.5, 15), { len: 8, d: 6, c: '#c8a27a', cu: '#ef5350' });
    FN.trashCan(R.f(19.5, 24.5));
    FN.rug(R.f(19.5, 14.5), 3, 12, TX.carpet('#d84315', '#ffcc80', '#5d1f0a'));
    hide(R, 'jar', 9.5, 2.6, 0); hide(R, 'bin', 6.5, 23.6, 2); hide(R, 'teapot', 19, 21.5, 3); mouseW(R, 23);
  },
  garden(R) {
    FN.fountain(R.f(13, 13));
    FN.plant(R.f(3, 3), { palm: true, s: 1.1 }); FN.plant(R.f(23, 3), { palm: true });
    FN.plant(R.f(3, 23), { palm: true }); FN.plant(R.f(23, 23), { s: 1.2, leaf: '#3a8a3a' });
    FN.plant(R.f(3, 18), { s: .8 }); FN.plant(R.f(18, 3), { s: .8, pot: '#8d6e63' });
    FN.wickerChair(R.f(8.2, 20.4, 0)); FN.wickerChair(R.f(17.8, 20.4, 0));
    FN.sideTable(R.f(13, 21), { c: '#c9a26a' });
    FN.birdCage(R.f(21.5, 8));
    hide(R, 'pot', 4, 12.6, 1); hide(R, 'pot', 21.6, 17.4, 3); hide(R, 'vase', 8.6, 3.6, 0); mouseS(R, 13);
  },
  entry(R) {
    // kirish eshigi (yopiq)
    const D = R.f(13, 25.9, 2);
    D.box(7.4, 11, .3, M.wood('#5a3520', .4), 0, 0, -.05);
    D.box(6.4, 10, .3, M.wood('#7a4a26', .35), 0, 0, -.2);
    for (const [x, y] of [[-1.5, 1.2], [1.5, 1.2], [-1.5, 5.4], [1.5, 5.4]]) D.box(2.3, 3.4, .12, M.wood('#8a5a33', .35), x, y, -.38);
    D.sph(.3, M.metal('#d4af37', .2), 2.4, 5, -.5);
    D.box(3, .05, 1.5, M.fab('#6d4c41'), 0, 0, -1.4, { cast: false });
    FN.rug(R.f(13, 13.5), 6, 21, TX.carpet('#8e2b2b', '#e0c27a', '#3b1010'));
    FN.grandfatherClock(R.f(2, 2, 0));
    FN.bench(R.f(23, 2, 0));
    FN.coatRack(R.f(2.2, 23.8));
    FN.consoleTable(R.f(22.4, 24.5, 2));
    FN.shoeRack(R.f(7, 24.6, 2));
    R.painting('W', 21, 8.5, 4, 3, 12); R.painting('E', 5, 8.5, 4, 3, 13);
    hide(R, 'umbrella', 5, 2.3, 0); hide(R, 'boot', 21.5, 21.2, 3); hide(R, 'box', 3, 19.4, 1); mouseN(R, 8.2);
  },
  study(R) {
    FN.desk(R.f(13, 21.6, 2)); FN.officeChair(R.f(13, 17.8, 0));
    FN.bookshelf(R.f(3, 1.35, 0), { seed: 5 }); FN.bookshelf(R.f(23, 1.35, 0), { seed: 6 });
    FN.filingCabinet(R.f(24.4, 24.4, 2));
    FN.piano(R.f(9.5, 10, 0));
    FN.armchair(R.f(21, 9, 3), { c: '#3e4a5a', p: '#c9a24a' });
    FN.globe(R.f(19.5, 4));
    FN.rug(R.f(13, 18), 10, 8, TX.carpet('#263238', '#90a4ae', '#11171b'));
    R.painting('E', 21, 8.5, 4, 3, 14);
    hide(R, 'bin', 5.5, 23.3, 1); hide(R, 'box', 21.5, 18.5, 3); hide(R, 'vase', 2.6, 6.6, 1); mouseS(R, 3.4);
  },
  storage(R) {
    FN.crate(R.f(3.5, 3.5)); FN.crate(R.f(3.5, 3.5), { y: 3, s: 2.6 }); FN.crate(R.f(7, 3.5), { s: 2.4 });
    FN.crate(R.f(22.5, 3.5)); FN.crate(R.f(22.5, 3.5), { y: 3, s: 2.8 }); FN.crate(R.f(22.5, 7), { s: 2.2 });
    FN.crate(R.f(22.5, 3.5), { y: 5.8, s: 2 });
    FN.shelfUnit(R.f(24.6, 20.5, 3), { w: 6, h: 9 });
    FN.sack(R.f(5, 21.5)); FN.sack(R.f(7.6, 23.6), '#b89a6a');
    FN.barrel(R.f(3, 8.6)); FN.barrel(R.f(16, 22.8));
    FN.crate(R.f(10.5, 21), { s: 2 });
    hide(R, 'cheese', 20, 21.2, 3); hide(R, 'box', 13.2, 22.6, 2); hide(R, 'jar', 18.6, 3, 0); mouseS(R, 21);
  },
};
