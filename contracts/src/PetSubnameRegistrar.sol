// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INameWrapper {
    // Used to mint wrapped subnames
    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);

    // Check if a subname is already minted
    function ownerOf(uint256 id) external view returns (address);

    // Check that this contract is approved to act on parent owner's behalf
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

interface IPublicResolver {
    function setContenthash(bytes32 node, bytes memory hash) external;
    function setAddr(bytes32 node, address addr) external;
}

// NameWrapper fuse constants
// Burning PARENT_CANNOT_CONTROL means the parent can never revoke the subname —
// the holder gets true permanent ownership as an NFT in the NameWrapper.
uint32 constant PARENT_CANNOT_CONTROL = 1 << 17;
uint32 constant CANNOT_UNWRAP         = 1;    // required before PARENT_CANNOT_CONTROL

contract PetSubnameRegistrar is Ownable, ReentrancyGuard {

    // ── Immutables ────────────────────────────────────────────────
    INameWrapper    public immutable nameWrapper;
    IENSRegistry    public immutable ensRegistry;
    IPublicResolver public immutable resolver;
    bytes32         public immutable parentNode;

    // ── State ─────────────────────────────────────────────────────
    uint256 public registrationFee = 0.005 ether;

    // ── Events ───────────────────────────────────────────────────
    event SubnameRegistered(
        string  label,
        bytes32 indexed subnameNode,
        address indexed owner,
        bytes   contenthash,
        bool    permanent
    );
    event FeeUpdated(uint256 newFee);
    event Withdrawn(address to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────
    constructor(
        address _nameWrapper,
        address _ensRegistry,
        address _resolver,
        bytes32 _parentNode
    ) Ownable(msg.sender) {
        nameWrapper  = INameWrapper(_nameWrapper);
        ensRegistry  = IENSRegistry(_ensRegistry);
        resolver     = IPublicResolver(_resolver);
        parentNode   = _parentNode;
    }

    // ── Crypto-native flow ────────────────────────────────────────

    /**
     * @notice Register a subname for a crypto-native user.
     *         Burns PARENT_CANNOT_CONTROL + CANNOT_UNWRAP so the user
     *         gets a fully permanent, irrevocable wrapped ENS name (ERC-1155 NFT).
     * @param label       e.g. "max" → max.dogid.eth
     * @param contenthash IPFS contenthash bytes (optional — can be set later via resolver)
     */
    function register(
        string calldata label,
        bytes calldata contenthash
    ) external payable nonReentrant {
        require(msg.value >= registrationFee, "Insufficient fee");

        bytes32 subnameNode = _mintSubname(
            label,
            msg.sender,
            contenthash,
            CANNOT_UNWRAP | PARENT_CANNOT_CONTROL, // permanent ownership
            type(uint64).max                        // never expires
        );

        // Refund overpayment
        uint256 excess = msg.value - registrationFee;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "Refund failed");
        }

        emit SubnameRegistered(label, subnameNode, msg.sender, contenthash, true);
    }

    // ── Admin / normie (fiat) flow ────────────────────────────────

    /**
     * @notice Admin-only registration for normie fiat flow.
     *         Subname is owned by admin wallet (custodial).
     *         No fuses burned — admin can update contenthash and transfer later.
     * @param label         Subdomain label
     * @param custodialOwner Admin wallet or any address (custodial)
     * @param contenthash   IPFS contenthash
     */
    function adminRegister(
        string calldata label,
        address custodialOwner,
        bytes calldata contenthash
    ) external onlyOwner nonReentrant {
        bytes32 subnameNode = _mintSubname(
            label,
            custodialOwner,
            contenthash,
            0,              // no fuses — admin can manage/transfer to user later
            type(uint64).max
        );
        emit SubnameRegistered(label, subnameNode, custodialOwner, contenthash, false);
    }

    function adminRegisterBatch(
        string[]   calldata labels,
        address[]  calldata owners,
        bytes[]    calldata contenthashes
    ) external onlyOwner nonReentrant {
        require(
            labels.length == owners.length && labels.length == contenthashes.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < labels.length; i++) {
            bytes32 subnameNode = _mintSubname(labels[i], owners[i], contenthashes[i], 0, type(uint64).max);
            emit SubnameRegistered(labels[i], subnameNode, owners[i], contenthashes[i], false);
        }
    }

    // ── Views ─────────────────────────────────────────────────────

    function isAvailable(string calldata label) external view returns (bool) {
        bytes32 subnameNode = _makeNode(label);
        try nameWrapper.ownerOf(uint256(subnameNode)) returns (address owner) {
            return owner == address(0);
        } catch {
            return true; // ownerOf reverts for non-existent tokens
        }
    }

    // ── Update contenthash (admin-owned subnames only) ────────────

    /**
     * @notice Update the IPFS contenthash for a custodially-owned subname.
     *         Only works while the admin wallet still holds the NameWrapper token
     *         (i.e. before the user claims ownership).
     */
    function updateContenthash(string calldata label, bytes calldata contenthash) external onlyOwner {
        bytes32 subnameNode = _makeNode(label);
        resolver.setContenthash(subnameNode, contenthash);
    }

    // ── Internal ─────────────────────────────────────────────────

    function _mintSubname(
        string calldata label,
        address owner,
        bytes calldata contenthash,
        uint32 fuses,
        uint64 expiry
    ) internal returns (bytes32 subnameNode) {
        require(bytes(label).length >= 3, "Label too short");
        require(bytes(label).length <= 42, "Label too long");
        _validateLabel(label);

        // Availability check (reverts if already minted)
        bytes32 node = _makeNode(label);
        try nameWrapper.ownerOf(uint256(node)) returns (address existing) {
            require(existing == address(0), "Already registered");
        } catch {} // revert = available

        // Verify this contract is approved as NameWrapper operator for the parent owner
        address parentOwner = ensRegistry.owner(parentNode);
        require(
            nameWrapper.isApprovedForAll(parentOwner, address(this)),
            "Registrar not approved on NameWrapper"
        );

        // Mint wrapped subname via NameWrapper
        subnameNode = nameWrapper.setSubnodeRecord(
            parentNode,
            label,
            owner,
            address(resolver),
            0,      // TTL
            fuses,
            expiry
        );

        // Set contenthash via resolver if provided
        if (contenthash.length > 0) {
            resolver.setContenthash(subnameNode, contenthash);
        }
    }

    function _makeNode(string calldata label) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
    }

    function _validateLabel(string calldata label) internal pure {
        bytes memory b = bytes(label);
        require(b[0] != 0x2D && b[b.length - 1] != 0x2D, "No leading/trailing hyphen");
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            require(
                (c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39) || c == 0x2D,
                "Invalid character"
            );
        }
    }

    // ── Admin utilities ───────────────────────────────────────────

    function setFee(uint256 _fee) external onlyOwner {
        registrationFee = _fee;
        emit FeeUpdated(_fee);
    }

    function withdraw(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        (bool ok,) = to.call{value: balance}("");
        require(ok, "Transfer failed");
        emit Withdrawn(to, balance);
    }
}
