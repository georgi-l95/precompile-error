### Steps to reproduce

Run the local node
```
hedera restart --network local --limits false -d
```
Install the dependencies and run the test
```
npm install
npx hardhat test
```

The test fails only when `transferTokenPublic` is called via **TokenTransferContract**, if it's called via **TokenCreateContract** - it works.