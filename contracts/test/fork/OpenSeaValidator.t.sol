// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Poons} from "../../src/Poons.sol";

/// Run: forge test --match-path test/fork/* --fork-url https://rpc.mainnet.chain.robinhood.com
/// Checks our hook against OpenSea's real validator on Robinhood Chain mainnet.
contract OpenSeaValidatorForkTest is Test {
    address constant VALIDATOR = 0xA000027A9B2802E1ddf7000061001e5c005A0000;

    function test_realValidator() public {
        if (VALIDATOR.code.length == 0) return; // not on a fork
        address minter = address(0xB0B);
        address alice = address(0xA11CE);
        Poons p = new Poons(address(this), minter, 3333, VALIDATOR);
        p.setMintOpen(true);
        Poons.Drop[] memory w = new Poons.Drop[](1);
        w[0] = Poons.Drop(alice, true);
        vm.prank(minter);
        p.drop(w); // mint passes through

        vm.prank(alice);
        p.transferFrom(alice, address(0xCAFE), 1); // holder moves own Poon: allowed
        assertEq(p.ownerOf(1), address(0xCAFE));

        address randomMarket = address(0xDEAD01);
        vm.prank(address(0xCAFE));
        p.setApprovalForAll(randomMarket, true);
        vm.prank(randomMarket);
        vm.expectRevert(); // non-OpenSea operator: blocked, so fees can't be skipped
        p.transferFrom(address(0xCAFE), randomMarket, 1);
    }
}
