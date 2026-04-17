require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// --- 1. SUPABASE CONFIGURATION ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// --- 2. SOCKET.IO SETUP ---
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// --- 3. THE INGESTION ROUTE ---
app.post('/api/telemetry', async (req, res) => {
    const { machine_id, data, status, factory_id } = req.body;

    // Check for required tenant information
    if (!factory_id) {
        return res.status(400).json({ error: "Missing factory_id for multi-tenant routing" });
    }

    try {
        const { error } = await supabase
            .from('telemetry')
            .insert([{
                machine_id: machine_id,
                offset_value: data.tolerance_offset,
                status: status,
                factory_id: factory_id
            }]);

        if (error) {
            console.error('❌ Supabase Error:', error.message);
            return res.status(500).json({ error: "Database rejected entry: " + error.message });
        }

        // B. RELAY TO DASHBOARD (Include factory routing)
        io.emit('sensor-update', { ...req.body });
        res.status(200).json({ message: `Telemetry for ${factory_id} saved and relayed` });

    } catch (err) {
        console.error('❌ Server Critical Error:', err);
        res.status(500).json({ error: "Supabase connection failed or unreachable" });
    }
});

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send('IoT Backend is LIVE and Monitoring Factories 🚀');
});

// --- 4. START SERVER ---
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🚀 MULTI-TENANT SERVER ACTIVE ON PORT: ${PORT}`);
        console.log(`🏢 READY FOR FACTORY TRAFFIC`);
    });
}

module.exports = app;