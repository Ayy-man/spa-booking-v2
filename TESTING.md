# Testing Documentation

## Overview

The Medical Spa Booking System includes comprehensive testing coverage using Jest, React Testing Library, and custom test utilities. This document outlines the testing strategy, setup, and guidelines for maintaining high-quality code.

## Testing Framework

### Core Testing Stack
- **Jest**: Testing framework and test runner
- **React Testing Library**: React component testing utilities
- **Jest Environment**: jsdom for DOM testing
- **TypeScript**: Full type safety in tests
- **Coverage Reporting**: Built-in coverage analysis

### Test Configuration
Located in `jest.config.js`:
- **Test Environment**: jsdom (browser-like environment)
- **Setup Files**: `jest.setup.js` for global test configuration
- **Module Mapping**: Automatic path resolution for `@/` imports
- **Coverage Threshold**: 70% minimum across all metrics
- **Transform**: Babel with Next.js presets for TypeScript/JSX

## Available Test Commands

```bash
# Run all tests once
npm run test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci
```

## Test Structure and Organization

### Test File Locations
```
src/
├── __tests__/                    # Global tests
│   ├── booking-utils.test.ts     # Booking utility functions
│   ├── env-validation.test.ts    # Environment validation
│   ├── ghl-webhook-sender.test.ts # Webhook integration
│   └── health-check.test.ts      # Health check endpoint
├── lib/
│   └── __tests__/                # Library-specific tests
│       ├── booking-logic.test.ts # Core booking logic
│       ├── booking-utils.test.ts # Booking utilities
│       ├── env-validation.test.ts # Environment validation
│       ├── ghl-webhook-sender.test.ts # Webhook sender
│       └── room-timeline-logic.test.ts # Room timeline logic
└── components/                   # Component tests (to be added)
```

### Test Categories

#### 1. Unit Tests
Testing individual functions and utilities in isolation:
- **Booking Logic**: Core business logic validation
- **Utility Functions**: Helper functions and data transformations
- **Environment Validation**: Configuration and security checks
- **Date/Time Utilities**: Booking time calculations and validations

#### 2. Integration Tests
Testing interactions between multiple components:
- **Database Operations**: Supabase integration testing
- **API Endpoints**: Route handlers and API logic
- **Webhook Integration**: External service communication
- **Authentication Flow**: Login and authorization testing

#### 3. System Tests
Testing complete workflows and system behavior:
- **Health Checks**: System monitoring and status validation
- **End-to-End Booking**: Complete booking flow validation
- **Admin Panel Functions**: Admin-specific operations
- **Error Handling**: Graceful error recovery testing

## Coverage Requirements

### Minimum Coverage Thresholds
All tests must maintain at least 70% coverage across:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Exclusions
The following are excluded from coverage requirements:
- TypeScript definition files (`*.d.ts`)
- Storybook stories (`*.stories.*`)
- Type definitions (`src/types/`)

### Viewing Coverage Reports
```bash
# Generate and view coverage report
npm run test:coverage

# Coverage report will be generated in coverage/
# Open coverage/lcov-report/index.html in browser for detailed view
```

## Writing Tests

### Test File Naming Convention
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Test utilities: `test-utils.ts`

### Basic Test Structure
```typescript
import { describe, test, expect } from '@jest/globals'
import { functionToTest } from '../path/to/function'

describe('FunctionToTest', () => {
  test('should handle valid input correctly', () => {
    // Arrange
    const input = 'valid input'
    
    // Act
    const result = functionToTest(input)
    
    // Assert
    expect(result).toBe('expected output')
  })

  test('should handle edge cases', () => {
    // Test edge cases and error conditions
  })
})
```

### React Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ComponentToTest } from '../ComponentToTest'

