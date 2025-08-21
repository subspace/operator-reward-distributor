## Transactions

### Remark payload

- Versioned payload for auditability and forward-compatibility.
- Current format (v1): `ORD:v1;period=<int>;tip=<shannons>`.
- The payload captures the computed period and the tip used.

### Extrinsic

- Operation: `system.remark(<payload>)`.
- Tip: The configured tip (converted from AI3 to shannons) is attached when signing/sending.

### Signing and sending

- The configured `ACCOUNT_PRIVATE_KEY` signs the extrinsic.
- On inclusion, the application records the extrinsic hash and block details.

### Mortality and confirmations

- Transactions are expected to be mortal within a bounded block window.
- Confirmation depth is configurable via `CONFIRMATIONS` and is used to mark emissions as confirmed.
