#!/usr/bin/env python
"""生成一个符合 Repentance 存档格式的合成样本, 用于自动化测试。"""
import struct
import sys

CRC_TABLE = [
    0x00000000, 0x09073096, 0x120E612C, 0x1B0951BA, 0xFF6DC419, 0xF66AF48F, 0xED63A535, 0xE46495A3,
    0xFEDB8832, 0xF7DCB8A4, 0xECD5E91E, 0xE5D2D988, 0x01B64C2B, 0x08B17CBD, 0x13B82D07, 0x1ABF1D91,
    0xFDB71064, 0xF4B020F2, 0xEFB97148, 0xE6BE41DE, 0x02DAD47D, 0x0BDDE4EB, 0x10D4B551, 0x19D385C7,
    0x036C9856, 0x0A6BA8C0, 0x1162F97A, 0x1865C9EC, 0xFC015C4F, 0xF5066CD9, 0xEE0F3D63, 0xE7080DF5,
    0xFB6E20C8, 0xF269105E, 0xE96041E4, 0xE0677172, 0x0403E4D1, 0x0D04D447, 0x160D85FD, 0x1F0AB56B,
    0x05B5A8FA, 0x0CB2986C, 0x17BBC9D6, 0x1EBCF940, 0xFAD86CE3, 0xF3DF5C75, 0xE8D60DCF, 0xE1D13D59,
    0x06D930AC, 0x0FDE003A, 0x14D75180, 0x1DD06116, 0xF9B4F4B5, 0xF0B3C423, 0xEBBA9599, 0xE2BDA50F,
    0xF802B89E, 0xF1058808, 0xEA0CD9B2, 0xE30BE924, 0x076F7C87, 0x0E684C11, 0x15611DAB, 0x1C662D3D,
    0xF6DC4190, 0xFFDB7106, 0xE4D220BC, 0xEDD5102A, 0x09B18589, 0x00B6B51F, 0x1BBFE4A5, 0x12B8D433,
    0x0807C9A2, 0x0100F934, 0x1A09A88E, 0x130E9818, 0xF76A0DBB, 0xFE6D3D2D, 0xE5646C97, 0xEC635C01,
    0x0B6B51F4, 0x026C6162, 0x196530D8, 0x1062004E, 0xF40695ED, 0xFD01A57B, 0xE608F4C1, 0xEF0FC457,
    0xF5B0D9C6, 0xFCB7E950, 0xE7BEB8EA, 0xEEB9887C, 0x0ADD1DDF, 0x03DA2D49, 0x18D37CF3, 0x11D44C65,
    0x0DB26158, 0x04B551CE, 0x1FBC0074, 0x16BB30E2, 0xF2DFA541, 0xFBD895D7, 0xE0D1C46D, 0xE9D6F4FB,
    0xF369E96A, 0xFA6ED9FC, 0xE1678846, 0xE860B8D0, 0x0C042D73, 0x05031DE5, 0x1E0A4C5F, 0x170D7CC9,
    0xF005713C, 0xF90241AA, 0xE20B1010, 0xEB0C2086, 0x0F68B525, 0x066F85B3, 0x1D66D409, 0x1461E49F,
    0x0EDEF90E, 0x07D9C998, 0x1CD09822, 0x15D7A8B4, 0xF1B33D17, 0xF8B40D81, 0xE3BD5C3B, 0xEABA6CAD,
    0xEDB88320, 0xE4BFB3B6, 0xFFB6E20C, 0xF6B1D29A, 0x12D54739, 0x1BD277AF, 0x00DB2615, 0x09DC1683,
    0x13630B12, 0x1A643B84, 0x016D6A3E, 0x086A5AA8, 0xEC0ECF0B, 0xE509FF9D, 0xFE00AE27, 0xF7079EB1,
    0x100F9344, 0x1908A3D2, 0x0201F268, 0x0B06C2FE, 0xEF62575D, 0xE66567CB, 0xFD6C3671, 0xF46B06E7,
    0xEED41B76, 0xE7D32BE0, 0xFCDA7A5A, 0xF5DD4ACC, 0x11B9DF6F, 0x18BEEFF9, 0x03B7BE43, 0x0AB08ED5,
    0x16D6A3E8, 0x1FD1937E, 0x04D8C2C4, 0x0DDFF252, 0xE9BB67F1, 0xE0BC5767, 0xFBB506DD, 0xF2B2364B,
    0xE80D2BDA, 0xE10A1B4C, 0xFA034AF6, 0xF3047A60, 0x1760EFC3, 0x1E67DF55, 0x056E8EEF, 0x0C69BE79,
    0xEB61B38C, 0xE266831A, 0xF96FD2A0, 0xF068E236, 0x140C7795, 0x1D0B4703, 0x060216B9, 0x0F05262F,
    0x15BA3BBE, 0x1CBD0B28, 0x07B45A92, 0x0EB36A04, 0xEAD7FFA7, 0xE3D0CF31, 0xF8D99E8B, 0xF1DEAE1D,
    0x1B64C2B0, 0x1263F226, 0x096AA39C, 0x006D930A, 0xE40906A9, 0xED0E363F, 0xF6076785, 0xFF005713,
    0xE5BF4A82, 0xECB87A14, 0xF7B12BAE, 0xFEB61B38, 0x1AD28E9B, 0x13D5BE0D, 0x08DCEFB7, 0x01DBDF21,
    0xE6D3D2D4, 0xEFD4E242, 0xF4DDB3F8, 0xFDDA836E, 0x19BE16CD, 0x10B9265B, 0x0BB077E1, 0x02B74777,
    0x18085AE6, 0x110F6A70, 0x0A063BCA, 0x03010B5C, 0xE7659EFF, 0xEE62AE69, 0xF56BFFD3, 0xFC6CCF45,
    0xE00AE278, 0xE90DD2EE, 0xF2048354, 0xFB03B3C2, 0x1F672661, 0x166016F7, 0x0D69474D, 0x046E77DB,
    0x1ED16A4A, 0x17D65ADC, 0x0CDF0B66, 0x05D83BF0, 0xE1BCAE53, 0xE8BB9EC5, 0xF3B2CF7F, 0xFAB5FFE9,
    0x1DBDF21C, 0x14BAC28A, 0x0FB39330, 0x06B4A3A6, 0xE2D03605, 0xEBD70693, 0xF0DE5729, 0xF9D967BF,
    0xE3667A2E, 0xEA614AB8, 0xF1681B02, 0xF86F2B94, 0x1C0BBE37, 0x150C8EA1, 0x0E05DF1B, 0x0702EF8D,
]


