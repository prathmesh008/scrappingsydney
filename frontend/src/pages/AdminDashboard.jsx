import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
    RefreshCw, CheckCircle, Calendar, Search,
    Play, Filter, Download, ExternalLink, X, MapPin,
    Layers, TrendingUp, AlertTriangle, Info, Trash2
} from 'lucide-react';
import { format, isValid, isSameDay, isWithinInterval } from 'date-fns';

const getGradient = (title) => {
    const gradients = [
        "from-blue-500 to-indigo-600",
        "from-emerald-400 to-teal-500",
        "from-orange-400 to-pink-500",
        "from-violet-500 to-purple-600"
    ];
    const index = (title || "").length % gradients.length;
    return `bg-gradient-to-br ${gradients[index]}`;
};

const AdminDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scraping, setScraping] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const [statusMsg, setStatusMsg] = useState(null);

    // --- FILTERS STATE ---
    const [filterText, setFilterText] = useState('');
    const [filterCity, setFilterCity] = useState('Sydney');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- LOGIC ---
    const isEventActive = (ev) => {
        if (!ev) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const next = ev.nextOccurrence ? new Date(ev.nextOccurrence) : null;
        const end = ev.endDate ? new Date(ev.endDate) : null;

        // DEBUG ONLY HENSEL & GRETEL (case-insensitive)
        if (ev.title && ev.title.toLowerCase().includes('hansel')) {
            console.log('HENSEL DEBUG →', {
                title: ev.title,
                startDate: ev.startDate,
                endDate: ev.endDate,
                nextOccurrence: ev.nextOccurrence,
                today,
                nextValid: next ? next >= today : null,
                endValid: end ? end >= today : null
            });
        }

        // Correct recurring-event logic
        if (next) return next >= today;
        if (end) return end >= today;

        return false;
    };

    const getDisplayStatus = (ev) => {
        if (!isEventActive(ev)) return 'inactive';
        return ev.status;
    };

    const stats = useMemo(() => {
        return {
            new: events.filter(e => e.status === 'new' && isEventActive(e)).length,
            updated: events.filter(e => e.status === 'updated' && isEventActive(e)).length,
            live: events.filter(e => e.status === 'imported' && isEventActive(e)).length,
            ended: events.filter(e => !isEventActive(e)).length
        };
    }, [events]);

    // --- FILTER LOGIC ---
    const filteredEvents = events.filter(ev => {
        // 1. Keyword Search
        const text = filterText.toLowerCase();
        const matchesText =
            ev.title.toLowerCase().includes(text) ||
            (ev.venue && ev.venue.toLowerCase().includes(text)) ||
            (ev.description && ev.description.toLowerCase().includes(text));

        // 2. City Filter
        const matchesCity = filterCity === 'All' || (ev.city || 'Sydney') === filterCity;

        // 3. Date Range Filter
        let matchesDate = true;
        if (startDate || endDate) {
            const eventStart = new Date(ev.startDate);
            const start = startDate ? new Date(startDate) : new Date('2000-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-01-01');
            end.setHours(23, 59, 59, 999);
            matchesDate = isWithinInterval(eventStart, { start, end });
        }

        return matchesText && matchesCity && matchesDate;
    });

    useEffect(() => {
        if (!authLoading && !user) navigate('/');
    }, [user, authLoading, navigate]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events');
            setEvents(res.data);
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            setStatusMsg({ type: 'error', text: 'Failed to load events.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchEvents();
    }, [user]);

    const handleScrape = async () => {
        setScraping(true);
        setStatusMsg({
            type: 'info',
            text: 'Scraper started. Please wait until it finishes, then click Refresh.'
        });

        try {
            await api.post('/scrape');

            setStatusMsg({
                type: 'success',
                text: 'Scraping complete. List updated.'
            });

            await fetchEvents();

            setTimeout(() => setStatusMsg(null), 4000);
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Scrape failed.' });
        } finally {
            setScraping(false);
        }
    };

    const handleImport = async (id) => {
        const eventToImport = events.find(e => e._id === id);
        if (!eventToImport) return;
        setStatusMsg({ type: 'info', text: `Publishing "${eventToImport.title}"...` });

        try {
            setEvents(prev => prev.map(e => e._id === id ? { ...e, status: 'imported' } : e));
            if (selectedEvent?._id === id) setSelectedEvent(prev => ({ ...prev, status: 'imported' }));

            await api.patch(`/events/${id}/import`, {
                importedBy: user?.email || 'admin',
                notes: 'Imported via Dashboard'
            });
            setStatusMsg({ type: 'success', text: 'Event Published!' });
            setTimeout(() => setStatusMsg(null), 2000);
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Publish Failed.' });
            fetchEvents();
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredEvents.length) setSelectedIds([]);
        else setSelectedIds(filteredEvents.map(e => e._id));
    };

    const handleBulkImport = async () => {
        if (selectedIds.length === 0) return;
        setStatusMsg({ type: 'info', text: `Publishing ${selectedIds.length} events...` });
        try {
            setEvents(prev => prev.map(e => selectedIds.includes(e._id) ? { ...e, status: 'imported' } : e));
            await Promise.all(selectedIds.map(id => api.patch(`/events/${id}/import`, {
                importedBy: user?.email || 'admin',
                notes: 'Bulk Import'
            })));
            setStatusMsg({ type: 'success', text: `Published ${selectedIds.length} events!` });
            setSelectedIds([]);
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Bulk Publish Failed.' });
            fetchEvents();
        }
    };

    const renderDateRange = (start, end) => {
        if (!start) return 'TBA';
        const s = new Date(start);
        const e = end ? new Date(end) : s;
        if (isSameDay(s, e)) return format(s, 'EEEE, MMM d, yyyy');
        return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
    };

    const clearFilters = () => {
        setFilterText('');
        setStartDate('');
        setEndDate('');
        setFilterCity('Sydney');
    };

    if (authLoading || !user) return <div className="flex items-center justify-center h-screen text-gray-400">Loading Control Room...</div>;

    return (
        <div className="h-[92vh] w-full bg-gray-50 flex gap-4 p-4 overflow-hidden relative">

            {statusMsg && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-3 animate-bounce-in
                    ${statusMsg.type === 'error' ? 'bg-red-500 text-white' :
                        statusMsg.type === 'success' ? 'bg-emerald-500 text-white' :
                            'bg-gray-800 text-white'}`}>
                    {statusMsg.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    {statusMsg.text}
                </div>
            )}

            {/* --- LEFT: TABLE CONTAINER --- */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden h-full">

                {/* Header & Filters */}
                <div className="p-3 border-b border-gray-100 flex flex-col gap-3 bg-white z-20 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h1 className="font-bold text-gray-800 text-lg">Event Control</h1>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={fetchEvents} className="p-2 text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all" title="Refresh List">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={handleScrape} disabled={scraping} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${scraping ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                                {scraping ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                {scraping ? 'Running...' : 'Run Scraper'}
                            </button>
                        </div>
                    </div>

                    {/* FILTERS ROW */}
                    <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                            <input
                                type="text"
                                placeholder="Search title, venue..."
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm outline-none focus:border-blue-500 font-medium text-gray-700 cursor-pointer"
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                        >
                            <option value="Sydney">Sydney</option>
                            <option value="All">All Cities</option>
                        </select>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                            <span className="text-xs text-gray-400 font-bold uppercase">From</span>
                            <input type="date" className="text-xs border-none outline-none text-gray-600 w-24" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-xs text-gray-400 font-bold uppercase border-l pl-1 ml-1">To</span>
                            <input type="date" className="text-xs border-none outline-none text-gray-600 w-24" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        {(filterText || startDate || endDate) && (
                            <button onClick={clearFilters} className="p-1.5 hover:bg-red-100 text-red-500 rounded transition-colors" title="Clear Filters">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto relative bg-white scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-12 border-b border-gray-200 text-center">
                                    <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredEvents.length} className="w-4 h-4 cursor-pointer" />
                                </th>
                                <th className="py-3 px-4 w-28 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                                <th className="py-3 px-4 w-28 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Source</th>
                                <th className="py-3 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Event Details</th>
                                <th className="py-3 px-4 w-32 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400">Loading data...</td></tr>
                            ) : filteredEvents.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400">No events found matching filters.</td></tr>
                            ) : filteredEvents.map(ev => {
                                // CALCULATE STATUS PER ROW
                                const displayStatus = getDisplayStatus(ev);
                                return (
                                    <tr
                                        key={ev._id}
                                        onClick={() => setSelectedEvent(ev)}
                                        className={`group cursor-pointer transition-colors ${selectedEvent?._id === ev._id ? 'bg-blue-50/60 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                                    >
                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedIds.includes(ev._id)} onChange={() => toggleSelect(ev._id)} className="w-4 h-4 cursor-pointer" />
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                            ${displayStatus === 'imported' ? 'bg-emerald-100 text-emerald-700' :
                                                    displayStatus === 'new' ? 'bg-blue-100 text-blue-700' :
                                                        displayStatus === 'inactive' ? 'bg-gray-100 text-gray-500' :
                                                            'bg-amber-100 text-amber-700'}`}>
                                                {displayStatus}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded 
                                            ${ev.source === 'EventFinda' ? 'bg-orange-100 text-orange-700' :
                                                    ev.source === 'WhatsOn' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-blue-100 text-blue-600'}`}>
                                                {ev.source}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <div className="font-semibold text-gray-800 truncate text-sm">{ev.title}</div>
                                            <div className="text-xs text-gray-400 truncate">{ev.venue}</div>
                                        </td>
                                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                            <div className="text-xs font-medium text-gray-500">
                                                {isValid(new Date(ev.startDate)) ? format(new Date(ev.startDate), 'MMM d, yyyy') : 'TBA'}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Bulk Action Button */}
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-gray-800 backdrop-blur-sm bg-opacity-95">
                        <span className="font-medium text-sm text-gray-300"><span className="text-white font-bold">{selectedIds.length}</span> selected</span>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <button onClick={handleBulkImport} className="flex items-center gap-2 font-bold text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Download className="w-4 h-4" /> Publish Selected
                        </button>
                        <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-gray-800 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                </div>
            </div>

            {/* --- RIGHT: PREVIEW PANEL --- */}
            <div className="w-[420px] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col shrink-0 overflow-hidden h-full">
                {/* Stats */}
                <div className="grid grid-cols-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div className="p-2 text-center border-r border-gray-100"><div className="text-[9px] font-bold text-blue-500 uppercase">New</div><div className="text-lg font-black text-gray-800">{stats.new}</div></div>
                    <div className="p-2 text-center border-r border-gray-100"><div className="text-[9px] font-bold text-amber-500 uppercase">Updates</div><div className="text-lg font-black text-gray-800">{stats.updated}</div></div>
                    <div className="p-2 text-center border-r border-gray-100"><div className="text-[9px] font-bold text-emerald-500 uppercase">Live</div><div className="text-lg font-black text-gray-800">{stats.live}</div></div>
                    <div className="p-2 text-center bg-gray-100/50"><div className="text-[9px] font-bold text-gray-400 uppercase">Ended</div><div className="text-lg font-black text-gray-400">{stats.ended}</div></div>
                </div>

                {/* Preview */}
                {selectedEvent ? (
                    <>
                        <div className={`h-40 relative shrink-0 ${!selectedEvent.imageUrl ? getGradient(selectedEvent.title) : ''}`}>
                            {selectedEvent.imageUrl && <img src={selectedEvent.imageUrl} alt="" className="w-full h-full object-cover" />}
                            <div className="absolute bottom-3 left-5 right-5 text-white">
                                <h2 className="text-lg font-bold leading-tight shadow-sm line-clamp-2">{selectedEvent.title}</h2>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col overflow-y-auto bg-white">
                            <div className="grid gap-3 mb-5 pb-5 border-b border-gray-100">
                                <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-blue-500" /><div><p className="font-medium text-sm text-gray-800">{renderDateRange(selectedEvent.startDate, selectedEvent.endDate)}</p></div></div>
                                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-red-500" /><div><p className="font-medium text-sm text-gray-800">{selectedEvent.venue}</p></div></div>
                            </div>
                            <div className="mb-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Description</p><p className="text-sm text-gray-600">{selectedEvent.description}</p></div>

                            <div className="mt-auto pt-6 space-y-3">
                                {selectedEvent.status === 'imported' ? (
                                    <div className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 text-center rounded-lg font-bold text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Published Live</div>
                                ) : (
                                    <button onClick={() => handleImport(selectedEvent._id)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Approve & Publish
                                    </button>
                                )}
                                <a
                                    href={selectedEvent.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest mt-2"
                                >
                                    View Original Source <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 bg-gray-50/50 p-10 text-center">
                        <TrendingUp className="w-7 h-7 text-blue-200 mb-3" />
                        <h3 className="text-gray-900 font-bold text-base">Control Room Ready</h3>
                    </div>
                )}
            </div>

            {/* --- FOOTER SECTION --- */}
            <div className="absolute bottom-4 right-6 text-xs text-gray-400 font-medium">
                © {new Date().getFullYear()} SydEvents Admin
            </div>
        </div>
    );
};

export default AdminDashboard;