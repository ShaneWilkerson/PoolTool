# Firestore Schema for PoolTracker

## accounts
- `companyName`: string
- `email`: string
- `createdAt`: timestamp

## customers
- `accountId`: string (reference to accounts)
- `name`: string
- `address`: string
- `email`: string
- `phone`: string
- `billingStatus`: string (paid/unpaid/overdue)
- `dueDate`: timestamp
- `invoiceId`: string (reference to invoices)

## tasks
- `accountId`: string (reference to accounts)
- `customerId`: string (reference to customers)
- `description`: string
- `date`: timestamp
- `status`: string (pending/completed)

## invoices
- `accountId`: string (reference to accounts)
- `customerId`: string (reference to customers)
- `services`: array of strings
- `amount`: number
- `status`: string (paid/unpaid/overdue)
- `dueDate`: timestamp

## receipts
- `accountId`: string (reference to accounts)
- `invoiceId`: string (reference to invoices)
- `customerId`: string (reference to customers)
- `amountPaid`: number
- `timestamp`: timestamp

## expenses
- `accountId`: string (reference to accounts)
- `title`: string
- `details`: string
- `supplyStore`: string
- `amount`: number
- `date`: timestamp 