import { describe, expect, it } from 'vitest';
import { needsSsl } from '../src/db/client';

describe('needsSsl', () => {
  it('sin SSL en local y con la URL interna de Render', () => {
    expect(needsSsl('postgres://u:p@localhost:5433/publicidad')).toBe(false);
    expect(needsSsl('postgresql://u:p@dpg-abc123-a/publicidad')).toBe(false);
    expect(needsSsl(undefined)).toBe(false);
  });

  it('con SSL en la URL externa de Render o si lo pide sslmode', () => {
    expect(needsSsl('postgresql://u:p@dpg-abc123-a.oregon-postgres.render.com/publicidad')).toBe(
      true,
    );
    expect(needsSsl('postgres://u:p@db.example.com/x?sslmode=require')).toBe(true);
  });
});
