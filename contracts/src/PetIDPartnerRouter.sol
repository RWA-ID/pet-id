// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

interface IPetSubnameRegistrar {
    function register(bytes32 parentNode, string calldata label, bytes calldata contenthash) external payable;
    function registrationFee() external view returns (uint256);
    function isAvailable(bytes32 parentNode, string calldata label) external view returns (bool);
}

interface INameWrapperERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function ownerOf(uint256 id) external view returns (address);
}

/**
 * @title PetIDPartnerRouter
 * @notice Lets pet shops / vets resell PetID registrations at their own price.
 *
 *         A partner sets a price (>= the registrar's base fee). A pet owner
 *         registers through the router paying the partner's price; the router
 *         forwards the base fee to the live PetSubnameRegistrar v3, receives
 *         the wrapped subname (the registrar mints to msg.sender), hands it to
 *         the buyer, and credits the margin to the partner (pull-payment).
 *
 *         The v3 registrar at 0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1 is
 *         untouched — names minted through the router are indistinguishable
 *         on-chain from direct registrations.
 */
contract PetIDPartnerRouter is Ownable, ReentrancyGuard, ERC1155Holder {

    // ── Immutables ────────────────────────────────────────────────
    IPetSubnameRegistrar  public immutable registrar;
    INameWrapperERC1155   public immutable nameWrapper;

    // ── Partner state ─────────────────────────────────────────────
    /// Full price a partner charges, in wei. 0 = inactive partner.
    mapping(address => uint256) public partnerPrice;
    /// Display name shown in the widget ("Happy Paws Clinic").
    mapping(address => string) public partnerName;
    /// Withdrawable balances (partners + platform treasury).
    mapping(address => uint256) public earnings;
    /// Sum of all unwithdrawn earnings — anything above this is sweepable dust.
    uint256 public totalOwed;

    // ── Platform fee (share of the partner margin, not of the base fee) ──
    uint256 public platformFeeBps;
    uint256 public constant MAX_PLATFORM_FEE_BPS = 3000; // 30% hard cap
    address public platformTreasury;

    // ── Events ────────────────────────────────────────────────────
    event PartnerUpdated(address indexed partner, uint256 price, string name);
    event PartnerRegistration(
        address indexed partner,
        bytes32 indexed parentNode,
        string  label,
        bytes32 indexed subnameNode,
        address buyer,
        uint256 pricePaid,
        uint256 partnerShare,
        uint256 platformCut
    );
    event Withdrawn(address indexed account, uint256 amount);
    event PlatformFeeUpdated(uint256 bps);
    event PlatformTreasuryUpdated(address treasury);

    constructor(address _registrar, address _nameWrapper) Ownable(msg.sender) {
        registrar = IPetSubnameRegistrar(_registrar);
        nameWrapper = INameWrapperERC1155(_nameWrapper);
        platformTreasury = msg.sender;
    }

    // ── Partner self-service ──────────────────────────────────────

    /**
     * @notice Set (or update) your resale price and display name.
     *         Price 0 deactivates the partner.
     */
    function setPartner(uint256 price, string calldata name) external {
        require(price == 0 || price >= registrar.registrationFee(), "Price below base fee");
        partnerPrice[msg.sender] = price;
        partnerName[msg.sender] = name;
        emit PartnerUpdated(msg.sender, price, name);
    }

    // ── Registration ──────────────────────────────────────────────

    /**
     * @notice Register a subname through a partner at the partner's price.
     *         The subname (wrapped ENS NFT) is delivered to msg.sender and
     *         the contenthash is already set by the registrar.
     * @param parentNode  namehash of dogid.eth or catid.eth
     * @param label       e.g. "max"
     * @param contenthash IPFS contenthash bytes (optional)
     * @param partner     partner wallet whose price applies
     */
    function registerViaPartner(
        bytes32 parentNode,
        string calldata label,
        bytes calldata contenthash,
        address partner
    ) external payable nonReentrant {
        uint256 price = partnerPrice[partner];
        require(price > 0, "Unknown or inactive partner");

        uint256 baseFee = registrar.registrationFee();
        require(price >= baseFee, "Partner price below base fee");
        require(msg.value >= price, "Insufficient payment");

        // Registrar mints to msg.sender (this router) and sets the contenthash.
        registrar.register{value: baseFee}(parentNode, label, contenthash);

        // Deliver the wrapped subname to the buyer.
        bytes32 subnameNode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        nameWrapper.safeTransferFrom(address(this), msg.sender, uint256(subnameNode), 1, "");

        // Credit the margin (pull-payment — partners withdraw at any time).
        uint256 margin = price - baseFee;
        uint256 platformCut = (margin * platformFeeBps) / 10_000;
        uint256 partnerShare = margin - platformCut;
        if (partnerShare > 0) {
            earnings[partner] += partnerShare;
            totalOwed += partnerShare;
        }
        if (platformCut > 0) {
            earnings[platformTreasury] += platformCut;
            totalOwed += platformCut;
        }

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, "Refund failed");
        }

        emit PartnerRegistration(
            partner, parentNode, label, subnameNode,
            msg.sender, price, partnerShare, platformCut
        );
    }

    // ── Withdrawals ───────────────────────────────────────────────

    function withdraw() external nonReentrant {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        earnings[msg.sender] = 0;
        totalOwed -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ── Views ─────────────────────────────────────────────────────

    /// Everything the widget needs in one call.
    function partnerInfo(address partner)
        external
        view
        returns (uint256 price, string memory name, uint256 baseFee, uint256 accrued)
    {
        return (partnerPrice[partner], partnerName[partner], registrar.registrationFee(), earnings[partner]);
    }

    // ── Admin ─────────────────────────────────────────────────────

    function setPlatformFee(uint256 bps) external onlyOwner {
        require(bps <= MAX_PLATFORM_FEE_BPS, "Fee too high");
        platformFeeBps = bps;
        emit PlatformFeeUpdated(bps);
    }

    function setPlatformTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Zero address");
        platformTreasury = treasury;
        emit PlatformTreasuryUpdated(treasury);
    }

    /// Sweep ETH that isn't owed to anyone (stray transfers / dust).
    function sweep(address payable to) external onlyOwner {
        uint256 free = address(this).balance - totalOwed;
        require(free > 0, "Nothing to sweep");
        (bool ok, ) = to.call{value: free}("");
        require(ok, "Sweep failed");
    }

    /// Accept refunds from the registrar (e.g. if the base fee drops mid-tx).
    receive() external payable {}
}
