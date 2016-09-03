/* globals module, require */
'use strict';

var rc4 = require('./rc4.js');

function shuffleInit(len, prng) {
    var k, random_index, arr = [];
    // "Inside-out" Fisher–Yates shuffle
    for (k = 0; k < len; k++) {
        random_index = Math.round(k * prng.float());
        if (random_index != k) arr[k] = arr[random_index];
        arr[random_index] = k;
    }
    return arr;
}

var shuffledPos,
    bitstreamPos = 0,
    bitsWrited = 0,
    bitsChanged = 0,
    bitsBuffer = 0,
    bitsAvailable = 0,
    lsbPos, writeBit, writeByte, readByte;

function lsbPosShuffled(bitPpos){
    bitPpos = shuffledPos[bitPpos];
    return Math.floor(bitPpos / 3) * 4 + bitPpos % 3;
}

function lsbPosRegular(bitPpos){
    return Math.floor(bitPpos / 3) * 4 + bitPpos % 3;
}

lsbPos = lsbPosRegular;

function writeBitAdd(data, position, value) {
    var offset = lsbPos(position);

    if((data[offset] & 1) != value){
        bitsChanged++;

        if(!data[offset] || (data[offset] < 255 && Math.random() < 0.5)){
            data[offset]++;
        }else{
            data[offset]--;
        }
    }
}

function writeBitFlip(data, position, value) {
    var offset = lsbPos(position);

    if((data[offset] & 1) != value){
        bitsChanged++;
        data[offset] ^= 1;
    }
}

writeBit = writeBitFlip;

function readBit(data, position) {
    return data[lsbPos(position)] & 1;
}

function readByteUnmasked(n, data) {
    var k = (1 << n) - 1,
        i, byte, hash;

    while (bitsAvailable < 8) {
        hash = 0;
        for (i = 1; i <= k; i++) {
            hash ^= readBit(data, bitstreamPos++) * i;
        }

        bitsBuffer += hash << bitsAvailable;
        bitsAvailable += n;
    }

    byte = bitsBuffer & 255;
    bitsBuffer >>>= 8;
    bitsAvailable -= 8;

    return byte;
}

readByte = readByteUnmasked;

function writeByteUnmasked(n, data, value) {
    var k = (1 << n) - 1,
        i, hash, embedBits;

    bitsBuffer += value << bitsAvailable;
    bitsAvailable += 8;

    while (bitsAvailable >= n) {
        hash = 0;

        embedBits = bitsBuffer & ((1 << n) - 1);
        bitsBuffer >>>= n;
        bitsAvailable -= n;

        for (i = 1; i <= k; i++) {
            hash ^= readBit(data, bitstreamPos++) * i;
        }

        if (hash ^ embedBits) {
            writeBit(data, bitstreamPos - k + (hash ^ embedBits) - 1);
        }

        bitsWrited += n;
    }
}

writeByte = writeByteUnmasked;

function readByteMasked(n, data, prng) {
    return readByteUnmasked(n, data) ^ prng.byte();
}

function writeByteMasked(n, data, value, prng) {
    writeByteUnmasked(n, data, value ^ prng.byte());
}

function flushBits(n, data, prng) {
    var fillBytes = Math.ceil((n - bitsAvailable) / 8);

    for (var i = 0; i < fillBytes; i++) {
        writeByte(n, data, 0, prng);
    }
}

