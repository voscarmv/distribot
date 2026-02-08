# Distribot 🚀

A Telegram bot template for managed user registration, invitation-based onboarding, and group-based broadcasts. Built with `grammy`, `@voscarmv/apigen`, `Drizzle ORM`, and `PostgreSQL`.

## Features

- **Ephemeral Invitations**: Admins can generate unique registration keys that expire after 24 hours.
- **Group-Based Onboarding**: Assign users to specific groups (e.g., `developers`, `beta-testers`) during invitation.
- **Managed Registration**: Users must have a valid invitation key to register with the bot.
- **Targeted Broadcasts**: Admins can send messages to all users within a specific group tag.
- **REST API included**: Built on top of `apigen`, providing automated routes to manage users and invitations.

## Quick Start

### 1. Installation

```bash
npm install
npx dbinstall
```

### 2. Configuration

The `.env` file is created by `npx dbinstall` along with `DATABASE_URL`. Fill in the value `TG_KEY` (your bot token from BotFather).

```env
DATABASE_URL=postgres://user:password@localhost:5432/distribot
TG_KEY=your_telegram_bot_token
```

### 3. Database Setup

```bash
npm run db:generate
npm run db:migrate
```

### 4. Initial Seeding

Register yourself as the first admin (replace `12345678` with your actual Telegram ID):

```bash
npx ts-node src/seed.ts 12345678
```

### 5. Start the Server

```bash
npm run dev
```

## Bot Commands

### Admin Commands
- `/invite [tag]` - Generate a 24-hour invitation key for a specific group (defaults to `general`).
- `/broadcast <tag> <message>` - Send a message to all users registered with the specified tag.

### API Endpoints
- `GET /users` - List all registered users.
- `GET /invitations` - List all active invitation keys.
- `POST /broadcast` - Send a broadcast message via the REST API.
  - Body: `{ "tag": "developers", "message": "Your message here" }`

### User Commands
- `/start` - Initial bot greeting.
- `/register <key>` - Redeem an invitation key to register.
- **Direct message** - You can also register by simply sending the key directly to the bot chat.

## Architecture

This project leverages [@voscarmv/apigen](https://npmjs.com/package/@voscarmv/apigen) for a robust Express/PostgreSQL foundation. The Telegram logic is handled by [grammY](https://grammy.dev/), sharing the same database connection via Drizzle.

## License

GPL-3.0-or-later
