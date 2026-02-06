# MuFA Prototype — Local Setup Instructions

Follow these steps to run the project locally.

---

1. Install dependencies

Open a terminal in the project folder and run:

npm install

---

2. Create environment variables

Create a file named:

.env.local

Add your these credentials:

KV_REST_API_TOKEN="AY93AAIncDJjMDYzNTU4Nzg2MzY0MDZhOTBkNzY3NzBjMDk4NmU0M3AyMzY3Mjc"
KV_REST_API_URL="https://relaxed-mustang-36727.upstash.io"

---

3. Run the development server

npm run dev

---

4. Open the application

http://localhost:3000

---

5. Using the app

1. Enter a username
2. If the account does not exist, complete setup
3. Choose security songs
4. Create a recovery password
5. Login using the music authentication flow
6. If authentication fails or the timer expires, the account will lock and require the recovery password
