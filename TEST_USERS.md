# Test Users

This file contains test accounts for development and testing purposes.

## Admin Accounts

| Email | Password | Name | Role |
|-------|----------|------|------|
| admin@company.com | admin123 | Admin User | admin |
| newemployee@company.com | (created via admin) | New Employee | admin |

## Employee Accounts

All employee accounts use the password: `password123`

| Email | Name | Role |
|-------|------|------|
| sarah@company.com | Sarah Johnson | employee |
| mike@company.com | Mike Chen | employee |
| emily@company.com | Emily Davis | employee |
| james@company.com | James Wilson | employee |
| lisa@company.com | Lisa Park | employee |
| mourad@company.com | Mourad | employee |
| mahmoud@company.com | Mourad | employee |
| testuser@company.com | Test User | employee |
| mourad.salih2@gmail.com | Mourad Salih | employee |

## Quick Login Commands

```bash
# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Login as employee
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@company.com","password":"password123"}'
```

## Notes

- Registration is disabled. New users must be added by an admin.
- Admin can add users via the Admin Panel UI or API endpoint `/api/users` (POST)
- Any valid email address is allowed for new users.
