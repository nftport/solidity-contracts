# Security

### solhint

Usage:

```
npx solhint 'contracts/**/*.sol'
```

### mythx

```
mythx analyze contracts --remap-import "@openzeppelin/=$(pwd)/node_modules/@openzeppelin/"
```

### mythril

mythril is part of mythx but is opensource and free to use.
Local installation is possible but requires leveldb and seems to be very error
prone. Docker recommended instead.

```
docker run -v $(pwd):/tmp mythril/myth analyze /tmp/contracts/
```
