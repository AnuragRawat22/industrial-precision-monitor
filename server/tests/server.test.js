const request = require('supertest');

// --- 1. MOCK SUPABASE ---
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

const app = require('../index');

describe('Multi-Tenant Telemetry API', () => {
    it('should return 200 OK for a valid multi-tenant telemetry post', async () => {
        const response = await request(app)
            .post('/api/telemetry')
            .send({
                machine_id: "TEST-01",
                factory_id: "Detroit",
                status: "PASS",
                data: {
                    tolerance_offset: 0.02
                }
            });
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message');
    });

    it('should return 400 if factory_id is missing', async () => {
        const response = await request(app)
            .post('/api/telemetry')
            .send({
                machine_id: "TEST-01",
                status: "PASS",
                data: {
                    tolerance_offset: 0.02
                }
            });
        
        expect(response.statusCode).toBe(400);
    });
});
