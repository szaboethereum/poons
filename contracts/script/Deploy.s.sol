// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Poons} from "../src/Poons.sol";
import {PoonsRenderer} from "../src/PoonsRenderer.sol";

/// Mainnet: renderer + Poons. The token itself is launched on Pons (ponsfamily.com). See ./deploy.sh.
/// env: MINTER_ADDRESS, MAX_SUPPLY (default 3333). The deployer owns the contract and receives creator fees.
contract Deploy is Script {
    /// OpenSea's creator-fee transfer validator (StrictAuthorizedTransferSecurityRegistry), deployed on
    /// Robinhood Chain mainnet.
    address constant OPENSEA_VALIDATOR = 0xA000027A9B2802E1ddf7000061001e5c005A0000;

    function run() external {
        vm.startBroadcast();
        PoonsRenderer renderer = new PoonsRenderer();
        Poons poons = new Poons(msg.sender, vm.envAddress("MINTER_ADDRESS"), vm.envOr("MAX_SUPPLY", uint256(3333)), vm.envOr("TRANSFER_VALIDATOR", OPENSEA_VALIDATOR));
        poons.setRenderer(renderer);
        vm.stopBroadcast();
        console.log("POONS=%s", address(poons));
        console.log("RENDERER=%s", address(renderer));
    }
}
