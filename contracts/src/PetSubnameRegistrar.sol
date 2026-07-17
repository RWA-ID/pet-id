// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

interface INameWrapper {
    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);

    function ownerOf(uint256 id) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
}

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

interface IPublicResolver {
    function setContenthash(bytes32 node, bytes memory hash) external;
    function setAddr(bytes32 node, address addr) external;
}

uint32 constant CANNOT_UNWRAP         = 1;
uint32 constant PARENT_CANNOT_CONTROL = 1 << 16;

contract PetSubnameRegistrar is Ownable, ReentrancyGuard, ERC1155Holder {

    // ── Immutables ────────────────────────────────────────────────
    INameWrapper    public immutable nameWrapper;
    IENSRegistry    public immutable ensRegistry;
    IPublicResolver public immutable resolver;

    // ── State ─────────────────────────────────────────────────────
    uint256 public registrationFee = 0.00825 ether;

    // Supported parent nodes (dogid.eth, catid.eth, petid.eth, etc.)
    mapping(bytes32 => bool) public supportedParents;
    bytes32[] public parentList;

    // ── Events ────────────────────────────────────────────────────
    event SubnameRegistered(
        bytes32 indexed parentNode,
        string  label,
        bytes32 indexed subnameNode,
        address indexed owner,
        bool    permanent
    );
    event ParentAdded(bytes32 indexed node, string label);
    event ParentRemoved(bytes32 indexed node);
    event FeeUpdated(uint256 newFee);
    event Withdrawn(address to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────
    constructor(
        address _nameWrapper,
        address _ensRegistry,
        address _resolver
    ) Ownable(msg.sender) {
        nameWrapper  = INameWrapper(_nameWrapper);
        ensRegistry  = IENSRegistry(_ensRegistry);
        resolver     = IPublicResolver(_resolver);
    }

    // ── Admin: manage supported parents ──────────────────────────

    function addParent(bytes32 node, string calldata label) external onlyOwner {
        require(!supportedParents[node], "Already supported");
        supportedParents[node] = true;
        parentList.push(node);
        emit ParentAdded(node, label);
    }

    function removeParent(bytes32 node) external onlyOwner {
        require(supportedParents[node], "Not supported");
        supportedParents[node] = false;
        emit ParentRemoved(node);
    }

    function getParentList() external view returns (bytes32[] memory) {
        return parentList;
    }

    // ── Crypto-native flow ────────────────────────────────────────

    /**
     * @notice Register a subname as a crypto-native user.
     *         Burns PARENT_CANNOT_CONTROL — permanent, irrevocable ownership.
     * @param parentNode  namehash of dogid.eth or catid.eth
     * @param label       e.g. "max"
     * @param contenthash IPFS contenthash bytes (optional)
     */
    function register(
        bytes32 parentNode,
        string calldata label,
        bytes calldata contenthash
    ) external payable nonReentrant {
        require(supportedParents[parentNode], "Unsupported parent");
        require(msg.value >= registrationFee, "Insufficient fee");

        bytes32 subnameNode = _mintSubname(
            parentNode,
            label,
            msg.sender,
            contenthash,
            CANNOT_UNWRAP | PARENT_CANNOT_CONTROL,
            type(uint64).max
        );

        uint256 excess = msg.value - registrationFee;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "Refund failed");
        }

        emit SubnameRegistered(parentNode, label, subnameNode, msg.sender, true);
    }

    // ── Admin / normie (fiat) flow ────────────────────────────────

    /**
     * @notice Admin-only registration for fiat flow.
     *         No fuses burned — admin can update contenthash and transfer to user later.
     * @param parentNode     namehash of dogid.eth or catid.eth
     * @param label          Subdomain label
     * @param custodialOwner Admin wallet (custodial until user claims)
     * @param contenthash    IPFS contenthash
     */
    function adminRegister(
        bytes32 parentNode,
        string calldata label,
        address custodialOwner,
        bytes calldata contenthash
    ) external onlyOwner nonReentrant {
        require(supportedParents[parentNode], "Unsupported parent");

        bytes32 subnameNode = _mintSubname(
            parentNode,
            label,
            custodialOwner,
            contenthash,
            0,
            type(uint64).max
        );

        emit SubnameRegistered(parentNode, label, subnameNode, custodialOwner, false);
    }

    function adminRegisterBatch(
        bytes32[]  calldata parentNodes,
        string[]   calldata labels,
        address[]  calldata owners,
        bytes[]    calldata contenthashes
    ) external onlyOwner nonReentrant {
        require(
            parentNodes.length == labels.length &&
            labels.length == owners.length &&
            labels.length == contenthashes.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < labels.length; i++) {
            require(supportedParents[parentNodes[i]], "Unsupported parent");
            bytes32 subnameNode = _mintSubname(
                parentNodes[i], labels[i], owners[i], contenthashes[i], 0, type(uint64).max
            );
            emit SubnameRegistered(parentNodes[i], labels[i], subnameNode, owners[i], false);
        }
    }

    // ── Views ─────────────────────────────────────────────────────

    function isAvailable(bytes32 parentNode, string calldata label) external view returns (bool) {
        bytes32 subnameNode = _makeNode(parentNode, label);
        try nameWrapper.ownerOf(uint256(subnameNode)) returns (address owner) {
            return owner == address(0);
        } catch {
            return true;
        }
    }

    function updateContenthash(
        bytes32 parentNode,
        string calldata label,
        bytes calldata contenthash
    ) external onlyOwner {
        bytes32 subnameNode = _makeNode(parentNode, label);
        resolver.setContenthash(subnameNode, contenthash);
    }

    // ── Internal ─────────────────────────────────────────────────

    function _mintSubname(
        bytes32 parentNode,
        string calldata label,
        address owner,
        bytes calldata contenthash,
        uint32 fuses,
        uint64 expiry
    ) internal returns (bytes32 subnameNode) {
        require(bytes(label).length >= 3, "Label too short");
        require(bytes(label).length <= 42, "Label too long");
        _validateLabel(label);

        bytes32 node = _makeNode(parentNode, label);
        try nameWrapper.ownerOf(uint256(node)) returns (address existing) {
            require(existing == address(0), "Already registered");
        } catch {}

        address parentOwner = nameWrapper.ownerOf(uint256(parentNode));
        require(
            nameWrapper.isApprovedForAll(parentOwner, address(this)),
            "Registrar not approved on NameWrapper"
        );

        // Mint to this contract first so we can set the contenthash before transferring ownership
        subnameNode = nameWrapper.setSubnodeRecord(
            parentNode, label, address(this), address(resolver), 0, fuses, expiry
        );

        if (contenthash.length > 0) {
            resolver.setContenthash(subnameNode, contenthash);
        }

        // Transfer to the actual owner
        nameWrapper.safeTransferFrom(address(this), owner, uint256(subnameNode), 1, "");
    }

    function _makeNode(bytes32 parentNode, string calldata label) internal pure returns (bytes32) {
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
