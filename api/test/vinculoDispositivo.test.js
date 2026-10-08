import test from 'node:test';
import assert from 'node:assert/strict';
import { dispositivoPodeEnviarParaEquipamento } from '../src/seguranca/vinculoDispositivo.js';

test('permite enviar coleta para o equipamento vinculado', () => {
    assert.equal(dispositivoPodeEnviarParaEquipamento(7, 7), true);
});

test('nega enviar coleta para outro equipamento', () => {
    assert.equal(dispositivoPodeEnviarParaEquipamento(8, 7), false);
});
