/*	Implementation of chi-squared attack described in "Attacks on Steganographic Systems.
	Breaking the Steganographic Utilities EzStego, Jsteg,Steganos, and S-Toolsand Some Lessons Learned"
	by Andreas Westfeld and Andreas Pfitzmann

	https://web.archive.org/web/20151123010933/http://users.ece.cmu.edu/~adrian/487-s06/westfeld-pfitzmann-ihw99.pdf

	*/
/* globals module, require */
'use strict';

var chiSquareTest = require('./chitest.js');

//
// This function estimates length of the embedded message.
//
// data:     array of bytes representing RGBa images (4 bytes per pixel)
// enchance: if true LSB plane of image will be equalized.
//
// this function modify contents of data array by coloring image regions acording to results
// of chi-squared test. And if requested - enchances pixels LSB inplace
//
// returns estimated amount of embedded bits.
function chiTest(data, width, enhance) {
    var blockSize = width * 4,
        blocks = Math.floor(data.length / width / 4),
        i, j, pov = [],
        offset, chiSquareValue, r, g, estimate = 0;

    // Init observed values counters
    for (i = 0; i < 256; i++) {
        pov[i] = 1;
    }

    // Returns the expected frequencies of the observed values.
    function getExpected() {
        var result = [];
        for (var i = 0; i < 128; i++) {
            result.push((pov[2 * i] + pov[2 * i + 1]) / 2);
        }
        return result;
    }

    // Returns the observed values of the odd index
    function getPov() {
        var result = [];
        for (var i = 0; i < 128; i++) {
            result.push(pov[2 * i + 1]);
        }
        return result;
    }

    for (i = 0; i < blocks; i++) {
        // collect data from RGB values in current block
        for (j = 0; j < width; j++) {
            offset = blockSize * i + j * 4;
            pov[data[offset]]++;
            pov[data[offset + 1]]++;
            pov[data[offset + 2]]++;
            if (enhance) {
                // reveal LSB plane
                data[offset] &= 1;
                data[offset] *= 255;
                data[offset + 1] &= 1;
                data[offset + 1] *= 255;
                data[offset + 2] &= 1;
                data[offset + 2] *= 255;
            }
        }

        // get the chiSquared
        chiSquareValue = chiSquareTest(getExpected(), getPov());
        // make color code for calcualted value
        r = chiSquareValue > 0.5 ? 191 : Math.floor(191 * chiSquareValue * 2);
        g = chiSquareValue < 0.5 ? 191 : Math.floor(191 * (1 - chiSquareValue) * 2);

        if (chiSquareValue > 0.95) {
            estimate += width * 3;
        }

        // now blend processed pixel with color coded chiSquareValue
        for (j = 0; j < width; j++) {
            offset = blockSize * i + j * 4;
            data[offset] = Math.floor(data[offset] * 0.25) + r;
            data[offset + 1] = Math.floor(data[offset + 1] * 0.25) + g;
            data[offset + 2] = Math.floor(data[offset + 2] * 0.25);
            data[offset + 3] = 255;
        }

    }

    return estimate;
}

if (typeof module != "undefined" && typeof module.exports != "undefined") module.exports = chiTest;
