# Security Specifications

## 1. Data Invariants
1. A crop portfolio must have a valid `ownerId` that strictly matches the authenticated user's `request.auth.uid`.
2. A crop portfolio's `id` must be a safe alphanumeric string (`isValidId()`).
3. Critical numeric fields such as `healthScore` and `moisture` must be positive and bounded within realistic operational metrics (`healthScore` 0-100, `moisture` 0-100).
4. No unauthorized user may read or write another user's crop portfolios (`allow list`/`get` check: `resource.data.ownerId == request.auth.uid`).

## 2. The "Dirty Dozen" Payloads (Aversarial Exploitation Attempts)

1. **Identity Spoofing - Impersonating another user**:
   ```json
   {
     "id": "maize-test",
     "name": "Impostor Corn",
     "ownerId": "attacker_uid_123",
     "status": "Healthy",
     "healthScore": 90,
     "growthStage": "Seedling"
   }
   ```
2. **Ghost field Injection (Shadow Updates)**:
   ```json
   {
     "id": "maize-alpha",
     "name": "Maize Alpha",
     "ownerId": "current_user_uid",
     "status": "Healthy",
     "healthScore": 90,
     "growthStage": "Seedling",
     "isVerifiedByAdmin": true
   }
   ```
3. **Denial of Wallet ID Poisoning (Mega Long string as ID)**:
   Document ID containing massive trash characters.
4. **Invalid State Injection - Out-of-bounds health score**:
   ```json
   {
     "id": "maize-alpha",
     "name": "Maize Alpha",
     "ownerId": "current_user_uid",
     "status": "Healthy",
     "healthScore": 99999,
     "growthStage": "Seedling"
   }
   ```
5. **Zero-Byte Name Injection**:
   ```json
   {
     "id": "maize-alpha",
     "name": "",
     "ownerId": "current_user_uid",
     "status": "Healthy",
     "healthScore": 90,
     "growthStage": "Seedling"
   }
   ```
6. **Privilege Escalation via Role Modification**:
   Attempting to update system administrative overrides.
7. **Bypassing Verification status**:
   Writing as an email-unverified user when verification is strictly enforced.
8. **Malicious Image Pointer Insertion**:
   Injecting a 1MB base64 payload as image string instead of URL.
9. **No Auth Accessing**:
   Read or write operation sent with `request.auth == null`.
10. **Cross-Tenant List Scraping**:
    Querying the entire `/portfolios` collection without specifying `where("ownerId", "==", uid)`.
11. **Malformed Structure Map Attack**:
    Sending non-array values for `activities` or `statsHistory`.
12. **Tampering with Historical Data**:
    Modifying immortal fields on existing records.

## 3. The Test Runner Definition

The tests are defined in accordance with `@firebase/rules-unit-testing` or similar framework to verify permission denials on any attempts matching the payloads above.
