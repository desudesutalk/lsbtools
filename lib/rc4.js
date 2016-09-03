/*  This is implementation of RC4 stream cipher copied from wikipedia article
    https://en.wikipedia.org/wiki/RC4
    */
/* globals module */
'use strict';
function rc4(key){
    // this variable holds internal state of RC4
    var rc4_S = [],
        rc4_i = 0,
        rc4_j = 0;

    // Key-scheduling algorithm. We take array of bytes and init with them permutation array of RC4
    function initRC4(key) {
        var i, j, t;

        for (i = 0; i < 256; ++i) rc4_S[i] = i;

        for (i = 0; i < 256; ++i) {
            j = (j + rc4_S[i] + key[i % key.length]) & 255;
            t = rc4_S[i];
            rc4_S[i] = rc4_S[j];
            rc4_S[j] = t;
        }
    }

    initRC4(key);

    // Pseudo-random generation algorithm. This function returns one random byte from RC4 key stream
    function rc4Rnd() {
        var t;

        rc4_i = (rc4_i + 1) & 255;
        rc4_j = (rc4_j + rc4_S[rc4_i]) & 255;
        t = rc4_S[rc4_i];
        rc4_S[rc4_i] = rc4_S[rc4_j];
        rc4_S[rc4_j] = t;
        return rc4_S[(t + rc4_S[rc4_i]) & 255];
    }

    // And this is helper function for generating random float out of 4 random bytes.
    // Returned value will be from 0 to 1 (inclusive)
    function rc4RndFloat() {
        // Get 4 bytes, combine them to 32bit unsigned (with >>> trick) and then divide by 2^32 - 1
        return ((rc4Rnd() + (rc4Rnd() << 8) + (rc4Rnd() << 16) + (rc4Rnd() << 24)) >>> 0) / 0xFFFFFFFF;
    }

    return {
        rekey: initRC4,
        byte: rc4Rnd,
        float: rc4RndFloat
    };
}
if (typeof module != "undefined" && typeof module.exports != "undefined") module.exports = rc4;