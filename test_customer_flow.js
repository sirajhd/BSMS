const BASE_URL = 'http://localhost:5000/api';

async function testCustomerFlow() {
  console.log('--- Registering New Test Customer ---');
  const email = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Abebe Bikila',
      phone: '+251 91 199 8877',
      email,
      password: 'Password123!',
    }),
  });
  const regJson = await regRes.json();
  console.log('Registration:', regRes.status, regJson.success ? 'PASS' : 'FAIL');
  const userToken = regJson.data?.token;

  // Fetch services and barbers
  const srvRes = await fetch(`${BASE_URL}/services`);
  const services = (await srvRes.json()).data;
  const barbRes = await fetch(`${BASE_URL}/barbers`);
  const barbers = (await barbRes.json()).data;

  // Let's find barber@barbershop.com's profile
  const barbLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'barber@barbershop.com', password: 'Barber123!' }),
  });
  const barbJson = await barbLogin.json();
  const barbToken = barbJson.data.token;
  const targetBarberId = barbJson.data.profile.id;

  // Book appointment specifically with barber@barbershop.com
  console.log('--- Booking Appointment with barber@barbershop.com ---');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const bookRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      serviceId: services[0].id,
      barberId: targetBarberId,
      appointmentDate: tomorrowStr,
      startTime: '10:00',
      paymentMethod: 'PAY_AT_SHOP',
      notes: 'Testing booking flow',
    }),
  });
  const bookJson = await bookRes.json();
  console.log('Booking creation:', bookRes.status, bookJson.success ? 'PASS' : `FAIL (${JSON.stringify(bookJson)})`);
  const newApt = bookJson.data;

  // Test IDOR: original customer (customer@barbershop.com) trying to fetch Abebe's appointment
  console.log('--- IDOR Cross-Customer Access Check ---');
  const cust1Login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@barbershop.com', password: 'Customer123!' }),
  });
  const cust1Token = (await cust1Login.json()).data.token;

  const idorRes = await fetch(`${BASE_URL}/appointments/${newApt.id}`, {
    headers: { Authorization: `Bearer ${cust1Token}` },
  });
  console.log('Customer 1 accessing Customer 2 appointment:', (idorRes.status === 403) ? 'PASS (403 Forbidden - IDOR Blocked)' : `FAIL (${idorRes.status})`);

  // Assigned Barber check: barber can view the appointment
  const barbCheckRes = await fetch(`${BASE_URL}/appointments/${newApt.id}`, {
    headers: { Authorization: `Bearer ${barbToken}` },
  });
  console.log('Assigned Barber accessing appointment:', barbCheckRes.status === 200 ? 'PASS (200 OK)' : `FAIL (${barbCheckRes.status})`);

  // Status transition by Assigned Barber: CHECKED_IN
  const statusRes = await fetch(`${BASE_URL}/appointments/${newApt.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${barbToken}`,
    },
    body: JSON.stringify({ status: 'CHECKED_IN' }),
  });
  const statusJson = await statusRes.json();
  console.log('Assigned Barber status transition to CHECKED_IN:', statusRes.status === 200 && statusJson.data?.status === 'CHECKED_IN' ? 'PASS' : `FAIL (${statusRes.status})`);

  // Status transition by Assigned Barber: IN_PROGRESS
  const inProgressRes = await fetch(`${BASE_URL}/appointments/${newApt.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${barbToken}`,
    },
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  });
  const inProgressJson = await inProgressRes.json();
  console.log('Assigned Barber status transition to IN_PROGRESS:', inProgressRes.status === 200 && inProgressJson.data?.status === 'IN_PROGRESS' ? 'PASS' : `FAIL (${inProgressRes.status})`);

  // Status transition by Assigned Barber: COMPLETED
  const completedRes = await fetch(`${BASE_URL}/appointments/${newApt.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${barbToken}`,
    },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const completedJson = await completedRes.json();
  console.log('Assigned Barber status transition to COMPLETED (Auto-settles payment):', completedRes.status === 200 && completedJson.data?.status === 'COMPLETED' && completedJson.data?.paymentStatus === 'PAID' ? 'PASS' : `FAIL (${completedRes.status})`);
}

testCustomerFlow().catch(console.error);
