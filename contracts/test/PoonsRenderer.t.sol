// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PoonsRenderer} from "../src/PoonsRenderer.sol";
import {LibString} from "solady/utils/LibString.sol";

contract PoonsRendererTest is Test {
    PoonsRenderer r = new PoonsRenderer();

    /// Dumps SVG + rarity for keccak(i) seeds, plus forced special types; art/parity.js checks them
    /// byte-for-byte against the JS engine.
    function test_dumpParity() public {
        vm.createDir("./out-parity", true);
        for (uint256 i; i < 96; ++i) {
            uint256 seed = _seed(i);
            (uint256 tier, uint256 score) = r.rarity(seed);
            vm.writeFile(string.concat("./out-parity/", LibString.toString(i), ".svg"), r.svg(seed));
            vm.writeFile(
                string.concat("./out-parity/", LibString.toString(i), ".txt"),
                string.concat(LibString.toString(tier), " ", LibString.toString(score))
            );
        }
    }

    /// Seeds 0..63 random; 64..95 force each special type (Type reads the low 16 bits).
    function _seed(uint256 i) internal pure returns (uint256) {
        uint256 s = uint256(keccak256(abi.encode(i)));
        if (i < 64) return s;
        uint16[5] memory typeValues = [uint16(9851), 9901, 9936, 9966, 9991];
        return (s >> 16 << 16) | typeValues[i % 5];
    }

    function test_tokenURIGas() public view {
        for (uint256 i; i < 16; ++i) {
            uint256 g = gasleft();
            r.tokenURI(1, _seed(60 + i));
            assertLt(g - gasleft(), 30_000_000);
        }
    }
}
