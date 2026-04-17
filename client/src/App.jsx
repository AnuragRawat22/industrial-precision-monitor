import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- 1. INITIALIZE SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Connect to your Node.js server
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5432');

function App() {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState('Detroit');
  const [latestStatus, setLatestStatus] = useState({ machine_id: 'Disconnected', status: 'OFFLINE', offset: 0 });

  // Fetch History from Supabase (Tenant Aware)
  const fetchHistory = async () => {
    const { data: logs, error } = await supabase
      .from('telemetry')
      .select('*')
      .eq('status', 'FAIL')
      .eq('factory_id', selectedFactory)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error) setHistory(logs || []);
  };

  useEffect(() => {
    fetchHistory();
    setData([]); // Clear graph when switching tenants

    socket.on('sensor-update', (newData) => {
      // MULTI-TENANT FILTER
      if (newData.factory_id !== selectedFactory) return;

      setLatestStatus({
        machine_id: newData.machine_id,
        status: newData.status,
        offset: newData.data.tolerance_offset
      });

      setData((prevData) => {
        const updatedData = [...prevData, {
          time: new Date().toLocaleTimeString().split(' ')[0],
          offset: newData.data.tolerance_offset
        }];
        return updatedData.slice(-20);
      });

      if (newData.status === 'FAIL') fetchHistory();
    });

    return () => socket.off('sensor-update');
  }, [selectedFactory]);

  return (
    <div className="p-8 bg-slate-900 text-white min-h-screen font-sans">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-white/10 pb-6 gap-4">
        <div className="flex items-center gap-6">
          <div className="text-left">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              PRECISION MONITOR
            </h1>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Multi-Tenant Engineering v5.0</p>
          </div>
          
          <div className="h-12 w-[1px] bg-white/10 hidden md:block"></div>
          
          <div className="flex flex-col items-start">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Stream</label>
            <select 
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
              className="bg-slate-800 border border-white/10 text-cyan-400 font-bold rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer hover:bg-slate-700 transition-all"
            >
              <option value="Detroit">Detroit Factory #1</option>
              <option value="Canton">Canton Factory #2</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 uppercase tracking-widest"
        >
          {showHistory ? "View Live Graph" : "View Failure History"}
        </button>
      </header>

      {!showHistory ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Active Unit</p>
              <h3 className="text-xl font-mono text-slate-200">{latestStatus.machine_id}</h3>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Live Variance</p>
              <h3 className={`text-3xl font-black ${latestStatus.offset > 0.05 ? 'text-red-400' : 'text-cyan-400'}`}>
                {latestStatus.offset.toFixed(4)} <span className="text-sm font-normal text-slate-500">mm</span>
              </h3>
            </div>
            <div className={`bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl border-l-4 ${latestStatus.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">System Status</p>
              <h3 className="text-xl font-bold text-slate-200 uppercase tracking-tighter">{latestStatus.status}</h3>
            </div>
          </div>

          {/* Graph Section */}
          <div className="bg-slate-800/40 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-sm font-bold mb-8 text-slate-400 uppercase tracking-widest text-left">Real-Time Tolerance Stream</h2>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={15} />
                  <YAxis stroke="#475569" fontSize={10} domain={[0, 0.1]} tickMargin={15} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                  <ReferenceLine y={0.05} stroke="#ef4444" strokeDasharray="8 8" label={{ value: 'MAX TOLERANCE', fill: '#ef4444', fontSize: 10, fontWeight: 'bold', position: 'insideTopRight' }} />
                  <Line
                    type="monotone"
                    dataKey="offset"
                    stroke="#22d3ee"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#22d3ee', strokeWidth: 2, stroke: '#0891b2' }}
                    activeDot={{ r: 8 }}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* History Log View */
        <div className="bg-slate-900/50 rounded-2xl border border-red-500/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-red-500/10 px-8 py-6 border-b border-red-500/20 text-left">
            <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Critical Incidents Database Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-white/5 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="py-5">Machine ID</th>
                  <th className="py-5">Variance</th>
                  <th className="pr-8 py-5 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.length > 0 ? history.map((log) => (
                  <tr key={log.id} className="bg-red-500/[0.02] hover:bg-red-500/[0.06] transition-colors">
                    <td className="px-8 py-6 text-slate-400 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-6 text-slate-300 font-bold text-sm">{log.machine_id}</td>
                    <td className="py-6 text-red-400 font-mono font-bold text-sm">{log.offset_value.toFixed(4)}mm</td>
                    <td className="pr-8 py-6 text-right">
                      <span className="px-4 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                        CRITICAL
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-slate-600 italic text-sm font-mono uppercase tracking-widest">
                      No failures found in database. System healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;