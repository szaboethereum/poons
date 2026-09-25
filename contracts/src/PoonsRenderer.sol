// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoonsRenderer} from "./Poons.sol";
import {PoonsData as D} from "./PoonsData.sol";
import {LibString} from "solady/utils/LibString.sol";
import {Base64} from "solady/utils/Base64.sol";
import {DynamicBufferLib} from "solady/utils/DynamicBufferLib.sol";

/// @title PoonsRenderer
/// @notice Fully on-chain 32x32 pixel renderer. Mirrors art/poons-art.js step for step:
///         seed -> trait indices -> compose shapes into a slot grid -> ink outline -> smoke ->
///         dithered background -> one <path> per colour with horizontal runs merged.
contract PoonsRenderer is IPoonsRenderer {
    using DynamicBufferLib for DynamicBufferLib.DynamicBuffer;

    uint256 private constant N = 32;
    uint256 private constant TRAITS = 11;
    uint256 private constant GHOST = 1; // Type flags
    uint256 private constant SKELETON = 2;
    uint256 private constant DIM_EYES = 1; // Glasses flags
    uint256 private constant HIDE_EYES = 2;

    function traits(uint256 seed) public pure returns (uint8[TRAITS] memory idx) {
        for (uint256 k; k < TRAITS; ++k) {
            bytes memory w = D.weights(k);
            uint256 n = w.length / 2;
            uint256 total;
            for (uint256 i; i < n; ++i) total += _u16(w, i);
            uint256 r = ((seed >> (16 * k)) & 0xffff) % total;
            uint256 pick = n - 1;
            for (uint256 i; i < n; ++i) {
                uint256 wi = _u16(w, i);
                if (r < wi) {
                    pick = i;
                    break;
                }
                r -= wi;
            }
            idx[k] = uint8(pick);
        }
    }

    /// @return tier 0 Common .. 4 Legendary, and the rarity score.
    function rarity(uint256 seed) public pure returns (uint256 tier, uint256 score) {
        uint8[TRAITS] memory idx = traits(seed);
        for (uint256 k; k < TRAITS; ++k) score += uint8(D.points(k)[idx[k]]);
        if (idx[D.T_TYPE] != 0) return (4, score);
        if (score >= D.TIER_EPIC) return (3, score);
        if (score >= D.TIER_RARE) return (2, score);
        if (score >= D.TIER_UNCOMMON) return (1, score);
        return (0, score);
    }

    function grid(uint256 seed) public pure returns (bytes memory out) {
        uint8[TRAITS] memory idx = traits(seed);
        bytes memory g = new bytes(N * N);
        uint256 tf = _v(D.T_TYPE, idx, 3);
        bool ghost = tf & GHOST != 0;
        bool skel = tf & SKELETON != 0;

        if (ghost) {
            _draw(g, D.GHOST_TAIL, 0, false);
        } else {
            _draw(g, skel ? D.SHIRT_RIBS : _v(D.T_SHIRT, idx, 0), 0, false);
            _draw(g, D.HANDS, 0, false);
        }
        _draw(g, D.HEAD, 0, false);
        _draw(g, D.ROOF, 0, false);
        _draw(g, D.CHIMNEY, 0, false);
        _drawOpt(g, _v(D.T_TOPPER, idx, 0));

        uint256 gflags = _v(D.T_GLASSES, idx, 3);
        if (!ghost && !skel) {
            _draw(g, _v(D.T_GLASSES, idx, 0), 0, false);
            uint256 lens = _v(D.T_GLASSES, idx, 1);
            if (lens != D.NONE) {
                _draw(g, lens, 0, false);
                _draw(g, lens, 12, true);
            }
            _drawOpt(g, _v(D.T_GLASSES, idx, 2));
        }

        if (skel) {
            _draw(g, D.EYE_SOCKET, 0, false);
            _draw(g, D.EYE_SOCKET, 11, false);
        } else if (ghost) {
            _draw(g, D.EYE_GHOST, 0, false);
            _draw(g, D.EYE_GHOST, 11, false);
        } else if (gflags & HIDE_EYES != 0) {
            // visor covers the eyes
        } else if (gflags & DIM_EYES != 0) {
            _draw(g, D.EYE_DIM, 0, false);
            _draw(g, D.EYE_DIM, 11, false);
        } else {
            _draw(g, _v(D.T_EYES, idx, 0), 0, false);
            _draw(g, _v(D.T_EYES, idx, 1), 11, false);
        }

        if (skel) {
            _draw(g, D.NOSE_SKULL, 0, false);
            _draw(g, D.MOUTH_TEETH, 0, false);
        } else if (ghost) {
            _draw(g, D.MOUTH_OO, 0, false);
        } else {
            _draw(g, D.NOSE, 0, false);
            _drawOpt(g, _v(D.T_MOUTH, idx, 0));
        }
        _drawOpt(g, _v(D.T_ITEM, idx, 0));

        // 1px ink outline around the character (4-neighbourhood).
        out = new bytes(N * N);
        for (uint256 y; y < N; ++y) {
            for (uint256 x; x < N; ++x) {
                uint256 i = y * N + x;
                if (g[i] != 0) {
                    out[i] = g[i];
                } else if (
                    (x > 0 && g[i - 1] != 0) || (x < N - 1 && g[i + 1] != 0) || (y > 0 && g[i - N] != 0)
                        || (y < N - 1 && g[i + N] != 0)
                ) {
                    out[i] = bytes1(uint8(D.SLOT_INK));
                }
            }
        }

        // Smoke and the Founding Resident badge only fill empty cells (no outline).
        _fillEmpty(out, _v(D.T_SMOKE, idx, 0));
        if (isFounder(seed)) _fillEmpty(out, D.BADGE_FOUNDER);

        bytes memory glow = D.glowBits();
        bytes memory grad = D.gradBits();
        for (uint256 i; i < N * N; ++i) {
            if (out[i] != 0) continue;
            uint256 slot = _bit(glow, i) ? D.SLOT_GLOW : _bit(grad, i) ? D.SLOT_BG_B : D.SLOT_BG_A;
            out[i] = bytes1(uint8(slot));
        }
    }

    /// @notice Bit 255 of the seed: the wallet qualified on the bonding curve, before graduation.
    function isFounder(uint256 seed) public pure returns (bool) {
        return seed >> 255 == 1;
    }

    function svg(uint256 seed) public pure returns (string memory) {
        bytes memory g = grid(seed);
        bytes memory pal = _palette(traits(seed));

        // One pass over the grid, appending each horizontal run to its colour's path.
        DynamicBufferLib.DynamicBuffer[] memory paths = new DynamicBufferLib.DynamicBuffer[](D.SLOT_COUNT);
        for (uint256 y; y < N; ++y) {
            uint256 x;
            while (x < N) {
                uint8 s = uint8(g[y * N + x]);
                uint256 e = x + 1;
                while (e < N && uint8(g[y * N + e]) == s) ++e;
                string memory len = LibString.toString(e - x);
                paths[s].p(
                    abi.encodePacked("M", LibString.toString(x), " ", LibString.toString(y), "h", len, "v1h-", len, "z")
                );
                x = e;
            }
        }

        DynamicBufferLib.DynamicBuffer memory buf;
        buf.p(bytes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">'));
        for (uint256 s = 1; s < D.SLOT_COUNT; ++s) {
            if (paths[s].data.length == 0) continue;
            buf.p(bytes('<path fill="#'), bytes(_hex3(pal, s)), bytes('" d="'), paths[s].data, bytes('"/>'));
        }
        buf.p(bytes("</svg>"));
        return buf.s();
    }

    function tokenURI(uint256 tokenId, uint256 seed) external pure returns (string memory) {
        uint8[TRAITS] memory idx = traits(seed);
        (uint256 tier, uint256 score) = rarity(seed);
        DynamicBufferLib.DynamicBuffer memory attrs;
        for (uint256 k; k < TRAITS; ++k) {
            string memory value = D.specialLabel(idx[D.T_TYPE], k);
            if (bytes(value).length == 0) value = D.optionName(k, idx[k]);
            attrs.p(bytes('{"trait_type":"'), bytes(D.traitName(k)), bytes('","value":"'), bytes(value), bytes('"},'));
        }
        if (isFounder(seed)) attrs.p(bytes('{"trait_type":"Founding Resident","value":"Yes"},'));
        attrs.p(bytes('{"trait_type":"Rarity","value":"'), bytes(_tierName(tier)), bytes('"},'));
        attrs.p(bytes('{"trait_type":"Rarity Score","display_type":"number","value":'), bytes(LibString.toString(score)), bytes("}"));

        bytes memory json = abi.encodePacked(
            '{"name":"Poon #',
            LibString.toString(tokenId),
            '","description":"Poons: one free Poon for every wallet that bought $10+ on Pons and held. 3333 max. Fully on-chain pixel art.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg(seed))),
            '","attributes":[',
            attrs.data,
            "]}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    // ---------------------------------------------------------------- internals

    function _tierName(uint256 t) private pure returns (string memory) {
        if (t == 4) return "Legendary";
        if (t == 3) return "Epic";
        if (t == 2) return "Rare";
        if (t == 1) return "Uncommon";
        return "Common";
    }

    function _v(uint256 k, uint8[TRAITS] memory idx, uint256 which) private pure returns (uint256) {
        return uint8(D.variants(k)[uint256(idx[k]) * 4 + which]);
    }

    function _fillEmpty(bytes memory out, uint256 shape) private pure {
        if (shape == D.NONE) return;
        (uint256 a, uint256 b) = _range(shape);
        bytes memory sh = D.shapes();
        for (uint256 r = a; r < b; ++r) {
            uint256 y = uint8(sh[r * 4]);
            uint256 x = uint8(sh[r * 4 + 1]);
            uint256 len = uint8(sh[r * 4 + 2]);
            bytes1 s = sh[r * 4 + 3];
            for (uint256 j; j < len; ++j) {
                if (out[y * N + x + j] == 0) out[y * N + x + j] = s;
            }
        }
    }

    function _drawOpt(bytes memory g, uint256 shape) private pure {
        if (shape != D.NONE) _draw(g, shape, 0, false);
    }

    function _draw(bytes memory g, uint256 shape, uint256 dx, bool rightLens) private pure {
        (uint256 a, uint256 b) = _range(shape);
        bytes memory sh = D.shapes();
        for (uint256 r = a; r < b; ++r) {
            uint256 y = uint8(sh[r * 4]);
            uint256 x = uint8(sh[r * 4 + 1]) + dx;
            uint256 len = uint8(sh[r * 4 + 2]);
            uint8 s = uint8(sh[r * 4 + 3]);
            if (rightLens && s == D.SLOT_LENS_L) s = uint8(D.SLOT_LENS_R);
            for (uint256 j; j < len && x + j < N; ++j) {
                g[y * N + x + j] = bytes1(s);
            }
        }
    }

    function _range(uint256 shape) private pure returns (uint256, uint256) {
        bytes memory o = D.offsets();
        return (_u16(o, shape), _u16(o, shape + 1));
    }

    function _palette(uint8[TRAITS] memory idx) private pure returns (bytes memory pal) {
        pal = D.specialPalette(idx[D.T_TYPE]);
        if (pal.length != 0) return pal;
        pal = D.fixedPalette();
        for (uint256 k; k < TRAITS; ++k) {
            bytes memory sl = D.slots(k);
            if (sl.length == 0) continue;
            bytes memory c = D.colors(k);
            for (uint256 j; j < sl.length; ++j) {
                uint256 src = (uint256(idx[k]) * sl.length + j) * 3;
                uint256 dst = uint256(uint8(sl[j])) * 3;
                pal[dst] = c[src];
                pal[dst + 1] = c[src + 1];
                pal[dst + 2] = c[src + 2];
            }
        }
    }

    function _hex3(bytes memory pal, uint256 s) private pure returns (string memory) {
        bytes memory h = new bytes(6);
        bytes16 digits = "0123456789abcdef";
        for (uint256 j; j < 3; ++j) {
            uint8 v = uint8(pal[s * 3 + j]);
            h[j * 2] = digits[v >> 4];
            h[j * 2 + 1] = digits[v & 15];
        }
        return string(h);
    }

    function _u16(bytes memory b, uint256 i) private pure returns (uint256) {
        return (uint256(uint8(b[i * 2])) << 8) | uint8(b[i * 2 + 1]);
    }

    function _bit(bytes memory b, uint256 i) private pure returns (bool) {
        return (uint8(b[i >> 3]) >> (7 - (i & 7))) & 1 == 1;
    }
}
