var lsb = require('./lib/lsb.js'),
    rsDetect = require('./lib/rsdetect.js'),
    chiAttack = require('./lib/chi_attack.js'),
    rc4 = require('./lib/rc4.js');

module.exports = {
    rc4: rc4,
    read: lsb.read,
    write: lsb.write,
    enhance: lsb.enhance,
    fill: lsb.fill,
    chiAttack: chiAttack,
    rsDetect: rsDetect
};
