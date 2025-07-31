// utils/crc16.js
// Based on the CRC16-CCITT-FALSE polynomial (used by Redis for CLUSTER KEYSLOT)

const crcTable = new Uint16Array(256).map((_, i) => {
  let crc = i << 8;
  for (let j = 0; j < 8; j++) {
    crc = (crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0);
  }
  return crc & 0xffff;
});

function crc16(str) {
  let crc = 0;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i);
    crc = ((crc << 8) ^ crcTable[((crc >> 8) ^ byte) & 0xff]) & 0xffff;
  }
  return crc;
}

module.exports = crc16;