describe('ComponentToTest', () => {
  test('renders correctly with props', () => {
    render(<ComponentToTest prop="value" />)
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  test('handles user interactions', async () => {
    render(<ComponentToTest />)
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(screen.getByText('Response Text')).toBeInTheDocument()
  })
})
```

## Current Test Coverage

### Database Schema Validation Tests
**Status**: ✅ **VERIFIED** - All schema-related tests updated for v1.2.0
- UUID field type validation across all entities
- Field name consistency checks (snake_case format)
- Room equipment field validation
- Staff capabilities field validation
- Booking date field validation
- Service requirement mapping validation

### Environment Validation Tests
**File**: `src/__tests__/env-validation.test.ts`
- Validates required environment variables
- Tests placeholder value detection
- Verifies URL format validation
- Tests error handling for missing variables

### Booking Logic Tests
**File**: `src/lib/__tests__/booking-logic.test.ts`
- Room assignment logic validation (updated for UUID room IDs)
- Staff availability checking (using `can_perform_services` field)
- Time slot validation (with `booking_date` field)
- Booking constraint enforcement
- Room equipment validation (`has_body_scrub_equipment`, `is_couples_room`)
- Service-to-room requirement mapping (`requires_body_scrub_room`)

### Health Check Tests
**File**: `src/__tests__/health-check.test.ts`
- API endpoint response validation
- Database connectivity testing
- Environment variable verification
- Response time monitoring

### Webhook Integration Tests
**File**: `src/__tests__/ghl-webhook-sender.test.ts`
- GoHighLevel API integration
- Webhook payload validation
- Error handling and retries
- Authentication testing

### Booking Utilities Tests
**File**: `src/__tests__/booking-utils.test.ts`
- Date/time calculation utilities
- Booking validation helpers
- Data transformation functions
- Error handling utilities

## Running Specific Tests

### Run Tests by Pattern
```bash
# Run tests matching a pattern
npm test -- --testNamePattern="Environment"

# Run tests in specific file
npm test -- env-validation.test.ts

# Run tests in specific directory
npm test -- __tests__/
```

### Debug Tests
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests and keep them running for debugging
npm test -- --watch --verbose
```

## Continuous Integration

### CI Pipeline Integration
The test suite is configured for CI/CD with:
- **Zero Watch Mode**: Tests run once and exit
- **Coverage Generation**: Automatic coverage reports
- **Fail on Coverage**: Build fails if coverage drops below threshold
- **Parallel Execution**: Tests run in parallel for speed

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Test Data and Mocking

### Database Mocking
For database-dependent tests, use Supabase test utilities:
```typescript
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }))
  }
}))
```

### API Mocking
For external API calls, use Jest's built-in mocking:
```typescript
// Mock fetch for webhook tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock
```

### Test Data Fixtures
Create reusable test data in test utilities:
```typescript
// test-fixtures.ts - Updated for v1.2.0 schema
export const mockBooking = {
  id: 'test-booking-uuid-string', // UUID string, not number
  service_id: 'test-service-uuid',
  staff_id: 'test-staff-uuid',
  room_id: 'test-room-uuid', // UUID string format
  booking_date: '2025-08-01', // Correct field name
  booking_time: '10:00',
  customer_name: 'Test Customer',
  customer_phone: '123-456-7890',
  customer_email: 'test@example.com'
}

export const mockRoom = {
  id: 'test-room-uuid-string',
  name: 'Test Room',
  has_body_scrub_equipment: true, // New schema field
  is_couples_room: false, // New schema field
  capacity: 1
}

export const mockStaff = {
  id: 'test-staff-uuid-string',
  name: 'Test Staff',
  can_perform_services: ['service1', 'service2'], // Correct field name
  default_room_id: 'test-room-uuid'
}
```

## Performance Testing

### Test Performance Monitoring
Monitor test execution time and identify slow tests:
```bash
# Run tests with timing information
npm test -- --verbose --detectSlowTests
```

### Memory Usage Testing
For memory-intensive operations, include memory usage validation:
```typescript
test('should not cause memory leaks', () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  // Perform operation that might leak memory
  performOperation()
  
  // Force garbage collection (if available)
  if (global.gc) global.gc()
  
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  // Allow for reasonable memory increase
  expect(memoryIncrease).toBeLessThan(1024 * 1024) // 1MB
})
```

## Test Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review test coverage reports
- **Monthly**: Update test fixtures and mock data
- **Quarterly**: Review and refactor slow or flaky tests
- **With each release**: Verify all tests pass and coverage meets requirements

### Adding New Tests
When adding new functionality:
1. Write tests for new functions/components
2. Ensure coverage doesn't drop below threshold
3. Update test documentation if needed
4. Run full test suite to verify no regressions

### Debugging Test Failures
1. Run failing test in isolation: `npm test -- failing-test.test.ts`
2. Use `--verbose` flag for detailed output
3. Add `console.log` statements for debugging (remove before commit)
4. Use Jest's `--detectOpenHandles` to find hanging promises

## Best Practices

### Test Writing Guidelines
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: Each test should verify one behavior
4. **Independent Tests**: Tests should not depend on each other
5. **Mock External Dependencies**: Isolate code under test

### Performance Considerations
1. **Minimize Setup/Teardown**: Reuse test fixtures when possible
2. **Parallel Execution**: Avoid tests that interfere with each other
3. **Fast Feedback**: Keep test execution time reasonable
4. **Resource Cleanup**: Clean up resources in afterEach/afterAll

### Documentation
1. **Comment Complex Logic**: Explain non-obvious test setup
2. **Update Documentation**: Keep this file current with changes
3. **Example Tests**: Provide examples for common patterns
4. **Troubleshooting**: Document common issues and solutions

---

**Last Updated**: August 1, 2025  
**Version**: 2.1.0  
**Coverage Status**: ✅ Meeting requirements (70%+ across all metrics) with database schema fixes verified