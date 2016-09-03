# lsbtools
While experimenting with LSB steganography I wrote several scripts to play with. Eventually this scripts become quite useful so i decided to convert them into a node.js module.

You can also use [online version](http://desudesutalk.github.io/lsbtools/).

**NOTE**: this is more a playground than a real steganography.

## Installing
Install with npm:
```none
npm install lsbtools
```
If you want to use this tools in browser include `lsbtools.min.js` into your page. Module will be available as `lsbTools`.

## Usage
As any node.js module `lsbtools` should be requirde before use
```
var lsbTools = require('lsbtools');
```
Thi lib operated on an array of pixels byte data. Each pixel must be presented by for bytes: R, G, B and Alpha. This is because it was at first targeted for pixeldata returned from `canvas` element with `getImageData`. In node you can use [pngjs] it also returns image pixels in this 4 byte format.

If applicable, pixels data will be changed in-place. If you want to preserve original pixel data, make a copy before calling lsbTools methods.

lsbTools exposes this methods:

### lsbTools.read(pixels, options)
`pixels` is an array of pixel. `options` is an object what can contain following properties (shown with defaults)
```js
{
  shuffle: true, // spread data across image instead of writing sequentially
  matrix: true, // use matrix encoding to minimize changes
  mask: true, // mask data with stream of random bytes
  key: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], // array of bytes used as key for shuffling and masking
  pm1code: true  // use ±1 encoding instead of LSB flip
}
```
Returns Uint8Array with bytes extracted from image.

### lsbTools.write(pixels, data, options)
Opposite to `read`, writes `data` bytes into image. Accepts same `options` object.

### lsbTools.fill(pixels, value)
Fill LSB plane of image with provided value. 0 or 1.

### lsbTools.enhance(pixels)
Change color components to 255 if LSB was set and to 0 if not.

### lsbTools.chiAttack(pixels, width, enhance)
Performs chi-squared attack as described in "Attacks on Steganographic Systems. Breaking the Steganographic Utilities EzStego, Jsteg,Steganos, and S-Toolsand Some Lessons Learned" by Andreas Westfeld and Andreas Pfitzmann

URL to pdf with original paper: <https://web.archive.org/web/20151123010933/http://users.ece.cmu.edu/~adrian/487-s06/westfeld-pfitzmann-ihw99.pdf>

Needs `pixels` array and `width` of image. Blends image with a map of test results. Red color for zones with data embedded. Green color for clean zones. If `enhance` parameter evaluates to true then pixels will be enhanced according to their LSB value.

Returns estimated length of embedded message (in bits).

### lsbTools.rsDetect(pixels, width, mask, bw, bh)
Performs "RS Steganalysis" attack as described in "Reliable Detection of LSB Steganography in Color and Grayscale Images" by Jessica Fridrich et al.

URL to pdf with original paper: <http://www.ws.binghamton.edu/fridrich/Research/acm_2001_03.pdf>

Needs `pixels` array and `width` of image. You also can provide `mask` in a form of an array, like `[1, 0, 1, 0]` and width and height (`bw` and `bh`) of block what is analyzed with that matrix.

Returns estimated capacity usage (usually from 0 to 1, but can be negative).

### lsbTools.rc4(key)
Return RC4 cipher initialized from `key` (array of bytes) as object with following methods:

#### rc4.rc4Rnd()
Return next byte from RC4 keystream.

#### rc4.rc4RndFloat()
Reads four bytes from RC4 keystream and returns real value derived from them. Value in [0,1] range.

## CLI tool
If lsbtools module installed globally with npm, then you can use it from command line. Only png images are supported as input.

Here is help output of this tool:

```none
  usage:

    embed:   lsbtools -eb -p password -d message.txt -o secret.png clean.png
    extract: lsbtools -xb -p password -d hidden.txt secret.png

  options:

    -p, --password   password for shuffle.
    -e, --embed      hidde data in image.
    -x, --extract    extract hidden data from image.
    -s, --shuffle    embed with shuffle.
    -k, --mask       mask data.
    -m, --matrix     use matrix coding.
    -1, --plusminus1 use +-1 code instead of bit flip.
    -b, --best       best settings. Equals to -smM1.
    -d, --data       data for embedding.
    -o, --output     file for output.
    -t, --test       extract data but do not write it to disc.
    -C, --chitest    perform chi-squared test.
    -R, --rstest     perform RS Steganalysis.
    -a, --enhance    enhance LSB plane.
    -f, --fill       fill LSB plane with 0 or 1.
    -h, --help       show usage information.
```

## License
This code released under MIT license.

 [pngjs]: https://www.npmjs.com/package/pngjs
