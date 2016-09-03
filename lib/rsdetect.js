/*	This is implementation of RS Steganalysis technique as it was described in
	"Reliable Detection of LSB Steganography in Color and Grayscale Images" by Fridrich et al.
	http://www.ws.binghamton.edu/fridrich/Research/acm_2001_03.pdf
	*/
/* globals module */
'use strict';

function getGroup(p, mask){
	var pf = [];

	for (var i = 0; i < mask.length; i++) {
		if(mask[i] == 1){
			pf[i] = flip(p[i]);
		}else if(mask[i] == -1){
			pf[i] = iflip(p[i]);
		}else{
			pf[i] = p[i];
		}
	}

	var d1 = pixelDisc(p),
		d2 = pixelDisc(pf);

	if(d1 == d2) return 'U';

	if(d1 < d2) return 'R';

	return 'S';
}

function lsbFlip(p){
	var ret = [];
	for (var i = 0; i < p.length; i++) {
		ret[i] = p[i] ^ 1;
	}

	return ret;
}

function pixelDisc(p){
	var sum = 0;
	for (var i = 0; i < p.length - 1; i++) {
		sum += Math.abs(p[i + 1] - p[i]);
	}

	return sum;
}

function flip(val){
	if(val & 1){
		return val - 1;
	}

	return val + 1;
}

function iflip(val){
	if(val & 1){
		return val + 1;
	}

	return val - 1;
}

function solve(gc){
	var d0  = gc.R   - gc.S,
		dm0 = gc.mR  - gc.mS,
		d1  = gc.iR  - gc.iS,
		dm1 = gc.imR - gc.imS,
		a = 2 * (d1 + d0),
		b = dm0 - dm1 - d1 - d0 * 3,
		c = d0 - dm0,
		D = b * b - 4 * a * c;

	if (D < 0) return null;

	b *= -1;

	if (D === 0 ) return (b / 2 / a) / (b / 2 / a - 0.5);

	D = Math.sqrt(D);

	var x1 = (b + D) / 2 / a,
		x2 = (b - D) / 2 / a;

	if(Math.abs(x1) < Math.abs(x2)) return x1 / (x1 - 0.5);

	return x2 / (x2 - 0.5);
}

// This function estimates length of the embedded message.
//
// data:  array of bytes representing RGBa images (4 bytes per pixel)
// width: image width in pixels
// mask:  mask used by algorithm. Array of -1, 0 or 1. Default is [1, 0, 0, 1]. Optional
// bw:    width of analyzed block. Default 2. Optional
// bh:    height of analyzed block. Default 2. Optional
//
// returns estimated image capacity usage.
function rsDetect(data, width, mask, bw, bh){
	mask = mask || [1, 0, 0, 1];
	bw = bw || 2;
	bh = bh || 2;


	var imask = mask.map(function(x){return x?-1 * x:0;}),
		height = data.length / 4 / width,
		blocksInRow = Math.floor(width / bw),
		blocksInCol = Math.floor(height / bh),
		x, y, h, v, offset, cR, cG, cB;

	var gc = [
		{'R': 0, 'S': 0, 'U': 0, 'mR': 0, 'mS': 0, 'mU': 0, 'iR': 0, 'iS': 0, 'iU': 0, 'imR': 0, 'imS': 0, 'imU': 0},
		{'R': 0, 'S': 0, 'U': 0, 'mR': 0, 'mS': 0, 'mU': 0, 'iR': 0, 'iS': 0, 'iU': 0, 'imR': 0, 'imS': 0, 'imU': 0},
		{'R': 0, 'S': 0, 'U': 0, 'mR': 0, 'mS': 0, 'mU': 0, 'iR': 0, 'iS': 0, 'iU': 0, 'imR': 0, 'imS': 0, 'imU': 0}];

	for(y = 0; y < blocksInCol; y++){
		for(x = 0; x < blocksInRow; x++){

			cR = [];
			cG = [];
			cB = [];

			for(v = 0; v < bh; v++){
				for(h = 0; h < bw; h++){
					offset = (width * (y * bh + v) + x * bw + h) * 4;
					cR.push(data[offset]);
					cG.push(data[offset + 1]);
					cB.push(data[offset + 2]);
				}
			}

			gc[0][getGroup(cR, mask)]++;
			gc[1][getGroup(cG, mask)]++;
			gc[2][getGroup(cB, mask)]++;
			gc[0]['m' + getGroup(cR, imask)]++;
			gc[1]['m' + getGroup(cG, imask)]++;
			gc[2]['m' + getGroup(cB, imask)]++;

			cR = lsbFlip(cR);
			cG = lsbFlip(cG);
			cB = lsbFlip(cB);

			gc[0]['i' + getGroup(cR, mask)]++;
			gc[1]['i' + getGroup(cG, mask)]++;
			gc[2]['i' + getGroup(cB, mask)]++;
			gc[0]['im' + getGroup(cR, imask)]++;
			gc[1]['im' + getGroup(cG, imask)]++;
			gc[2]['im' + getGroup(cB, imask)]++;
		}
	}

	return (solve(gc[0]) + solve(gc[1]) + solve(gc[2])) / 3;
}

if (typeof module != "undefined" && typeof module.exports != "undefined") module.exports = rsDetect;
