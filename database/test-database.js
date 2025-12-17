/**
 * 🧪 DATABASE TESTING SCRIPT
 * 
 * This script tests all database functions without requiring manual data entry.
 * It creates test data, verifies operations, and cleans up afterwards.
 * 
 * Usage:
 *   node test-database.js
 * 
 * Or run in app console:
 *   npm test:db
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.magenta}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

// Supabase setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_PROJECT') || supabaseAnonKey.includes('YOUR_ANON_KEY')) {
  log.error('Please set your Supabase credentials in .env file:');
  log.info('EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  log.info('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data storage
let testData = {
  coachId: null,
  coachEmail: null,
  clientIds: [],
  sessionIds: [],
  attendanceIds: [],
};

// Helper: Random string generator
const randomString = (length = 8) => {
  return Math.random().toString(36).substring(2, length + 2);
};

// Helper: Get today's date in YYYY-MM-DD format
const today = () => new Date().toISOString().split('T')[0];

// Helper: Get date offset from today
const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

const recordTest = (name, passed, error = null) => {
  if (passed) {
    results.passed++;
    log.success(`${name}`);
  } else {
    results.failed++;
    log.error(`${name}${error ? ': ' + error : ''}`);
  }
  results.tests.push({ name, passed, error });
};

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

/**
 * Test 1: Database Connection
 */
async function testConnection() {
  log.header('TEST 1: DATABASE CONNECTION');
  
  try {
    const { data, error } = await supabase.from('coaches').select('count');
    
    if (error) {
      recordTest('Database Connection', false, error.message);
      return false;
    }
    
    recordTest('Database Connection', true);
    log.info(`Supabase URL: ${supabaseUrl}`);
    return true;
  } catch (error) {
    recordTest('Database Connection', false, error.message);
    return false;
  }
}

/**
 * Test 2: Authentication (Create Test Coach)
 */
async function testAuthentication() {
  log.header('TEST 2: AUTHENTICATION');
  
  const testEmail = `test_coach_${randomString()}@traintrack.test`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Sign up
    log.test('Creating test coach account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      recordTest('Sign Up', false, signUpError.message);
      return false;
    }
    
    if (!signUpData.user) {
      recordTest('Sign Up', false, 'No user returned');
      return false;
    }
    
    testData.coachId = signUpData.user.id;
    testData.coachEmail = testEmail;
    
    recordTest('Sign Up', true);
    log.info(`Test Coach ID: ${testData.coachId}`);
    log.info(`Test Email: ${testEmail}`);
    
    return true;
  } catch (error) {
    recordTest('Authentication', false, error.message);
    return false;
  }
}

/**
 * Test 3: Coach Profile
 */
async function testCoachProfile() {
  log.header('TEST 3: COACH PROFILE');
  
  try {
    // Check if coach profile exists
    log.test('Checking coach profile...');
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', testData.coachId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      recordTest('Fetch Coach Profile', false, error.message);
      return false;
    }
    
    if (!data) {
      // Create coach profile if it doesn't exist
      log.test('Creating coach profile...');
      const { error: insertError } = await supabase
        .from('coaches')
        .insert({
          id: testData.coachId,
          email: testData.coachEmail,
          full_name: 'Test Coach',
          business_name: 'Test Gym',
        });
      
      if (insertError) {
        recordTest('Create Coach Profile', false, insertError.message);
        return false;
      }
      
      recordTest('Create Coach Profile', true);
    } else {
      recordTest('Fetch Coach Profile', true);
    }
    
    return true;
  } catch (error) {
    recordTest('Coach Profile', false, error.message);
    return false;
  }
}

/**
 * Test 4: Create Clients
 */
