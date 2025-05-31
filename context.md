Create a full-stack CrossFit gym management app with three user roles: Owner, Coach, and Student. Use Supabase for authentication and database management.

### General:
- Use Supabase for login, registration, and session management.
- Ensure proper role-based access control.

---

### OWNER FEATURES:
- Dashboard with:
  - Current number of active students.
  - Expected annual revenue projection based on:
    - Monthly Plan: €105/month
    - Yearly Plan: €1040/year
- CRUD functionality for:
  - Students (name, email, plan type, plan start date).
  - Class schedule (days, times, type of class: e.g., WOD, strength, mobility).
  - Repeat class functionality (e.g., every Monday/Wednesday 7AM).
  - Assigning coaches to each class.
- Coach Management: Add/edit/remove coach profiles and assign them to classes.

---

### COACH FEATURES:
- Login with Supabase and role check.
- View list of classes they are coaching.
- Class Management:
  - View class schedule.
  - View enrolled students.
  - See student limit per class.
- Profile Management: Set bio, profile picture, specialization.

---

### STUDENT FEATURES:
- Login and profile (basic info + membership type + active status).
- View weekly class schedule.
- Enroll in available classes (check capacity limit).
- Withdraw from enrolled classes.
- See which coach is assigned to each class.

---

### DATABASE DESIGN (Supabase tables suggestion):
- `users`: id, email, role (owner, coach, student), profile info
- `plans`: id, type (monthly/yearly), price
- `subscriptions`: user_id, plan_id, start_date, end_date
- `classes`: id, name, type, start_time, end_time, repeat_days, coach_id, student_limit
- `class_enrollments`: class_id, student_id
- `coaches`: user_id, bio, specialization

Use React or React Native for frontend and integrate with Supabase for backend.

Do not use AI tools or APIs. Focus on usability and practical gym management for a CrossFit facility.

---

### DETAILED DATABASE SCHEMA:

#### Users Table
```sql
users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  role text not null check (role in ('owner', 'coach', 'student')),
  first_name text not null,
  last_name text not null,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

#### Profiles Table
```sql
profiles (
  id uuid primary key references users(id),
  avatar_url text,
  bio text,
  specialization text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

#### Plans Table
```sql
plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('monthly', 'yearly')),
  price decimal not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

#### Subscriptions Table
```sql
subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  plan_id uuid references plans(id),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('active', 'cancelled', 'expired')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

#### Classes Table
```sql
classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('WOD', 'strength', 'mobility')),
  description text,
  start_time time not null,
  end_time time not null,
  repeat_days text[] not null,
  coach_id uuid references users(id),
  student_limit integer not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

#### Class Enrollments Table
```sql
class_enrollments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id),
  student_id uuid references users(id),
  enrollment_date timestamp with time zone default now(),
  status text not null check (status in ('enrolled', 'cancelled', 'completed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(class_id, student_id)
)
```

#### Attendance Table
```sql
attendance (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id),
  student_id uuid references users(id),
  date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
)
```

---

### FOLDER STRUCTURE:

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
│   │   │   ├── types/      # TypeScript type definitions
│   │   │   ├── config/     # Configuration files
│   │   │   └── layouts/    # Layout components
│   │   ├── public/         # Static assets
│   │   ├── package.json    # Web app dependencies
│   │   └── vite.config.ts  # Vite configuration
│   │
│   └── mobile/             # Mobile application (React Native)
│       ├── src/
│       │   ├── components/ # Reusable UI components
│       │   ├── screens/    # Screen components
│       │   ├── hooks/      # Custom React hooks
│       │   ├── services/   # API and external services
│       │   ├── utils/      # Utility functions
│       │   ├── types/      # TypeScript type definitions
│       │   ├── config/     # Configuration files
│       │   └── assets/     # Static assets
│       ├── package.json    # Mobile app dependencies
│       └── app.json        # Expo configuration
│
├── packages/
│   └── shared/             # Shared code between web and mobile
│       ├── src/
│       │   ├── api/        # API client and types
│       │   ├── utils/      # Shared utility functions
│       │   └── types/      # Shared TypeScript types
│       └── package.json    # Shared package dependencies
│
├── package.json            # Root package.json (workspace management)
├── tsconfig.json          # Root TypeScript configuration
└── README.md              # Project documentation
```

This structure follows best practices for a React application with TypeScript, including:
- Clear separation of concerns
- Component-based architecture
- Role-based feature organization
- Reusable components
- Type safety with TypeScript
- Testing setup
- Environment configuration
