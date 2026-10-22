import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { criarCredencialDispositivo } from '../src/seguranca/credencialDispositivo.js';

test('gera token de dispositivo aleatório no formato esperado e seu hash SHA-256', () => {
    const credencial = criarCredencialDispositivo();

    assert.equal(/^[A-Za-z0-9_-]{43}$/.test(credencial.token), true);
    assert.equal(/^[a-f0-9]{64}$/.test(credencial.tokenHash), true);

    const hashCalculado = createHash('sha256')
        .update(credencial.token)
        .digest('hex');

    assert.equal(credencial.tokenHash, hashCalculado);
});