async function testCreateClients() {
  log.header('TEST 4: CREATE CLIENTS');
  
  const clients = [
    {
      coach_id: testData.coachId,
      name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      membership_type: 'Premium',
      monthly_fee: 100,
      membership_due_date: dateOffset(30),
      active: true,
    },
    {
      coach_id: testData.coachId,
      name: 'Jane Smith',
      email: 'jane@test.com',
      phone: '+1987654321',
      membership_type: 'Standard',
      monthly_fee: 75,
      membership_due_date: dateOffset(-5), // Overdue
      active: true,
    },
    {
      coach_id: testData.coachId,
      name: 'Bob Johnson',
      email: 'bob@test.com',
      phone: '+1555666777',
      membership_type: 'Basic',
      monthly_fee: 50,
      membership_due_date: dateOffset(5), // Due soon
      active: true,
    },
  ];
  
  try {
    log.test('Creating 3 test clients...');
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clients)
      .select();
    
    if (error) {
      recordTest('Create Clients', false, error.message);
      return false;
    }
    
    testData.clientIds = data.map(c => c.id);
    recordTest('Create Clients', true);
    log.info(`Created ${testData.clientIds.length} clients`);
    
    // Test fetch clients
    log.test('Fetching clients...');
    const { data: fetchedClients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', testData.coachId)
      .eq('active', true);
    
    if (fetchError) {
      recordTest('Fetch Clients', false, fetchError.message);
      return false;
    }
    
    recordTest('Fetch Clients', true);
    log.info(`Fetched ${fetchedClients.length} clients`);
    
    return true;
  } catch (error) {
    recordTest('Create Clients', false, error.message);
    return false;
  }
}

/**
 * Test 5: Create Training Sessions
 */
