const { expect } = require('chai')
const { ethers } = require('hardhat')

function propertyIdFor(uuid) {
  return BigInt(ethers.keccak256(ethers.toUtf8Bytes(uuid)))
}

describe('PropertyToken', () => {
  let token, owner, minter, buyerA, buyerB, stranger
  const propertyId = propertyIdFor('11111111-1111-1111-1111-111111111111')

  beforeEach(async () => {
    ;[owner, minter, buyerA, buyerB, stranger] = await ethers.getSigners()
    const PropertyToken = await ethers.getContractFactory('PropertyToken')
    token = await PropertyToken.connect(owner).deploy(minter.address)
    await token.waitForDeployment()
  })

  it('tokenizes a property with the declared total sqft supply', async () => {
    await expect(token.connect(minter).tokenizeProperty(propertyId, 7200))
      .to.emit(token, 'PropertyTokenized')
      .withArgs(propertyId, 7200)

    expect(await token.tokenized(propertyId)).to.equal(true)
    expect(await token.totalSupplyCap(propertyId)).to.equal(7200)
    expect(await token.availableSupply(propertyId)).to.equal(7200)
  })

  it('rejects tokenizing the same property twice', async () => {
    await token.connect(minter).tokenizeProperty(propertyId, 7200)
    await expect(token.connect(minter).tokenizeProperty(propertyId, 7200)).to.be.revertedWith(
      'PropertyToken: already tokenized',
    )
  })

  it('only the minter can tokenize or buy', async () => {
    await expect(token.connect(stranger).tokenizeProperty(propertyId, 7200)).to.be.revertedWith(
      'PropertyToken: caller is not the minter',
    )
    await token.connect(minter).tokenizeProperty(propertyId, 7200)
    await expect(token.connect(stranger).buyChunk(propertyId, buyerA.address, 50)).to.be.revertedWith(
      'PropertyToken: caller is not the minter',
    )
  })

  it('mints sqft to the buyer and updates minted/available supply', async () => {
    await token.connect(minter).tokenizeProperty(propertyId, 150)

    await expect(token.connect(minter).buyChunk(propertyId, buyerA.address, 40))
      .to.emit(token, 'ChunkPurchased')
      .withArgs(propertyId, buyerA.address, 40)

    expect(await token.balanceOf(buyerA.address, propertyId)).to.equal(40)
    expect(await token.mintedSupply(propertyId)).to.equal(40)
    expect(await token.availableSupply(propertyId)).to.equal(110)
  })

  it('supports multiple buyers partially owning the same chunk/property', async () => {
    await token.connect(minter).tokenizeProperty(propertyId, 150)
    await token.connect(minter).buyChunk(propertyId, buyerA.address, 40)
    await token.connect(minter).buyChunk(propertyId, buyerB.address, 60)

    expect(await token.balanceOf(buyerA.address, propertyId)).to.equal(40)
    expect(await token.balanceOf(buyerB.address, propertyId)).to.equal(60)
    expect(await token.availableSupply(propertyId)).to.equal(50)
  })

  it('prevents double-selling: a purchase that would exceed the remaining supply reverts entirely', async () => {
    await token.connect(minter).tokenizeProperty(propertyId, 150)
    await token.connect(minter).buyChunk(propertyId, buyerA.address, 110)

    // Only 40 sqft left — buyerB asking for 50 must revert, and revert
    // atomically means buyerB's balance stays exactly 0, not partially minted.
    await expect(token.connect(minter).buyChunk(propertyId, buyerB.address, 50)).to.be.revertedWith(
      'PropertyToken: exceeds available supply',
    )
    expect(await token.balanceOf(buyerB.address, propertyId)).to.equal(0)
    expect(await token.availableSupply(propertyId)).to.equal(40)

    // The exact remaining amount still succeeds.
    await token.connect(minter).buyChunk(propertyId, buyerB.address, 40)
    expect(await token.availableSupply(propertyId)).to.equal(0)
  })

  it('rejects buying an untokenized property', async () => {
    await expect(token.connect(minter).buyChunk(propertyId, buyerA.address, 10)).to.be.revertedWith(
      'PropertyToken: property not tokenized',
    )
  })

  it('lets the owner rotate the minter', async () => {
    await expect(token.connect(owner).setMinter(stranger.address))
      .to.emit(token, 'MinterUpdated')
      .withArgs(minter.address, stranger.address)

    await token.connect(stranger).tokenizeProperty(propertyId, 100)
    await expect(token.connect(minter).buyChunk(propertyId, buyerA.address, 10)).to.be.revertedWith(
      'PropertyToken: caller is not the minter',
    )
  })

  it('rejects setMinter from a non-owner', async () => {
    await expect(token.connect(stranger).setMinter(stranger.address)).to.be.reverted
  })
})
