// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Poons, ICreatorToken, ITransferValidator} from "../src/Poons.sol";
import {PoonsRenderer} from "../src/PoonsRenderer.sol";
import {MockPonsCurve, MockPonsToken} from "../src/mock/MockPons.sol";

/// Mimics OpenSea's registry: holders may move their own tokens, other operators are rejected
/// unless whitelisted (in production: Seaport with OpenSea's zone).
contract MockValidator is ITransferValidator {
    address public allowedOperator;

    constructor(address op) {
        allowedOperator = op;
    }

    function validateTransfer(address caller, address from, address, uint256) external view {
        require(caller == from || caller == allowedOperator, "operator not allowed");
    }
}

contract PoonsTest is Test {
    Poons poons;
    address owner = address(0xA11CE);
    address minter = address(0xB0B);
    address alice = address(0x1);
    address bob = address(0x2);

    function setUp() public {
        poons = new Poons(owner, minter, 3333, address(0));
        vm.prank(owner);
        poons.setMintOpen(true);
    }

    function _open(Poons p) internal {
        vm.prank(owner);
        p.setMintOpen(true);
    }

    function _two(address a, address b) internal pure returns (Poons.Drop[] memory w) {
        w = new Poons.Drop[](2);
        w[0] = Poons.Drop(a, false);
        w[1] = Poons.Drop(b, false);
    }

    function test_onePerWallet() public {
        vm.prank(minter);
        poons.drop(_two(alice, bob));
        assertEq(poons.balanceOf(alice), 1);
        assertEq(poons.balanceOf(bob), 1);
        assertEq(poons.totalSupply(), 2);

        // Retry / duplicate submission -> nothing new.
        vm.prank(minter);
        poons.drop(_two(alice, alice));
        assertEq(poons.totalSupply(), 2);
        assertEq(poons.dropOf(alice), 1);
    }

    function test_movingTheNftDoesNotReopenEligibility() public {
        vm.prank(minter);
        poons.drop(_two(alice, address(0)));
        vm.prank(alice);
        poons.transferFrom(alice, bob, 1);
        vm.prank(minter);
        poons.drop(_two(alice, address(0)));
        assertEq(poons.totalSupply(), 1);
    }

    function test_capIsRespected() public {
        Poons small = new Poons(owner, minter, 2, address(0));
        _open(small);
        Poons.Drop[] memory w = new Poons.Drop[](5);
        for (uint160 i; i < 5; ++i) w[i] = Poons.Drop(address(i + 10), false);
        vm.prank(minter);
        small.drop(w);
        assertEq(small.totalSupply(), 2);
        assertEq(small.dropOf(address(12)), 0);
    }

    function test_onlyMinter() public {
        vm.expectRevert();
        poons.drop(_two(alice, bob));
    }

    function test_seedsDifferPerWallet() public {
        vm.prank(minter);
        poons.drop(_two(alice, bob));
        assertTrue(poons.seedOf(1) != poons.seedOf(2));
    }

    function test_rendererLock() public {
        PoonsRenderer r = new PoonsRenderer();
        vm.startPrank(owner);
        poons.setRenderer(r);
        poons.lockRenderer();
        vm.expectRevert(Poons.RendererIsLocked.selector);
        poons.setRenderer(r);
        vm.stopPrank();

        vm.prank(minter);
        poons.drop(_two(alice, bob));
        assertGt(bytes(poons.tokenURI(1)).length, 1000);
    }

    function test_gasPer100Mints() public {
        Poons.Drop[] memory w = new Poons.Drop[](100);
        for (uint160 i; i < 100; ++i) w[i] = Poons.Drop(address(i + 10), true);
        vm.prank(minter);
        uint256 g = gasleft();
        poons.drop(w);
        emit log_named_uint("gas for 100 recipients", g - gasleft());
    }

    function test_mockCurveEmitsPonsTopics() public {
        MockPonsCurve curve = new MockPonsCurve(1_000_000 ether);
        vm.deal(alice, 1 ether);
        vm.recordLogs();
        vm.prank(alice);
        curve.buy{value: 0.01 ether}();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs[logs.length - 1].topics[0], bytes32(0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455));
        MockPonsToken t = curve.token();
        vm.startPrank(alice);
        t.approve(address(curve), type(uint256).max);
        vm.recordLogs();
        curve.sell(t.balanceOf(alice));
        logs = vm.getRecordedLogs();
        vm.stopPrank();
        assertEq(logs[logs.length - 1].topics[0], bytes32(0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df));
    }

    function test_creatorFeeIsFivePercentToOwner() public {
        (address to, uint256 fee) = poons.royaltyInfo(1, 1 ether);
        assertEq(to, owner);
        assertEq(fee, 0.05 ether);
        assertTrue(poons.supportsInterface(0x2a55205a));
        assertTrue(poons.supportsInterface(type(ICreatorToken).interfaceId));
        (bytes4 sel, bool isView) = poons.getTransferValidationFunction();
        assertEq(sel, bytes4(0xcaee23ea));
        assertTrue(isView);
    }

    function test_validatorGatesMarketplacesNotHolders() public {
        address seaport = address(0x5EA);
        address otherMarket = address(0xB1);
        Poons p = new Poons(owner, minter, 3333, address(new MockValidator(seaport)));
        _open(p);
        vm.prank(minter);
        p.drop(_two(alice, bob)); // mints are never validated

        vm.prank(alice);
        p.transferFrom(alice, address(0xCAFE), 1); // holder -> another wallet: free

        vm.prank(bob);
        p.setApprovalForAll(otherMarket, true);
        vm.prank(otherMarket);
        vm.expectRevert(bytes("operator not allowed"));
        p.transferFrom(bob, otherMarket, 2); // non-enforcing marketplace: blocked

        vm.prank(bob);
        p.setApprovalForAll(seaport, true);
        vm.prank(seaport);
        p.transferFrom(bob, address(0xBEEF), 2); // fee-enforcing marketplace: allowed
        assertEq(p.ownerOf(2), address(0xBEEF));
    }

    function test_mintStartsClosedAndOnlyOwnerOpens() public {
        Poons fresh = new Poons(owner, minter, 3333, address(0));
        assertFalse(fresh.mintOpen());
        vm.prank(minter);
        vm.expectRevert(Poons.MintClosed.selector);
        fresh.drop(_two(alice, bob));

        vm.prank(minter);
        vm.expectRevert();
        fresh.setMintOpen(true); // the minter can't open it

        _open(fresh);
        vm.prank(minter);
        fresh.drop(_two(alice, bob));
        assertEq(fresh.totalSupply(), 2);

        vm.prank(owner);
        fresh.setMintOpen(false); // and it can be paused again
        vm.prank(minter);
        vm.expectRevert(Poons.MintClosed.selector);
        fresh.drop(_two(address(0x3), address(0x4)));
    }

    function test_founderFlagLivesInSeedBit255() public {
        Poons.Drop[] memory w = _two(alice, bob);
        w[0].founder = true;
        vm.prank(minter);
        poons.drop(w);
        assertEq(poons.seedOf(1) >> 255, 1);
        assertEq(poons.seedOf(2) >> 255, 0);
    }

    function test_royaltyReceiverCanMoveWithoutOwnership() public {
        vm.expectRevert();
        poons.setRoyaltyReceiver(address(0x7EA));
        vm.prank(owner);
        poons.setRoyaltyReceiver(address(0x7EA));
        (address to,) = poons.royaltyInfo(1, 100);
        assertEq(to, address(0x7EA));
        assertEq(poons.owner(), owner);
    }

    function test_onlyOwnerSetsValidator() public {
        vm.expectRevert();
        poons.setTransferValidator(address(1));
        vm.prank(owner);
        poons.setTransferValidator(address(1));
        assertEq(poons.getTransferValidator(), address(1));
    }
}
