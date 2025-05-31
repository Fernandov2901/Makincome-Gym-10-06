# Makincome Gym

A gym management system with web and mobile applications.

## Project Structure

```
makincome-gym/
├── apps/
│   ├── web/                 # Web application (React + Vite)
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── pages/      # Page components
│   │   │   ├── hooks/      # Custom React hooks
│   │   │   ├── services/   # API and external services
│   │   │   ├── utils/      # Utility functions
│   │   │   └── types/      # TypeScript type definitions
│   │   └── public/         # Static assets
│   │
│   └── mobile/             # Mobile application (React Native)
│       ├── src/
│       │   ├── components/ # Reusable UI components
│       │   ├── screens/    # Screen components
│       │   ├── hooks/      # Custom React hooks
│       │   ├── services/   # API and external services
│       │   ├── utils/      # Utility functions
│       │   └── types/      # TypeScript type definitions
│       └── assets/         # Static assets
│
└── packages/
    └── shared/             # Shared code between web and mobile
        ├── src/
        │   ├── api/        # API client and types
        │   ├── utils/      # Shared utility functions
        │   └── types/      # Shared TypeScript types
        └── package.json
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Yarn
- Supabase account

### Environment Setup

1. Create `.env` files in both `apps/web` and `apps/mobile` directories:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

1. Install dependencies:
```bash
yarn install
```

2. Start the web application:
```bash
yarn web
```

3. Start the mobile application:
```bash
yarn mobile
```

## Features

- User authentication (students, coaches, owners)
- Class management
- Membership plans
- Attendance tracking
- Revenue tracking
- Mobile app for students and coaches

## Tech Stack

### Web Application
- React
- TypeScript
- Vite
- Chakra UI
- React Router
- Supabase

### Mobile Application
- React Native
- TypeScript
- Expo
- React Navigation
- Supabase

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 