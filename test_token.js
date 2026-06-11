const jwt = require('jsonwebtoken');

const secret = 'uqjcQYkLlQFLY/PJv9aBXnaZ+V2t/Y7V+aQy4rggmWs=';

const token = jwt.sign({
  sub: '123',
  email: 'test@test.com',
  name: 'Test User',
  role: 'superadmin',
  empresas: []
}, secret);

console.log(token);
