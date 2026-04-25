Seed the SFMIS database with initial data. Run from the backend directory:

```bash
cd backend && npm run seed
```

This creates the admin account:
- Username: `admin_local`
- Password: `Admin@123`

Make sure MySQL is running and `backend/.env` is configured with correct DB credentials before seeding.
