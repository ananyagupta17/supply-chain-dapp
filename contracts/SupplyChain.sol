// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SupplyChain {

    // -----------------------------------------------------------------------
    // ENUMS
    // Defines the lifecycle stages of a product in the supply chain.
    // -----------------------------------------------------------------------
    enum Stage {
        Manufactured,
        Shipped,
        InTransit,
        Delivered
    }

    // -----------------------------------------------------------------------
    // STRUCTS
    // Represents a product and its associated metadata.
    // -----------------------------------------------------------------------
    struct Product {
        uint256 id;          
        string name;         
        string description;  
        address owner;       
        Stage stage;         
        uint256 timestamp;   
        bool exists;         
    }

    // -----------------------------------------------------------------------
    // STATE VARIABLES
    // Stores contract-level data on-chain.
    // -----------------------------------------------------------------------
    address public admin;
    uint256 public productCount;

    // Maps product ID to Product details
    mapping(uint256 => Product) public products;

    // -----------------------------------------------------------------------
    // EVENTS
    // Emitted to log key contract interactions.
    // -----------------------------------------------------------------------
    event ProductRegistered(uint256 indexed id, string name, address indexed owner);
    event StageUpdated(uint256 indexed id, Stage newStage, address indexed updatedBy);
    event OwnershipTransferred(uint256 indexed id, address indexed from, address indexed to);

    // -----------------------------------------------------------------------
    // MODIFIERS
    // Access control and validation checks.
    // -----------------------------------------------------------------------
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier productExists(uint256 _id) {
        require(products[_id].exists, "Product does not exist");
        _;
    }

    modifier onlyOwner(uint256 _id) {
        require(products[_id].owner == msg.sender, "Only product owner can call this");
        _;
    }

    // -----------------------------------------------------------------------
    // CONSTRUCTOR
    // Initializes the contract and sets the deployer as admin.
    // -----------------------------------------------------------------------
    constructor() {
        admin = msg.sender;
    }

    // -----------------------------------------------------------------------
    // FUNCTIONS
    // -----------------------------------------------------------------------

    // Registers a new product (admin only)
    function registerProduct(string memory _name, string memory _description) external onlyAdmin {
        productCount++;

        products[productCount] = Product({
            id: productCount,
            name: _name,
            description: _description,
            owner: admin,
            stage: Stage.Manufactured,
            timestamp: block.timestamp,
            exists: true
        });

        emit ProductRegistered(productCount, _name, admin);
    }

    // Updates product stage (restricted to current owner)
    function updateStage(uint256 _id, Stage _newStage)
        external
        productExists(_id)
        onlyOwner(_id)
    {
        require(uint(_newStage) == uint(products[_id].stage) + 1, "Can only move one stage at a time");

        products[_id].stage = _newStage;
        products[_id].timestamp = block.timestamp;

        emit StageUpdated(_id, _newStage, msg.sender);
    }

    // Transfers product ownership to another address
    function transferOwnership(uint256 _id, address _newOwner)
        external
        productExists(_id)
        onlyOwner(_id)
    {
        require(_newOwner != address(0), "Invalid address");

        address previousOwner = products[_id].owner;
        products[_id].owner = _newOwner;
        products[_id].timestamp = block.timestamp;

        emit OwnershipTransferred(_id, previousOwner, _newOwner);
    }

    // Retrieves product details (read-only)
    function getProduct(uint256 _id)
        external
        view
        productExists(_id)
        returns (Product memory)
    {
        return products[_id];
    }
}