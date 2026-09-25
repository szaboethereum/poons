// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @notice TESTNET ONLY. Pons is not deployed on Robinhood Chain testnet, so this mimics the parts the
///         indexer reads: token Transfers from/to a curve, plus CurveBuy/CurveSell events with the same
///         signatures and data layout as the real Pons curve (verified against mainnet logs).
contract MockPonsToken is ERC20 {
    constructor(address curve, uint256 supply) {
        _mint(curve, supply);
    }

    function name() public pure override returns (string memory) {
        return "Poons Test Token";
    }

    function symbol() public pure override returns (string memory) {
        return "tPOONS";
    }
}

contract MockPonsCurve {
    // Same topics as mainnet: 0xec36bf57… / 0x8113d738…
    event CurveBuy(address indexed sender, address indexed recipient, uint256 ethIn, uint256 tokensOut, uint256 fee, uint256 extra);
    event CurveSell(address indexed sender, address indexed recipient, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256 extra);

    MockPonsToken public token;
    /// Tokens per 1 ETH (after fee). Constant price keeps test maths obvious.
    uint256 public immutable tokensPerEth;

    constructor(uint256 tokensPerEth_) {
        tokensPerEth = tokensPerEth_;
        token = new MockPonsToken(address(this), 1_000_000_000 ether);
    }

    function buy() external payable {
        uint256 fee = msg.value / 100;
        uint256 ethIn = msg.value - fee;
        uint256 out = ethIn * tokensPerEth / 1 ether;
        token.transfer(msg.sender, out);
        emit CurveBuy(msg.sender, msg.sender, ethIn, out, fee, 0);
    }

    function sell(uint256 tokensIn) external {
        token.transferFrom(msg.sender, address(this), tokensIn);
        uint256 gross = tokensIn * 1 ether / tokensPerEth;
        uint256 fee = gross / 100;
        emit CurveSell(msg.sender, msg.sender, tokensIn, gross - fee, fee, 0);
        (bool ok,) = msg.sender.call{value: gross - fee}("");
        require(ok);
    }

    receive() external payable {}
}