def checksum(data: bytes, ofs: int, length: int) -> int:
    crc = (~0xFEDCBA76) & 0xFFFFFFFF
    for i in range(ofs, ofs + length):
        crc = CRC_TABLE[(crc & 0xFF) ^ data[i]] ^ (crc >> 8)
    return (~crc) & 0xFFFFFFFF


def chunk_u1(type_id: int, values: bytes) -> bytes:
    return struct.pack('<ii', type_id, len(values)) + struct.pack('<i', len(values)) + values


def chunk_s4(type_id: int, values: list) -> bytes:
    body = struct.pack('<i', len(values)) + b''.join(struct.pack('<i', v) for v in values)
    return struct.pack('<ii', type_id, len(body) - 4) + body


def build_sample() -> bytes:
    out = bytearray()
    out += b'ISAACNGSAVE09R  '          # 16 字节魔数
    out += b'\x00' * 4                   # 0x10: kaitai 标注为 crc 的 4 字节

    # chunk 1: 成就, count=638 (含第 0 位), 解锁 id: 1,2,3,5,8,100,637
    ach = bytearray(638)
    for i in (1, 2, 3, 5, 8, 100, 637):
        ach[i] = 1
    out += chunk_u1(1, bytes(ach))

    # chunk 2: 计数器
    counters = [0] * 400
    counters[1] = 77    # Mom Kills
    counters[10] = 42   # Deaths
    counters[21] = 13   # Eden Tokens
    counters[22] = 5    # Win Streak
    counters[23] = 9    # Best Streak
    out += chunk_s4(2, counters)

    out += chunk_s4(3, [0] * 100)                    # level counters
    items = bytearray(733)
    for i in (1, 5, 105, 400):
        items[i] = 1
    out += chunk_u1(4, bytes(items))                 # collectibles
    out += chunk_u1(5, bytes(20))                    # minibosses
    out += chunk_u1(6, bytes(100))                   # bosses
    ch = bytearray(46)
    ch[1] = ch[7] = 1
    out += chunk_u1(7, bytes(ch))                    # challenges
    out += chunk_s4(8, [0] * 30)                     # cutscenes
    out += chunk_s4(9, [0] * 10)                     # game settings
    out += chunk_u1(10, bytes(10))                   # special seeds

    # chunk 11: 图鉴 (2 组); count 字段 = 键值对数量 * 4 (依据 ksy: repeat = count/4)
    bestiary = struct.pack('<I', 2)
    bestiary += struct.pack('<ii', 1, 8)             # encounters, 2 对
    bestiary += struct.pack('<iiii', 100, 5, 101, 3)
    bestiary += struct.pack('<ii', 2, 4)             # kills, 1 对
    bestiary += struct.pack('<ii', 100, 12)
    out += struct.pack('<ii', 11, len(bestiary)) + bestiary

    crc = checksum(bytes(out), 0x10, len(out) - 0x10)
    out += struct.pack('<I', crc)
    return bytes(out)


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'sample_save.dat'
    data = build_sample()
    with open(path, 'wb') as f:
        f.write(data)
    print(f'written {path} ({len(data)} bytes), crc={data[-4:].hex()}')
