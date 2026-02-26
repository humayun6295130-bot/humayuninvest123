import React, { useState } from 'react';
import { PieChart, Wallet, TrendingUp, Plus, Trash2, ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  price: number;
}

const Dashboard = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'Bitcoin', symbol: 'BTC', amount: 0.25, price: 68000 },
    { id: '2', name: 'Ethereum', symbol: 'ETH', amount: 2.5, price: 3500 },
    { id: '3', name: 'Apple Inc.', symbol: 'AAPL', amount: 15, price: 190 },
  ]);

  const [newAsset, setNewAsset] = useState({ name: '', symbol: '', amount: '', price: '' });

  const totalValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  const addAsset = () => {
    if (!newAsset.name || !newAsset.symbol) return;
    const asset: Asset = {
      id: Date.now().toString(),
      name: newAsset.name,
      symbol: newAsset.symbol.toUpperCase(),
      amount: Number(newAsset.amount),
      price: Number(newAsset.price),
    };
    setAssets([...assets, asset]);
    setNewAsset({ name: '', symbol: '', amount: '', price: '' });
  };

  const deleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#EBEFF6]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">Portfolio Dashboard</h1>
        <p className="text-slate-600">Track and manage your investments in real-time.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-800 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-700 rounded-lg"><Wallet size={24} /></div>
            <span className="text-green-400 flex items-center text-sm font-bold bg-white/10 px-2 py-1 rounded-full">
              <ArrowUpRight size={16} /> 12.5%
            </span>
          </div>
          <div className="text-sm opacity-80 mb-1">Total Portfolio Value</div>
          <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><TrendingUp size={24} /></div>
            <span className="text-green-500 flex items-center text-sm font-bold">+$2,450.00</span>
          </div>
          <div className="text-sm text-slate-500 mb-1">Total Profit / Loss</div>
          <div className="text-3xl font-bold text-slate-900">+$4,120.00</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><PieChart size={24} /></div>
          </div>
          <div className="text-sm text-slate-500 mb-1">Total Assets</div>
          <div className="text-3xl font-bold text-slate-900">{assets.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Assets List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Briefcase size={20} className="text-blue-700" /> My Assets
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Asset</th>
                    <th className="px-6 py-4 font-semibold">Balance</th>
                    <th className="px-6 py-4 font-semibold text-right">Value</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{asset.name}</div>
                        <div className="text-xs text-slate-400">{asset.symbol}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {asset.amount} {asset.symbol}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ${(asset.amount * asset.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteAsset(asset.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Asset Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h3 className="font-bold text-lg mb-6">Add New Asset</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Asset Name</label>
                <input 
                  type="text" 
                  value={newAsset.name}
                  onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Bitcoin"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Symbol</label>
                <input 
                  type="text" 
                  value={newAsset.symbol}
                  onChange={e => setNewAsset({...newAsset, symbol: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. BTC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                  <input 
                    type="number" 
                    value={newAsset.amount}
                    onChange={e => setNewAsset({...newAsset, amount: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Price ($)</label>
                  <input 
                    type="number" 
                    value={newAsset.price}
                    onChange={e => setNewAsset({...newAsset, price: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button 
                onClick={addAsset}
                className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
              >
                <Plus size={20} /> Add to Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
