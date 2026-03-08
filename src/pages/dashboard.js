import React from 'react';
import { Video, Calendar, Clock, Settings, Search, Bell } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-64 bg-blue-700 text-white p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-white p-2 rounded-lg text-blue-700 font-bold text-xl">M</div>
          <h1 className="text-2xl font-bold tracking-tight">MeetUp</h1>
        </div>
        
        <div className="space-y-4 flex-1">
          <button className="flex items-center gap-3 w-full p-3 bg-blue-600 rounded-lg"><Calendar size={20}/> Upcoming</button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-blue-600 rounded-lg"><Clock size={20}/> Recent</button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-blue-600 rounded-lg"><Video size={20}/> Recordings</button>
        </div>

        <button className="flex items-center gap-3 p-3 hover:bg-blue-600 rounded-lg mt-auto"><Settings size={20}/> Settings</button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
            <input className="w-full pl-10 pr-4 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search meetings..."/>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="text-slate-500 cursor-pointer"/>
            <div className="w-10 h-10 bg-blue-100 rounded-full border border-blue-300"></div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <button className="h-32 bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            <div className="bg-blue-500 p-2 rounded-xl"><Video size={28}/></div>
            <span className="font-semibold text-lg">New Meeting</span>
          </button>
          <button className="h-32 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition">
            <div className="bg-blue-50 p-2 rounded-xl"><Calendar size={28}/></div>
            <span className="font-semibold text-lg">Join Meeting</span>
          </button>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-4">Upcoming Meetings</h2>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-slate-500 text-center py-10 italic">No meetings scheduled. Start one now!</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
