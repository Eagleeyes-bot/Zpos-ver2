# Security Specification - Multi-Tenant Mobile Shop Management

## Data Invariants
1. All records must contain a `userId` field matching the authenticated user's UID.
2. Users can only read, create, update, or delete records they own (`resource.data.userId == request.auth.uid`).
3. Admin (`eagleeye.tokyo@gmail.com`) has full access to all records.
4. Critical fields like `userId`, `imei`, and `createdAt` are immutable after creation.
5. Updates are restricted to specific fields per operation type using `affectedKeys().hasOnly()`.
6. Document IDs are validated using `isValidId()` to prevent injection.
7. Terminal state locking: Installments cannot be updated once status is `completed`.

## The Dirty Dozen Payloads (Target: Denied)
1. **Identity Spoofing**: Creating a record with a `userId` that isn't yours.
2. **Identity Takeover**: Updating a record owned by another user.
3. **Data Scraping**: Attempting to list all records without a user filter (unless Admin).
4. **Shadow Field Injection**: Adding undocumented fields like `isAdmin: true` during update.
5. **Timestamp Manipulation**: Providing a custom `createdAt` time instead of `request.time`.
6. **State Bypassing**: Updating a completed installment.
7. **Negative Values**: Setting a `costPrice` or `totalAmount` to a negative number.
8. **Resource Exhaustion**: Sending a 1MB string as a ID or Name.
9. **Orphaned Writes**: Creating a sale for a customer that doesn't exist.
10. **Immutable Violation**: Trying to change the `userId` or `imei` of an existing record.
11. **Type Poisoning**: Sending a string where a number is expected (e.g. `costPrice: "free"`).
12. **Status Corruption**: Setting a device status to a non-enum value like `broken-by-user`.

## Test Scenarios
- [x] PREVENT create if `userId` != `request.auth.uid`
- [x] PREVENT read if `userId` != `request.auth.uid` (and not Admin)
- [x] PREVENT update if `userId` is changed
- [x] PREVENT update of completed installments
- [x] ALLOW all Ops if `userId` matches and schema is valid
- [x] ALLOW all Ops for Admin user
