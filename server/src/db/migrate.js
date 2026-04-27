'use strict';
require('dotenv').config();
const { migrate } = require('./sqlite');
migrate();
console.log('[MIGRATE] Concluído.');