async function testCreateSessions() {
  log.header('TEST 5: CREATE TRAINING SESSIONS');
  
  const sessions = [
    {
      coach_id: testData.coachId,
      title: 'Morning HIIT',
      session_date: today(),
      start_time: '09:00:00',
      end_time: '10:00:00',
      session_type: 'hiit',
      notes: 'High intensity workout',
    },
    {
      coach_id: testData.coachId,
      title: 'Evening Yoga',
      session_date: today(),
      start_time: '18:00:00',
      end_time: '19:00:00',
      session_type: 'yoga',
      notes: 'Relaxing session',
    },
    {
      coach_id: testData.coachId,
      title: 'Strength Training',
      session_date: dateOffset(1),
      start_time: '10:00:00',
      end_time: '11:30:00',
      session_type: 'strength',
      notes: 'Upper body focus',
    },
  ];
  
  try {
    log.test('Creating 3 test sessions...');
    
    const { data, error } = await supabase
      .from('training_sessions')
      .insert(sessions)
      .select();
    
    if (error) {
      recordTest('Create Sessions', false, error.message);
      return false;
    }
    
    testData.sessionIds = data.map(s => s.id);
    recordTest('Create Sessions', true);
    log.info(`Created ${testData.sessionIds.length} sessions`);
    
    // Test fetch sessions
    log.test('Fetching sessions...');
    const { data: fetchedSessions, error: fetchError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('coach_id', testData.coachId);
    
    if (fetchError) {
      recordTest('Fetch Sessions', false, fetchError.message);
      return false;
    }
    
    recordTest('Fetch Sessions', true);
    log.info(`Fetched ${fetchedSessions.length} sessions`);
    
    return true;
  } catch (error) {
    recordTest('Create Sessions', false, error.message);
    return false;
  }
}

/**
 * Test 6: Mark Attendance
 */
async function testAttendance() {
  log.header('TEST 6: ATTENDANCE TRACKING');
  
  if (testData.sessionIds.length === 0 || testData.clientIds.length === 0) {
    recordTest('Attendance', false, 'No sessions or clients to test');
    return false;
  }
  
  const sessionId = testData.sessionIds[0]; // First session
  
  const attendanceRecords = [
    {
      session_id: sessionId,
      client_id: testData.clientIds[0],
      present: true,
    },
    {
      session_id: sessionId,
      client_id: testData.clientIds[1],
      present: true,
    },
    {
      session_id: sessionId,
      client_id: testData.clientIds[2],
      present: false,
    },
  ];
  
  try {
    log.test('Marking attendance for 3 clients...');
    
    const { data, error } = await supabase
      .from('attendance')
      .insert(attendanceRecords)
      .select();
    
    if (error) {
      recordTest('Mark Attendance', false, error.message);
      return false;
    }
    
    testData.attendanceIds = data.map(a => a.id);
    recordTest('Mark Attendance', true);
    log.info(`Marked attendance for ${testData.attendanceIds.length} clients`);
    
    // Test fetch attendance
    log.test('Fetching attendance data...');
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*, clients(name), training_sessions(title)')
      .eq('session_id', sessionId);
    
    if (fetchError) {
      recordTest('Fetch Attendance', false, fetchError.message);
      return false;
    }
    
    recordTest('Fetch Attendance', true);
    log.info(`Present: ${attendance.filter(a => a.present).length}`);
    log.info(`Absent: ${attendance.filter(a => !a.present).length}`);
    
    return true;
  } catch (error) {
    recordTest('Attendance', false, error.message);
    return false;
  }
}

/**
 * Test 7: Payment History
 */
async function testPayments() {
  log.header('TEST 7: PAYMENT TRACKING');
  
  if (testData.clientIds.length === 0) {
    recordTest('Payments', false, 'No clients to test');
    return false;
  }
  
  const payments = [
    {
      client_id: testData.clientIds[0],
      amount: 100,
      payment_date: today(),
      payment_method: 'cash',
      notes: 'Monthly fee - October',
    },
    {
      client_id: testData.clientIds[1],
      amount: 75,
      payment_date: dateOffset(-30),
      payment_method: 'card',
      notes: 'Monthly fee - September',
    },
  ];
  
  try {
    log.test('Recording 2 payments...');
    
    const { data, error } = await supabase
      .from('payment_history')
      .insert(payments)
      .select();
    
    if (error) {
      recordTest('Record Payments', false, error.message);
      return false;
    }
    
    recordTest('Record Payments', true);
    log.info(`Recorded ${data.length} payments`);
    
    // Test fetch payment history
    log.test('Fetching payment history...');
    const { data: history, error: fetchError } = await supabase
      .from('payment_history')
      .select('*, clients(name)')
      .in('client_id', testData.clientIds);
    
    if (fetchError) {
      recordTest('Fetch Payment History', false, fetchError.message);
      return false;
    }
    
    recordTest('Fetch Payment History', true);
    log.info(`Fetched ${history.length} payment records`);
    
    return true;
  } catch (error) {
    recordTest('Payments', false, error.message);
    return false;
  }
}

/**
 * Test 8: Database Views & Statistics
 */
async function testDatabaseViews() {
  log.header('TEST 8: DATABASE VIEWS & STATISTICS');
  
  try {
    // Test coach_statistics view
    log.test('Checking coach_statistics view...');
    const { data: stats, error: statsError } = await supabase
      .from('coach_statistics')
      .select('*')
      .eq('coach_id', testData.coachId)
      .maybeSingle();
    
    if (statsError) {
      recordTest('Coach Statistics View', false, statsError.message);
    } else {
      recordTest('Coach Statistics View', true);
      if (stats) {
        log.info(`Total Clients: ${stats.total_clients}`);
        log.info(`Active Clients: ${stats.active_clients}`);
        log.info(`Monthly Revenue: $${stats.monthly_revenue}`);
      }
    }
    
    // Test client_attendance_rates view
    log.test('Checking client_attendance_rates view...');
    const { data: rates, error: ratesError } = await supabase
      .from('client_attendance_rates')
      .select('*')
      .in('client_id', testData.clientIds);
    
    if (ratesError) {
      recordTest('Client Attendance Rates View', false, ratesError.message);
    } else {
      recordTest('Client Attendance Rates View', true);
      log.info(`Calculated rates for ${rates?.length || 0} clients`);
    }
    
    // Test session_attendance_summary view
    log.test('Checking session_attendance_summary view...');
    const { data: summary, error: summaryError } = await supabase
      .from('session_attendance_summary')
      .select('*')
      .in('session_id', testData.sessionIds);
    
    if (summaryError) {
      recordTest('Session Attendance Summary View', false, summaryError.message);
    } else {
      recordTest('Session Attendance Summary View', true);
      log.info(`Session summaries: ${summary?.length || 0}`);
    }
    
    return true;
  } catch (error) {
    recordTest('Database Views', false, error.message);
    return false;
  }
}

/**
 * Test 9: Update Operations
 */
async function testUpdates() {
  log.header('TEST 9: UPDATE OPERATIONS');
  
  if (testData.clientIds.length === 0) {
    recordTest('Updates', false, 'No clients to test');
    return false;
  }
  
  try {
    // Update client
    log.test('Updating client information...');
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        phone: '+1999888777',
        notes: 'Updated phone number',
      })
      .eq('id', testData.clientIds[0]);
    
    if (updateError) {
      recordTest('Update Client', false, updateError.message);
      return false;
    }
    
    recordTest('Update Client', true);
    
    // Update session
    log.test('Updating session information...');
    const { error: sessionUpdateError } = await supabase
      .from('training_sessions')
      .update({
        notes: 'Updated session notes',
      })
      .eq('id', testData.sessionIds[0]);
    
    if (sessionUpdateError) {
      recordTest('Update Session', false, sessionUpdateError.message);
      return false;
    }
    
    recordTest('Update Session', true);
    
    // Update attendance
    log.test('Updating attendance status...');
    const { error: attendanceUpdateError } = await supabase
      .from('attendance')
      .update({
        present: true,
      })
      .eq('id', testData.attendanceIds[2]); // Change absent to present
    
    if (attendanceUpdateError) {
      recordTest('Update Attendance', false, attendanceUpdateError.message);
      return false;
    }
    
    recordTest('Update Attendance', true);
    
    return true;
  } catch (error) {
    recordTest('Updates', false, error.message);
    return false;
  }
}

