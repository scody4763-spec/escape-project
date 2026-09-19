const bcrypt = require('bcrypt');

const hash = '$2a$10$4nWSwTZflUKOYhnw4XIej.dtGTkzeOAEBvFCs89OPkK4nrB47WhUm';

const passwords = ['admin123', 'admin1234', 'admin', '123456', 'password', 'Admin1234', 'admin12345', 'manager', 'password123'];

Promise.all(passwords.map(async (pw) => {
  const match = await bcrypt.compare(pw, hash);
  if (match) console.log('MATCH:', pw);
})).then(() => {
  // Also generate new hash for admin1234
  bcrypt.hash('admin1234', 10).then(h => {
    console.log('New hash for admin1234:', h);
    console.log('Matches existing?', h === hash);
  });
});
