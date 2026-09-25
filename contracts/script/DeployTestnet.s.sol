// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Poons} from "../src/Poons.sol";
import {PoonsRenderer} from "../src/PoonsRenderer.sol";
import {MockPonsCurve} from "../src/mock/MockPons.sol";

/// Testnet: mock Pons curve + token, renderer, Poons. See ./deploy.sh.
/// env: MINTER_ADDRESS, MAX_SUPPLY (default 3333). No transfer validator: OpenSea's isn't on testnet.
contract DeployTestnet is Script {
    function run() external {
        vm.startBroadcast();
        // ~ $0.00001/token at $2,700 ETH: $10 buys ~1M tokens, like a fresh Pons launch.
        MockPonsCurve curve = new MockPonsCurve(270_000_000 ether);
        PoonsRenderer renderer = new PoonsRenderer();
        Poons poons = new Poons(msg.sender, vm.envAddress("MINTER_ADDRESS"), vm.envOr("MAX_SUPPLY", uint256(3333)), address(0));
        poons.setRenderer(renderer);
        vm.stopBroadcast();
        console.log("CURVE=%s", address(curve));
        console.log("TOKEN=%s", address(curve.token()));
        console.log("POONS=%s", address(poons));
        console.log("RENDERER=%s", address(renderer));
    }
}