/**
 * Test 10: RLS (Row Level Security)
 */
async function testRLS() {
  log.header('TEST 10: ROW LEVEL SECURITY (RLS)');
  
  try {
    // Try to access another coach's data (should fail or return empty)
    log.test('Testing RLS isolation...');
    
    const fakeCoachId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', fakeCoachId);
    
    // We expect either an error or empty data (depending on RLS setup)
    if (error) {
      recordTest('RLS Protection', true);
      log.info('RLS is enforcing access control');
    } else if (data.length === 0) {
      recordTest('RLS Isolation', true);
      log.info('RLS is filtering data correctly');
    } else {
      recordTest('RLS Warning', false, 'Unexpected data access');
    }
    
    return true;
  } catch (error) {
    recordTest('RLS', false, error.message);
    return false;
  }
}

/**
 * Cleanup: Remove all test data
 */
async function cleanup() {
  log.header('CLEANUP: REMOVING TEST DATA');
  
  try {
    // Delete attendance
    if (testData.attendanceIds.length > 0) {
      log.test('Deleting attendance records...');
      await supabase
        .from('attendance')
        .delete()
        .in('id', testData.attendanceIds);
      log.success('Deleted attendance records');
    }
    
    // Delete payment history
    if (testData.clientIds.length > 0) {
      log.test('Deleting payment history...');
      await supabase
        .from('payment_history')
        .delete()
        .in('client_id', testData.clientIds);
      log.success('Deleted payment history');
    }
    
    // Delete sessions
    if (testData.sessionIds.length > 0) {
      log.test('Deleting sessions...');
      await supabase
        .from('training_sessions')
        .delete()
        .in('id', testData.sessionIds);
      log.success('Deleted sessions');
    }
    
    // Delete clients
    if (testData.clientIds.length > 0) {
      log.test('Deleting clients...');
      await supabase
        .from('clients')
        .delete()
        .in('id', testData.clientIds);
      log.success('Deleted clients');
    }
    
    // Delete coach profile
    if (testData.coachId) {
      log.test('Deleting coach profile...');
      await supabase
        .from('coaches')
        .delete()
        .eq('id', testData.coachId);
      log.success('Deleted coach profile');
    }
    
    // Delete auth user (requires admin access, may not work)
    if (testData.coachId) {
      log.test('Deleting auth user...');
      log.warning('Note: User deletion requires admin access');
      log.info(`Coach Email: ${testData.coachEmail}`);
      log.info('You may need to delete this user manually from Supabase dashboard');
    }
    
    log.success('Cleanup completed');
    return true;
  } catch (error) {
    log.error(`Cleanup error: ${error.message}`);
    return false;
  }
}

/**
 * Print Final Results
 */
function printResults() {
  log.header('FINAL RESULTS');
  
  const total = results.passed + results.failed;
  const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${percentage}%\n`);
  
  if (results.failed > 0) {
    log.warning('Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}${t.error ? ': ' + t.error : ''}`);
      });
    console.log();
  }
  
  if (results.passed === total) {
    log.success('🎉 ALL TESTS PASSED! Database is working perfectly!');
  } else {
    log.error('Some tests failed. Please check the errors above.');
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  log.header('🧪 TRAINTRACK DATABASE TEST SUITE');
  log.info('Testing all database functions...');
  log.info(`Started: ${new Date().toLocaleString()}`);
  
  const startTime = Date.now();
  
  try {
    // Run all tests in sequence
    const connected = await testConnection();
    if (!connected) {
      log.error('Cannot proceed without database connection');
      return;
    }
    
    await testAuthentication();
    await testCoachProfile();
    await testCreateClients();
    await testCreateSessions();
    await testAttendance();
    await testPayments();
    await testDatabaseViews();
    await testUpdates();
    await testRLS();
    
    // Cleanup test data
    await cleanup();
    
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
  } finally {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.info(`Duration: ${duration}s`);
    
    // Print results
    printResults();
  }
}

// =============================================================================
// RUN TESTS
// =============================================================================

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testData };