function write(image, data, options){
    var defaults = {
        shuffle: true,
        matrix: true,
        mask: true,
        key: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
        pm1code: true
    };

    var i, k, n, capacity, prng, lsbCount = image.length / 4 * 3;

    options = options || {};
    bitstreamPos = 0;
    bitsWrited = 0;
    bitsChanged = 0;
    bitsBuffer = 0;
    bitsAvailable = 0;

    for(i in defaults){
        if(!options.hasOwnProperty(i)){
            options[i] = defaults[i];
        }
    }

    if(options.shuffle || options.matrix || options.mask){
        prng = rc4(options.key);
    }

    if(options.pm1code){
        writeBit = writeBitAdd;
    }else{
        writeBit = writeBitFlip;
    }

    if(options.mask){
        writeByte = writeByteMasked;
        readByte = readByteMasked;
    }else{
        writeByte = writeByteUnmasked;
        readByte = readByteUnmasked;
    }

    if(options.shuffle){
        lsbPos = lsbPosShuffled;
        shuffledPos = shuffleInit(lsbCount, prng);
    }else{
        lsbPos = lsbPosRegular;
    }

    n = 16;

    if(options.matrix){
        while(n > 0){
            k = (1 << n) - 1;
            capacity = Math.floor((lsbCount - 4) / k) * n;

            if(capacity >= (data.length + 4) * 8){
                break;
            }
            n--;
        }
    }else{
        capacity = lsbCount;
        n = 1;
    }

    if(n === 0 || capacity < (data.length + 4) * 4){
        throw 'Data will not fit into image.';
    }

    if(options.matrix){
        n--;
        writeBit(image, 0, n & 1);
        writeBit(image, 1, (n >> 1) & 1);
        writeBit(image, 2, (n >> 2) & 1);
        writeBit(image, 3, (n >> 3) & 1);
        n++;
        bitsWrited += 4;
    }

    writeByte(n, image, data.length & 255, prng);
    writeByte(n, image, (data.length >>> 8)  & 255, prng);
    writeByte(n, image, (data.length >>> 16) & 255, prng);
    writeByte(n, image, (data.length >>> 25) & 255, prng);

    for (i = 0; i < data.length; i++) {
        writeByte(n, image, data[i], prng);
    }

    flushBits(n, image, prng);

    return {
        bitsWrited: bitsWrited,
        bitsChanged: bitsChanged,
        n: n,
        k: (1<<n) - 1
    };
}

function read(image, options){
    var defaults = {
        shuffle: true,
        matrix: true,
        mask: true,
        key: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
    };

    var i, k, n, prng, lsbCount = image.length / 4 * 3;

    options = options || {};
    bitstreamPos = 0;
    bitsWrited = 0;
    bitsChanged = 0;
    bitsBuffer = 0;
    bitsAvailable = 0;

    for(i in defaults){
        if(!options.hasOwnProperty(i)){
            options[i] = defaults[i];
        }
    }

    if(options.shuffle || options.matrix || options.mask){
        prng = rc4(options.key);
    }

    if(options.pm1code){
        writeBit = writeBitAdd;
    }else{
        writeBit = writeBitFlip;
    }

    if(options.mask){
        writeByte = writeByteMasked;
        readByte = readByteMasked;
    }else{
        writeByte = writeByteUnmasked;
        readByte = readByteUnmasked;
    }

    if(options.shuffle){
        lsbPos = lsbPosShuffled;
        shuffledPos = shuffleInit(lsbCount, prng);
    }else{
        lsbPos = lsbPosRegular;
    }

    n = 1;
    if(options.matrix){
        n = 1;
        n += readBit(image, 0);
        n += readBit(image, 1) << 1;
        n += readBit(image, 2) << 2;
        n += readBit(image, 3) << 3;
    }

    k = (1 << n) - 1;

    var capacity = Math.floor(Math.floor((lsbCount - 4) / k) * n / 8);
    var len = readByte(n, image, prng) + readByte(n, image, prng) * 256 + readByte(n, image, prng) * 65536 + readByte(n, image, prng) * 16777216;

    if((len + 4) > capacity){
        len = capacity - 4;
    }

    var data = new Uint8Array(len);

    for (i = 0; i < len; i++) {
        data[i] = readByte(n, image, prng);
    }

    return data;
}

function enhance(data){
    for (var i = 0; i < data.length; i+=4) {
        data[i]     &= 1; data[i]     *= 255;
        data[i + 1] &= 1; data[i + 1] *= 255;
        data[i + 2] &= 1; data[i + 2] *= 255;
        data[i + 3] = 255;
    }
}

function fill(data, value){
    var i;
    if(value){
        for (i = 0; i < data.length / 4; i++) {
            data[i*4]     |= 1;
            data[i*4 + 1] |= 1;
            data[i*4 + 2] |= 1;
        }
    }else{
        for (i = 0; i < data.length / 4; i++) {
            data[i*4]     &= 254;
            data[i*4 + 1] &= 254;
            data[i*4 + 2] &= 254;
        }
    }
}

if (typeof module != "undefined" && typeof module.exports != "undefined") module.exports = {
    read: read,
    write: write,
    enhance: enhance,
    fill: fill
};